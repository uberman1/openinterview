// server/status/statusScheduler.js
// Isolated scheduler for the OpenInterview status monitoring engine.
//
// Responsibilities:
//   - run generateStatusSnapshot() 4 times per day at wall-clock boundaries
//   - schedule a single delayed run shortly after server boot
//   - guard against overlapping runs with a simple in-process lock
//   - recover from individual run failures without stopping the scheduler
//
// Schedule: 12:00 AM · 6:00 AM · 12:00 PM · 6:00 PM (America/New_York)
// Implemented as chained setTimeout calls to stay aligned to clock time.
//
// Does NOT write to DB directly — reuses the engine which handles persistence.
// Does NOT couple to any core application system.

import { generateStatusSnapshot } from './generateStatusSnapshot.js';

// ─── Tuning constants ─────────────────────────────────────────────────────────

const INITIAL_DELAY_MS     = 15_000;          // 15 s after boot — lets server stabilize
const SCHEDULED_HOURS_ET   = [0, 6, 12, 18]; // 4 daily windows in America/New_York
const TZ                   = 'America/New_York';

// ─── State ────────────────────────────────────────────────────────────────────

let isRunning      = false;  // in-process lock — prevents overlapping runs
let initialTimer   = null;   // handle for the one-shot startup run
let intervalHandle = null;   // handle for the next scheduled setTimeout

// ─── Time-alignment helper ────────────────────────────────────────────────────

/**
 * Returns milliseconds from now until the next scheduled run in America/New_York.
 * Scheduled hours: 0, 6, 12, 18 (midnight, 6 AM, noon, 6 PM ET).
 */
function msUntilNextScheduledRun() {
  const now = new Date();

  // Decompose current moment in ET using Intl (DST-aware, no library needed)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const etHour   = parseInt(parts.find(p => p.type === 'hour').value,   10);
  const etMinute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const etSecond = parseInt(parts.find(p => p.type === 'second').value, 10);

  const msSinceMidnightET = (etHour * 3600 + etMinute * 60 + etSecond) * 1000;

  // Find the next scheduled hour that is strictly in the future
  for (const hour of SCHEDULED_HOURS_ET) {
    const targetMs = hour * 3_600_000;
    if (targetMs > msSinceMidnightET) {
      return targetMs - msSinceMidnightET;
    }
  }

  // All today's windows have passed — next window is midnight ET tomorrow
  return 24 * 3_600_000 - msSinceMidnightET;
}

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

// ─── Time-aligned scheduler ───────────────────────────────────────────────────

/**
 * Schedule the next run by computing the exact delay to the next ET window.
 * After each run completes, automatically re-schedules the following window.
 */
function scheduleNextRun() {
  const delayMs   = msUntilNextScheduledRun();
  const nextRunAt = new Date(Date.now() + delayMs);

  console.log(
    `[status] Next scheduled run at ${nextRunAt.toLocaleString('en-US', { timeZone: TZ, timeZoneName: 'short' })} ` +
    `(in ${Math.round(delayMs / 60_000)}min)`
  );

  intervalHandle = setTimeout(async () => {
    await runStatusCycle();
    scheduleNextRun(); // chain the next window
  }, delayMs);
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

  // Idempotency guard — don't register duplicate timers
  if (intervalHandle !== null) {
    console.log('[status] Scheduler already running — start call ignored');
    return;
  }

  console.log(`[status] Scheduler started — 4×/day at ${SCHEDULED_HOURS_ET.map(h => `${String(h).padStart(2,'0')}:00`).join(', ')} ET`);
  console.log(`[status] Initial status run scheduled in ${INITIAL_DELAY_MS / 1000}s`);

  // One-shot delayed run — gives the server time to fully initialize
  initialTimer = setTimeout(() => {
    runStatusCycle().then(() => scheduleNextRun());
  }, INITIAL_DELAY_MS);
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
    clearTimeout(intervalHandle);
    intervalHandle = null;
  }
  isRunning = false;
  console.log('[status] Scheduler stopped');
}
