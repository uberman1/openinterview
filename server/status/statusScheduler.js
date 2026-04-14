// server/status/statusScheduler.js
// Isolated scheduler for the OpenInterview status monitoring engine.
//
// Responsibilities:
//   - run generateStatusSnapshot() on a fixed recurring interval
//   - schedule a single delayed run shortly after server boot
//   - guard against overlapping runs with a simple in-process lock
//   - recover from individual run failures without stopping the scheduler
//
// Does NOT write to DB directly — reuses the engine which handles persistence.
// Does NOT couple to any core application system.

import { generateStatusSnapshot } from './generateStatusSnapshot.js';

// ─── Tuning constants ─────────────────────────────────────────────────────────

const INITIAL_DELAY_MS = 15_000;               // 15 s after boot — lets server stabilize
const RUN_INTERVAL_MS  = 2 * 60 * 60 * 1000;  // 2 hours

// ─── State ────────────────────────────────────────────────────────────────────

let isRunning      = false;   // in-process lock — prevents overlapping runs
let initialTimer   = null;    // handle for the one-shot startup run
let intervalHandle = null;    // handle for the recurring interval

// ─── Core run ─────────────────────────────────────────────────────────────────

async function runStatusCycle() {
  if (isRunning) {
    console.log('[status] Scheduled run skipped — previous run still active');
    return;
  }

  isRunning = true;
  console.log('[status] Scheduled run started');

  try {
    const snapshot = await generateStatusSnapshot();
    const { overallStatus, metrics, events } = snapshot;

    console.log(
      `[status] Scheduled run completed — ${overallStatus.label}, ` +
      `failedChecks=${metrics.failedChecks}, events=${events.length}`
    );
  } catch (err) {
    // Log and release the lock — never let a single failure stop the scheduler
    console.error('[status] Scheduled run failed:', err?.message ?? String(err));
  } finally {
    isRunning = false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the status scheduler.
 * Safe to call once at server boot. Subsequent calls are no-ops if already running.
 *
 * Controlled by env flag STATUS_SCHEDULER_ENABLED (default: enabled).
 * Set STATUS_SCHEDULER_ENABLED=false to disable in tests or special environments.
 */
export function startStatusScheduler() {
  // Optional kill-switch for test environments
  if (/^false$/i.test(process.env.STATUS_SCHEDULER_ENABLED ?? '')) {
    console.log('[status] Scheduler disabled via STATUS_SCHEDULER_ENABLED=false');
    return;
  }

  // Idempotency guard — don't register duplicate intervals
  if (intervalHandle !== null) {
    console.log('[status] Scheduler already running — start call ignored');
    return;
  }

  const intervalMin = Math.round(RUN_INTERVAL_MS / 60_000);
  console.log(`[status] Scheduler started — interval ${intervalMin}min`);
  console.log(`[status] Initial status run scheduled in ${INITIAL_DELAY_MS / 1000}s`);

  // One-shot delayed run — gives the server time to fully initialize
  initialTimer = setTimeout(runStatusCycle, INITIAL_DELAY_MS);

  // Recurring interval — every 2 hours
  intervalHandle = setInterval(runStatusCycle, RUN_INTERVAL_MS);
}

/**
 * Stop the scheduler cleanly.
 * Primarily useful in tests or graceful shutdown sequences.
 */
export function stopStatusScheduler() {
  if (initialTimer !== null) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  isRunning = false;
  console.log('[status] Scheduler stopped');
}
