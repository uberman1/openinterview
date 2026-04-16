
import { formatMeetingTime, normalizeTimezone } from './server/services/timeFormatter.js';

const startISO = '2026-01-08T15:30:00.000Z';
const legacyTz = 'UTC -05:00 Eastern Time (US & Canada)';
const recruiterTz = 'Asia/Karachi';

console.log('--- Verification: Timezone Normalization ---');
console.log(`Start Time (ISO): ${startISO}`);
console.log(`Profile Legacy TZ: "${legacyTz}"`);
console.log(`Recruiter TZ:      "${recruiterTz}"`);
console.log('------------------------------------------');

// 1. Verify Normalization
const normalized = normalizeTimezone(legacyTz);
console.log(`Normalized TZ:     "${normalized}" (Expected: America/New_York)`);

// 2. Simulate "Before" (Direct usage of legacy string)
console.log('\n[Before Fix] Using legacy string directly:');
try {
    const d = new Date(startISO);
    new Intl.DateTimeFormat('en-US', { timeZone: legacyTz }).format(d);
} catch (e) {
    console.log(`Result: Error thrown (${e.message}) -> Would fallback to UTC in old logic`);
}

// 3. Verify "After" (Using formatMeetingTime with normalization)
console.log('\n[After Fix] Using formatMeetingTime:');
const profileResult = formatMeetingTime({ startISO, tz: legacyTz });
console.log(`Profile Display:   "${profileResult.pretty}" (Expected: 10:30 AM EST)`);
console.log(`Profile TZ Label:  "${profileResult.tzLabel}"`);

const recruiterResult = formatMeetingTime({ startISO, tz: recruiterTz });
console.log(`Recruiter Display: "${recruiterResult.pretty}" (Expected: 8:30 PM PKT)`);

const utcResult = formatMeetingTime({ startISO, tz: 'UTC' });
console.log(`UTC Display:       "${utcResult.pretty}" (Expected: 3:30 PM UTC)`);
