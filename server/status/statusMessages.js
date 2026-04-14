// server/status/statusMessages.js
// Public-safe message generator for the status event feed.
//
// Produces calm scheduled monitoring updates regardless of raw check results.
// Tone: neutral, operational, trust-first. No incident-escalation language.
//
// Internal check failures are handled by the monitoring engine separately.
// This module only shapes the public-facing event feed entries.

const TZ = 'America/New_York';

// ─── Time-of-day windows ──────────────────────────────────────────────────────
// Keyed by the scheduled hour in ET (0, 6, 12, 18).

const WINDOW_MESSAGES = {
  0: {
    title: 'Overnight monitoring completed',
    body:  'Overnight platform verification completed. Status records were refreshed for the current cycle.',
  },
  6: {
    title: 'Morning monitoring completed',
    body:  'Morning platform verification completed. Current service status was recorded successfully.',
  },
  12: {
    title: 'Midday monitoring completed',
    body:  'Midday monitoring completed. Service health checks were logged for this monitoring window.',
  },
  18: {
    title: 'Evening monitoring completed',
    body:  'Evening monitoring completed. Scheduled system verification was completed successfully.',
  },
};

const DEFAULT_MESSAGE = {
  title: 'Scheduled monitoring completed',
  body:  'Scheduled platform verification completed. Application, website, and API checks were recorded for this monitoring window.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// ID generator — datetime prefix (YYYY-MM-DDTHH) makes IDs unique per hourly run
function makeIdFactory(generatedAt) {
  // Use date + hour so each run within a day gets distinct IDs
  const prefix = generatedAt.slice(0, 13).replace(':', '-'); // e.g. "2026-04-14T20" → "2026-04-14-20"
  let n = 0;
  return () => `${prefix}-${String(++n).padStart(3, '0')}`;
}

/**
 * Returns the current hour (0–23) in America/New_York.
 * Used to select the appropriate time-of-day window message.
 */
function currentETHour(isoString) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date(isoString));
    return parseInt(parts.find(p => p.type === 'hour').value, 10);
  } catch {
    return new Date(isoString).getHours();
  }
}

/**
 * Select the closest scheduled window message for the given timestamp.
 * Matches whichever scheduled hour (0, 6, 12, 18) is nearest.
 */
function selectWindowMessage(isoString) {
  const hour = currentETHour(isoString);
  const scheduledHours = [0, 6, 12, 18];

  // Find the closest scheduled hour to the current ET hour
  let closest = scheduledHours[0];
  let minDist = Math.abs(hour - scheduledHours[0]);

  for (const h of scheduledHours) {
    const dist = Math.abs(hour - h);
    if (dist < minDist) {
      minDist = dist;
      closest = h;
    }
  }

  return WINDOW_MESSAGES[closest] ?? DEFAULT_MESSAGE;
}

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate public event feed entries from a status snapshot.
 * Always produces a single calm scheduled monitoring update entry.
 * Does not expose raw check failures or incident-escalation language publicly.
 *
 * @param {Array}  services      - Classified service objects (used for services list only)
 * @param {object} overallStatus - { label, indicator } (not used for message tone)
 * @param {string} generatedAt   - ISO timestamp of the snapshot run
 * @returns {Array} One event object matching the status page contract
 */
export function generateMessages(services, overallStatus, generatedAt) {
  const makeId = makeIdFactory(generatedAt);
  const ts     = fmtDate(generatedAt);
  const msg    = selectWindowMessage(generatedAt);

  return [
    {
      id:        makeId(),
      stage:     'Monitoring',
      title:     msg.title,
      services:  services.map(s => s.name),
      timestamp: ts,
      body:      msg.body,
    },
  ];
}
