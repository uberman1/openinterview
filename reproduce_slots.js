
import { generateSlots } from './public/js/slotgen.js';

// User-provided availability JSON
const availability = {
  timezone: 'UTC', // Assuming UTC for analysis unless specified
  rules: {
    dailyCap: 13,
    windowDays: 60,
    minNoticeHours: 12,
    durationMinutes: 60,
    bufferAfterMinutes: 15,
    bufferBeforeMinutes: 15
  },
  weekly: {
    fri: { blocks: [], enabled: false },
    mon: { blocks: [], enabled: false },
    sat: { blocks: [], enabled: false },
    sun: { blocks: [], enabled: false },
    thu: { blocks: [], enabled: false },
    tue: { blocks: [], enabled: false },
    wed: { blocks: [{ end: '17:00', start: '09:00' }], enabled: true }
  }
};

// Simulation Date: Wednesday, Dec 31, 2025
// Note: We need to set 'today' such that Dec 31, 2025 is within windowDays (60 days).
// Setting 'today' to Dec 1, 2025 works.
const today = new Date('2025-12-01T00:00:00Z');

// Target Date for Analysis
const targetDateKey = '2025-12-31';

console.log('--- Slot Generation Analysis ---');
console.log(`Target Date: ${targetDateKey} (Wednesday)`);
console.log('Availability Rules:', JSON.stringify(availability.rules, null, 2));

// Run Slot Generation (Default Mode: Stride = Duration)
// Note: The user didn't specify the stride flag, so we assume default (OFF) or they might want to know about the new behavior.
// Let's test BOTH to be thorough, but primarily the default behavior as they asked "according to the implementation".
// Wait, the user previously asked to ADD the feature flag. So the "implementation" now SUPPORTS the flag.
// However, the user said "do not modify any code", implying they are asking about the CURRENT state.
// The default state of the flag is OFF (false) in public_profile.html.
// But the user might be testing the NEW behavior.
// Let's check the default behavior first (Flag OFF).

const optsDefault = { today: today, strideWithBuffers: false };
const slotsDefault = generateSlots(availability, [], optsDefault).get(targetDateKey);

console.log(`\n[Scenario 1: Default Behavior (Stride = Duration = 60m)]`);
if (slotsDefault) {
  console.log(`Generated ${slotsDefault.length} slots:`);
  slotsDefault.forEach(s => console.log(` - ${s.startISO.split('T')[1].slice(0, 5)} to ${s.endISO.split('T')[1].slice(0, 5)}`));
} else {
  console.log('No slots generated.');
}

// Scenario 2: With Buffers (Stride = Duration + Buffers = 90m)
// Just in case the user has enabled the flag they just asked for.
const optsWithBuffers = { today: today, strideWithBuffers: true };
const slotsWithBuffers = generateSlots(availability, [], optsWithBuffers).get(targetDateKey);

console.log(`\n[Scenario 2: Optional Behavior (Stride = Duration + Buffers = 90m)]`);
if (slotsWithBuffers) {
  console.log(`Generated ${slotsWithBuffers.length} slots:`);
  slotsWithBuffers.forEach(s => console.log(` - ${s.startISO.split('T')[1].slice(0, 5)} to ${s.endISO.split('T')[1].slice(0, 5)}`));
} else {
  console.log('No slots generated.');
}
