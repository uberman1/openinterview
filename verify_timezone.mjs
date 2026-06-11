
import { generateSlots } from './public/js/slotgen.js';
import { DateTime } from 'luxon';

// Mock availability
const availability = {
  timezone: 'America/New_York',
  weekly: {
    wed: { enabled: true, blocks: [{ start: '09:00', end: '10:00' }] }
  },
  rules: {
    windowDays: 5,
    minNoticeHours: 0,
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0
  }
};

// Set 'now' to a known Wednesday in Winter
// Dec 31, 2025 is a Wednesday.
// 12:00 UTC is 07:00 NY.
const now = new Date('2025-12-31T12:00:00Z');

console.log('--- Testing Timezone Conversion (NY 09:00 -> 14:00Z) ---');
const slotsMap = generateSlots(availability, [], { today: now });

// 2025-12-31 is index 0
const slots = slotsMap.get('2025-12-31');
if (!slots || slots.length === 0) {
  console.error('FAILURE: No slots generated for 2025-12-31');
  process.exit(1);
}

const slot = slots[0];
const expectedISO = '2025-12-31T14:00:00.000Z'; // 09:00 NY + 5 = 14:00 UTC

console.log(`Generated Slot Start: ${slot.startISO}`);
console.log(`Expected Slot Start:  ${expectedISO}`);

if (slot.startISO === expectedISO) {
  console.log('SUCCESS: Slot startISO matches expected REAL UTC.');
} else {
  console.error('FAILURE: Slot startISO mismatch.');
  process.exit(1);
}

console.log('\n--- Testing Booking Matching ---');
// Create a booking that exactly matches the slot
// 14:00 Z
const booking = {
  startISO: expectedISO,
  duration: 60,
  status: 'confirmed'
};

const slotsWithBookingMap = generateSlots(availability, [booking], { today: now });
const bookedSlots = slotsWithBookingMap.get('2025-12-31');
const bookedSlot = bookedSlots[0];

console.log(`Booked Slot Status: isBooked=${bookedSlot.isBooked}`);

if (bookedSlot.isBooked) {
  console.log('SUCCESS: Booking correctly matched the slot.');
} else {
  console.error('FAILURE: Booking failed to match the slot.');
  console.log('Slot start:', bookedSlot.startISO);
  console.log('Booking start:', booking.startISO);
  process.exit(1);
}
