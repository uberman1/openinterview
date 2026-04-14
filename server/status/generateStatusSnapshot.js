// server/status/generateStatusSnapshot.js
// Orchestrator — runs all checks, classifies services, generates messages,
// persists the snapshot (non-blocking), and returns the complete snapshot object.
//
// Output contract:
// {
//   generatedAt:   string (ISO 8601),
//   overallStatus: { label: string, indicator: string },
//   services: [
//     {
//       name:           string,
//       status:         'operational' | 'degraded' | 'partial_outage' | 'outage',
//       responseTimeMs: number | null,
//       uptimePercent:  number,          // real value from DB history; 100.0 if no history yet
//       barDay:         { date: string, status: string },
//       checks:         [{ name, success, ms, statusCode?, error?, url? }]
//     }
//   ],
//   events:  [ { id, stage, title, services, timestamp, body } ],
//   metrics: { totalChecks, passedChecks, failedChecks, degradedChecks }
// }

import { checkApp, checkWebsite, checkApi, checkDatabase }  from './statusChecks.js';
import { classifyService, classifyOverall }                  from './statusClassifier.js';
import { generateMessages }                                  from './statusMessages.js';
import { persistSnapshot, computeUptime }                   from './statusPersistence.js';

/**
 * Run a full status generation cycle and return the snapshot object.
 * Persistence is fire-and-forget — a DB failure never blocks the response.
 *
 * @returns {Promise<object>} Snapshot matching the output contract above
 */
export async function generateStatusSnapshot() {
  const generatedAt = new Date().toISOString();

  // ── 1. Run all probes concurrently ─────────────────────────────────────────
  const [appCheck, websiteCheck, apiCheck, dbCheck] = await Promise.all([
    checkApp(),
    checkWebsite(),
    checkApi(),
    checkDatabase(),
  ]);

  // ── 2. Roll up checks into logical services ────────────────────────────────
  //
  // Service → required checks mapping:
  //   App     → app_availability (required)
  //   Website → website_load     (required)
  //   API     → api_health       (required) + db_connectivity (required)
  //
  const rawServices = [
    classifyService('App',     [{ ...appCheck,     required: true }]),
    classifyService('Website', [{ ...websiteCheck, required: true }]),
    classifyService('API',     [{ ...apiCheck,     required: true },
                                { ...dbCheck,      required: true }]),
  ];

  // ── 3. Derive overall system status ────────────────────────────────────────
  const overallStatus = classifyOverall(rawServices);

  // ── 4. Generate event/feed messages ────────────────────────────────────────
  const events = generateMessages(rawServices, overallStatus, generatedAt);

  // ── 5. Enrich with real uptime % from DB history ──────────────────────────
  //   computeUptime() returns 100.0 when no history exists yet (first run).
  //   Runs in parallel across all three services.
  const today = generatedAt.slice(0, 10); // YYYY-MM-DD

  const uptimes = await Promise.allSettled(
    rawServices.map((svc) => computeUptime(svc.name, 45))
  );

  const services = rawServices.map((svc, i) => ({
    ...svc,
    uptimePercent: uptimes[i].status === 'fulfilled' ? uptimes[i].value : svc.uptimePercent,
    barDay: { date: today, status: svc.status },
  }));

  // ── 6. Build final snapshot ────────────────────────────────────────────────
  const allChecks = [appCheck, websiteCheck, apiCheck, dbCheck];
  const failedChecks   = allChecks.filter((c) => !c.success).length;
  const degradedChecks = allChecks.filter((c) => c.success && c.ms >= 700).length;

  const snapshot = {
    generatedAt,
    overallStatus,
    services,
    events,
    metrics: {
      totalChecks:    allChecks.length,
      passedChecks:   allChecks.length - failedChecks,
      failedChecks,
      degradedChecks,
    },
  };

  // ── 7. Persist — non-blocking, non-critical ────────────────────────────────
  //   A DB failure here must never prevent the snapshot from being returned.
  persistSnapshot(snapshot).catch((err) => {
    console.error('[status] Persistence failed (non-critical):', err?.message ?? err);
  });

  return snapshot;
}
