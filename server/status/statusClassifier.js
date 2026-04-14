// server/status/statusClassifier.js
// Deterministic rules that map raw check results into service health states
// and an overall system status label. No external dependencies.

import { THRESHOLDS } from './statusChecks.js';

// ─── Service classification ───────────────────────────────────────────────────

/**
 * Classify a single service from its array of check results.
 *
 * Check objects carry an optional `required` boolean (default: true).
 * Optional checks can fail without causing an outage classification.
 *
 * @param {string} name  - Display name of the service
 * @param {Array}  checks - Raw check results from statusChecks.js
 * @returns {object} Classified service object ready for the snapshot contract
 */
export function classifyService(name, checks) {
  const required = checks.filter((c) => c.required !== false);
  const optional = checks.filter((c) => c.required === false);

  const requiredFailed  = required.filter((c) => !c.success);
  const optionalFailed  = optional.filter((c) => !c.success);
  const slowChecks      = checks.filter((c) => c.success && c.ms >= THRESHOLDS.WARN_MS);

  let status;
  if (requiredFailed.length > 1) {
    // Multiple required checks failed
    status = 'outage';
  } else if (requiredFailed.length === 1) {
    // One required check failed — partial if there are multiple required checks, outage if it's the only one
    status = required.length === 1 ? 'outage' : 'partial_outage';
  } else if (slowChecks.length > 0 || optionalFailed.length > 0) {
    status = 'degraded';
  } else {
    status = 'operational';
  }

  // Average response time across successful checks only
  const successful = checks.filter((c) => c.success);
  const responseTimeMs = successful.length
    ? Math.round(successful.reduce((sum, c) => sum + c.ms, 0) / successful.length)
    : null;

  // uptimePercent is a placeholder until persistence is in place.
  // Derived from current-run status; will be replaced by rolling history in Prompt #3.
  const UPTIME_ESTIMATE = {
    operational:   100.0,
    degraded:       99.5,
    partial_outage: 97.0,
    outage:         85.0,
  };
  const uptimePercent = UPTIME_ESTIMATE[status] ?? 99.0;

  return {
    name,
    status,
    responseTimeMs,
    uptimePercent,
    checks,
  };
}

// ─── Overall status classification ────────────────────────────────────────────

/**
 * Derive the system-wide status from classified service states.
 *
 * Priority order (highest severity wins):
 *   outage → major
 *   partial_outage → partial
 *   degraded → minor degradation
 *   all operational → all clear
 */
export function classifyOverall(services) {
  const statuses = services.map((s) => s.status);

  if (statuses.includes('outage')) {
    return { label: 'Major System Outage', indicator: 'outage' };
  }
  if (statuses.includes('partial_outage')) {
    return { label: 'Partial System Outage', indicator: 'partial_outage' };
  }
  if (statuses.includes('degraded')) {
    return { label: 'Minor Service Degradation', indicator: 'degraded' };
  }
  return { label: 'All Systems Operational', indicator: 'operational' };
}
