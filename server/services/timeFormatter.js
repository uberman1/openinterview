
/**
 * Time formatting helper for emails
 */

/**
 * Normalize legacy timezone labels to IANA format
 * @param {string} tz - Timezone string (e.g. "UTC -05:00 Eastern Time...")
 * @returns {string} Valid IANA timezone or 'UTC' fallback
 */
export function normalizeTimezone(tz) {
  if (!tz) return 'UTC';

  // Map descriptive strings to IANA timezones (Sync with frontend availability.model.js)
  const map = {
    'UTC -05:00 Eastern Time (US & Canada)': 'America/New_York',
    'UTC -05:00 Eastern Time (US &amp; Canada)': 'America/New_York',
    'UTC -06:00 Central Time (US & Canada)': 'America/Chicago',
    'UTC -06:00 Central Time (US &amp; Canada)': 'America/Chicago',
    'UTC -07:00 Mountain Time (US & Canada)': 'America/Denver',
    'UTC -07:00 Mountain Time (US &amp; Canada)': 'America/Denver',
    'UTC -08:00 Pacific Time (US & Canada)': 'America/Los_Angeles',
    'UTC -08:00 Pacific Time (US &amp; Canada)': 'America/Los_Angeles',
    'UTC +00:00 London': 'Europe/London',
    'UTC +01:00 Central European Time': 'Europe/Paris',
    'UTC +08:00 China Standard Time': 'Asia/Shanghai'
  };

  if (map[tz]) return map[tz];

  // Validate if it's already a valid IANA zone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch (e) {
    console.warn(`[tz-normalize] invalid timezone "${tz}" -> fallback UTC`);
    return 'UTC';
  }
}

/**
 * Format meeting time for email display
 * @param {Object} params
 * @param {string|Date} params.startISO - ISO string or Date object
 * @param {string} params.tz - Target timezone (e.g. 'America/New_York')
 * @param {string} [params.locale='en-US'] - Locale for formatting
 * @returns {Object} { pretty, tzLabel, utcPretty }
 */
export function formatMeetingTime({ startISO, tz, locale = 'en-US' }) {
  const date = new Date(startISO);
  
  // Validate date
  if (isNaN(date.getTime())) {
    return {
      pretty: 'Invalid Date',
      tzLabel: 'Unknown',
      utcPretty: 'Invalid Date'
    };
  }

  // Normalize and validate timezone
  const validTz = normalizeTimezone(tz);

  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: validTz
  };

  const pretty = new Intl.DateTimeFormat(locale, options).format(date);
  
  // Create UTC version for reference
  const utcOptions = { ...options, timeZone: 'UTC' };
  const utcPretty = new Intl.DateTimeFormat(locale, utcOptions).format(date);

  return {
    pretty,
    tzLabel: validTz,
    utcPretty
  };
}
