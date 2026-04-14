// server/status/statusMessages.js
// Deterministic message generator for the status event feed.
// Output varies with actual service state and metrics — not with randomness.
// Tone: action-first, operational, credible. No emoji, no "routine", no "automated".

function fmtMs(ms) {
  return ms != null ? `${ms}ms` : 'no response';
}

function fmtDate(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Simple ID generator — date prefix + index makes IDs deterministic per run
function makeIdFactory(generatedAt) {
  const prefix = generatedAt.slice(0, 10);
  let n = 0;
  return () => `${prefix}-${String(++n).padStart(3, '0')}`;
}

// ─── Per-service message templates ───────────────────────────────────────────

function healthyServiceLine(svc) {
  const check = svc.checks.find((c) => c.success);
  if (!check) return `${svc.name} status confirmed.`;
  const label = check.name === 'app_availability' ? 'application'
              : check.name === 'website_load'     ? 'website'
              : check.name === 'api_health'        ? 'API endpoint'
              : check.name;
  return `${svc.name} ${label} responded in ${fmtMs(check.ms)}`;
}

function degradedServiceBody(svc) {
  const slow = svc.checks.find((c) => c.success && c.ms >= 700);
  if (!slow) return `${svc.name} reported elevated response times during the verification window.`;
  const label = slow.name.replace(/_/g, ' ');
  return `${svc.name} ${label} returned in ${fmtMs(slow.ms)}. Response duration exceeded the warning threshold during the latest verification window.`;
}

function outageServiceBody(svc) {
  const failed = svc.checks.filter((c) => !c.success);
  const checkNames = failed.map((c) => c.name.replace(/_/g, ' ')).join(', ');
  return `The latest verification did not receive a valid ${svc.name} response. ${checkNames} returned no success. Investigation state generated.`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate one or more event feed items from a status snapshot.
 *
 * @param {Array}  services      - Classified service objects from statusClassifier.js
 * @param {object} overallStatus - { label, indicator } from classifyOverall()
 * @param {string} generatedAt   - ISO timestamp of the snapshot run
 * @returns {Array} Event objects matching the status page contract
 */
export function generateMessages(services, overallStatus, generatedAt) {
  const makeId = makeIdFactory(generatedAt);
  const ts = fmtDate(generatedAt);
  const messages = [];

  const outageServices   = services.filter((s) => s.status === 'outage' || s.status === 'partial_outage');
  const degradedServices = services.filter((s) => s.status === 'degraded');
  const healthyServices  = services.filter((s) => s.status === 'operational');

  if (overallStatus.indicator === 'operational') {
    // All healthy — single Resolved message with per-service metrics
    const metricLines = services.map(healthyServiceLine).join('. ');
    messages.push({
      id: makeId(),
      stage: 'Resolved',
      title: 'Service verification completed',
      services: services.map((s) => s.name),
      timestamp: ts,
      body: `Availability checks completed successfully across all monitored services. ${metricLines}.`,
    });
    return messages;
  }

  // Outage entries — one per affected service
  for (const svc of outageServices) {
    messages.push({
      id: makeId(),
      stage: 'Investigating',
      title: `${svc.name} response interruption detected`,
      services: [svc.name],
      timestamp: ts,
      body: outageServiceBody(svc),
    });
  }

  // Degraded entries — one per affected service
  for (const svc of degradedServices) {
    messages.push({
      id: makeId(),
      stage: 'Monitoring',
      title: `Elevated response time detected — ${svc.name}`,
      services: [svc.name],
      timestamp: ts,
      body: degradedServiceBody(svc),
    });
  }

  // Confirm healthy services when some are not
  if (healthyServices.length > 0) {
    const names = healthyServices.map((s) => s.name).join(' and ');
    const lines = healthyServices.map(healthyServiceLine).join('. ');
    messages.push({
      id: makeId(),
      stage: 'Monitoring',
      title: 'Partial service confirmation',
      services: healthyServices.map((s) => s.name),
      timestamp: ts,
      body: `${names} verified operational. ${lines}. Monitoring continues for affected services.`,
    });
  }

  return messages;
}
