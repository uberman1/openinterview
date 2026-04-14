-- status-tables.sql
-- OpenInterview status feature — isolated persistence layer.
-- All tables are prefixed with status_ and do NOT touch any existing tables.
-- Applied automatically by server/status/statusPersistence.js on first use.
-- Safe to run multiple times (all statements are idempotent).

-- ─── 1. status_snapshots ─────────────────────────────────────────────────────
-- Stores each full run of the status generation engine.
-- payload (jsonb) preserves the complete snapshot for reconstruction.

CREATE TABLE IF NOT EXISTS status_snapshots (
  id             UUID        PRIMARY KEY,
  generated_at   TIMESTAMPTZ NOT NULL,
  overall_status TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_snapshots_generated_at
  ON status_snapshots (generated_at DESC);

-- ─── 2. status_services ──────────────────────────────────────────────────────
-- Normalized per-service result for each snapshot run.
-- Enables fast aggregation without parsing the payload blob.

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

-- ─── 3. status_events ────────────────────────────────────────────────────────
-- Generated status messages / event feed items per snapshot run.

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

CREATE INDEX IF NOT EXISTS idx_status_events_snapshot
  ON status_events (snapshot_id);

CREATE INDEX IF NOT EXISTS idx_status_events_timestamp
  ON status_events (event_timestamp DESC);

-- ─── 4. status_daily_bars ────────────────────────────────────────────────────
-- One row per (service_name, date). Aggregated across multiple runs per day.
-- Drives the 45-day bar visualization and uptime % calculation.
-- UNIQUE constraint on (service_name, date) enables safe upsert aggregation.

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
