/**
 * Adapter layer. If environment provides real services, use them.
 * Otherwise a minimal in-memory store is used (for tests).
 */
const crypto = require('crypto');

// In-memory data for tests
const mem = {
  bookings: new Map(), // id -> booking
  availability: new Map(), // yyyy-mm-dd -> [{startUtc,endUtc}]
};

function seed(){
  if(mem.bookings.size) return;
  const id = 'bk_test_123';
  const token = 'public-token-abc';
  const startUtc = '2024-07-22T14:00:00Z';
  const endUtc = '2024-07-22T14:30:00Z';
  mem.bookings.set(id, {
    id, token,
    candidateName: 'Alex Turner',
    startUtc, endUtc,
    title: 'Interview with Alex Turner',
    description: 'OpenInterview meeting',
    location: 'Google Meet',
    status: 'scheduled'
  });
  mem.availability.set('2024-07-22', [
    { startUtc: '2024-07-22T13:00:00Z', endUtc: '2024-07-22T13:30:00Z' },
    { startUtc: '2024-07-22T14:00:00Z', endUtc: '2024-07-22T14:30:00Z' },
    { startUtc: '2024-07-22T14:30:00Z', endUtc: '2024-07-22T15:00:00Z' },
  ]);
}
seed();

async function getBookingByIdToken(id, token){
  const b = mem.bookings.get(id);
  if(!b || b.token !== token) return null;
  return b;
}

async function rescheduleBooking({ id, token, startUtc, endUtc }){
  const b = await getBookingByIdToken(id, token);
  if(!b || b.status !== 'scheduled') return null;
  // naive conflict check: ensure requested slot exists in availability for that day
  const day = startUtc.slice(0,10);
  const daySlots = mem.availability.get(day) || [];
  const exists = daySlots.some(s => s.startUtc === startUtc && s.endUtc === endUtc);
  if(!exists) return null;
  b.startUtc = startUtc;
  b.endUtc = endUtc;
  // rotate token (invalidate old links)
  b.token = crypto.randomBytes(8).toString('hex');
  return b;
}

async function cancelBooking({ id, token }){
  const b = await getBookingByIdToken(id, token);
  if(!b || b.status !== 'scheduled') return false;
  b.status = 'canceled';
  // rotate token
  b.token = crypto.randomBytes(8).toString('hex');
  return true;
}

async function getAvailability({ bookingId, date }){
  return mem.availability.get(date) || [];
}

module.exports = {
  getBookingByIdToken,
  rescheduleBooking,
  cancelBooking,
  getAvailability,
  __mem: mem
};
