// server/status/statusPersistence.js
// Isolated persistence layer for the OpenInterview status feature.
//
// Responsibilities:
//   - auto-create status_* tables on first use (idempotent)
//   - write snapshot, services, events, and daily bars to DB
//   - expose computeUptime() for real uptime % from historical data
//
// Uses the shared pg pool — does NOT create a new connection.
// Does NOT modify any existing tables or application logic.

import { randomUUID } from 'node:crypto';

// ─── Schema SQL ───────────────────────────────────────────────────────────────
// Applied once on first use. Fully idempotent (CREATE TABLE IF NOT EXISTS).

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS status_snapshots (
  id             UUID        PRIMARY KEY,
  generated_at   TIMESTAMPTZ NOT NULL,
  overall_status TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_snapshots_generated_at
  ON status_snapshots (generated_at DESC);

CREATE TABLE IF NOT EXISTS status_services (
  id               UUID        PRIMARY KEY,
  snapshot_id      UUID        NOT NULL REFERENCES status_snapshots(id) ON DELETE CASCADE,
  service_name     TEXT        NOT NULL,
  status           TEXT        NOT NULL,
  response_time_ms INTEGER,
  uptime_percent   FLOAT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_services_snapshot
  ON status_services (snapshot_id);

CREATE TABLE IF NOT EXISTS status_events (
  id              TEXT        PRIMARY KEY,
  snapshot_id     UUID        NOT NULL REFERENCES status_snapshots(id) ON DELETE CASCADE,
  stage           TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  services        TEXT[]      NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_events_snapshot  ON status_events (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_status_events_timestamp ON status_events (event_timestamp DESC);

CREATE TABLE IF NOT EXISTS status_daily_bars (
  id                   UUID    PRIMARY KEY,
  service_name         TEXT    NOT NULL,
  date                 DATE    NOT NULL,
  status               TEXT    NOT NULL,
  avg_response_time_ms INTEGER,
  error_count          INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_status_daily_bars_service_date UNIQUE (service_name, date)
);
CREATE INDEX IF NOT EXISTS idx_status_daily_bars_lookup
  ON status_daily_bars (service_name, date DESC);
`;

// Severity ordering used by the worst-status upsert logic in SQL
// operational < degraded < partial_outage < outage
const STATUS_SEVERITY = {
  operational:   0,
  degraded:      1,
  partial_outage: 2,
  outage:        3,
};

// ─── Table bootstrap ──────────────────────────────────────────────────────────

let schemaReady = false;

async function ensureSchema(client) {
  if (schemaReady) return;
  await client.query(SCHEMA_SQL);
  schemaReady = true;
  console.log('[status] Status tables verified / created.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPool() {
  // Lazy import avoids initialization-order issues; pool is set by initDatabase()
  return import('../db/pg-client.js').then(({ pool }) => {
    if (!pool) throw new Error('DB pool not yet initialized');
    return pool;
  });
}

// ─── Persistence writer ───────────────────────────────────────────────────────

/**
 * Persist a full status snapshot to all four status_* tables.
 * Runs inside a single transaction — all-or-nothing per snapshot run.
 *
 * @param {object} snapshot - Output from generateStatusSnapshot()
 */
export async function persistSnapshot(snapshot) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure tables exist (no-op after first call)
    await ensureSchema(client);

    // ── 1. Insert into status_snapshots ──────────────────────────────────────
    const snapshotId = randomUUID();

    await client.query(
      `INSERT INTO status_snapshots (id, generated_at, overall_status, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        snapshotId,
        snapshot.generatedAt,
        snapshot.overallStatus.indicator,
        JSON.stringify(snapshot),
      ]
    );

    // ── 2. Insert into status_services (one row per service) ─────────────────
    for (const svc of snapshot.services) {
      await client.query(
        `INSERT INTO status_services
           (id, snapshot_id, service_name, status, response_time_ms, uptime_percent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          snapshotId,
          svc.name,
          svc.status,
          svc.responseTimeMs ?? null,
          svc.uptimePercent ?? null,
        ]
      );
    }

    // ── 3. Insert into status_events ─────────────────────────────────────────
    for (const evt of snapshot.events) {
      await client.query(
        `INSERT INTO status_events
           (id, snapshot_id, stage, title, body, services, event_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          evt.id,
          snapshotId,
          evt.stage,
          evt.title,
          evt.body,
          evt.services,           // pg driver serializes string[] natively
          snapshot.generatedAt,   // raw ISO — not the display-formatted string
        ]
      );
    }

    // ── 4. Upsert into status_daily_bars ─────────────────────────────────────
    // Rule: if (service_name, date) already exists, keep worst status,
    //       average the response time, and accumulate error_count.
    const today = snapshot.generatedAt.slice(0, 10); // YYYY-MM-DD

    for (const svc of snapshot.services) {
      const failedChecks = svc.checks.filter((c) => !c.success).length;

      await client.query(
        `INSERT INTO status_daily_bars
           (id, service_name, date, status, avg_response_time_ms, error_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT uq_status_daily_bars_service_date DO UPDATE SET
           status = CASE
             WHEN status_daily_bars.status = 'outage'         THEN 'outage'
             WHEN EXCLUDED.status            = 'outage'        THEN 'outage'
             WHEN status_daily_bars.status = 'partial_outage' THEN 'partial_outage'
             WHEN EXCLUDED.status            = 'partial_outage' THEN 'partial_outage'
             WHEN status_daily_bars.status = 'degraded'       THEN 'degraded'
             WHEN EXCLUDED.status            = 'degraded'      THEN 'degraded'
             ELSE 'operational'
           END,
           avg_response_time_ms = CASE
             WHEN status_daily_bars.avg_response_time_ms IS NULL THEN EXCLUDED.avg_response_time_ms
             WHEN EXCLUDED.avg_response_time_ms          IS NULL THEN status_daily_bars.avg_response_time_ms
             ELSE (status_daily_bars.avg_response_time_ms + EXCLUDED.avg_response_time_ms) / 2
           END,
           error_count = status_daily_bars.error_count + EXCLUDED.error_count`,
        [
          randomUUID(),
          svc.name,
          today,
          svc.status,
          svc.responseTimeMs ?? null,
          failedChecks,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`[status] Snapshot persisted. id=${snapshotId} overall=${snapshot.overallStatus.indicator}`);
    return snapshotId;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Uptime calculation ───────────────────────────────────────────────────────

/**
 * Compute rolling uptime percentage for a service over the last N days.
 * Draws from status_daily_bars — requires at least one persisted run.
 *
 * Definition:
 *   operational + degraded = uptime days
 *   partial_outage + outage = downtime days
 *
 * @param {string} serviceName - 'App' | 'Website' | 'API'
 * @param {number} days        - look-back window (default 45)
 * @returns {Promise<number>}  - percentage rounded to 2 decimal places, or 100.0 if no data yet
 */
export async function computeUptime(serviceName, days = 45) {
  const pool = await getPool();

  const { rows } = await pool.query(
    `SELECT status
     FROM status_daily_bars
     WHERE service_name = $1
       AND date >= CURRENT_DATE - MAKE_INTERVAL(days => $2::int)
     ORDER BY date DESC`,
    [serviceName, days]
  );

  if (rows.length === 0) return 100.0; // No history yet — optimistic default

  const uptimeDays = rows.filter((r) => r.status === 'operational' || r.status === 'degraded').length;
  return Math.round((uptimeDays / rows.length) * 10000) / 100;
}

// ─── History reader ───────────────────────────────────────────────────────────

/**
 * Fetch the last N days of bar data for a service.
 * Used by the history debug route.
 *
 * @param {string} serviceName
 * @param {number} days
 * @returns {Promise<Array>}
 */
export async function getDailyBars(serviceName, days = 45) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT date, status, avg_response_time_ms, error_count
     FROM status_daily_bars
     WHERE service_name = $1
       AND date >= CURRENT_DATE - MAKE_INTERVAL(days => $2::int)
     ORDER BY date ASC`,
    [serviceName, days]
  );
  return rows;
}

/**
 * Fetch recent events from status_events.
 *
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRecentEvents(limit = 20) {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT id, stage, title, body, services, event_timestamp
     FROM status_events
     ORDER BY event_timestamp DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
