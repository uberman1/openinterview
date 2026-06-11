
/**
 * Booking State Helper
 * Determines if a given time slot is occupied by an existing booking.
 */

/**
 * Checks if a slot is booked and returns its UI state.
 * @param {string} slotStartISO - The ISO string of the slot start time.
 * @param {number} slotDurationMinutes - The duration of the slot in minutes.
 * @param {Array} bookings - Array of existing booking objects.
 * @returns {Object} { isBooked, status, label, className, disabled }
 */
export function getSlotState(slotStartISO, slotDurationMinutes, bookings) {
  if (!bookings || !Array.isArray(bookings)) return { isBooked: false };

  const slotStart = new Date(slotStartISO).getTime();
  const slotEnd = slotStart + (slotDurationMinutes * 60 * 1000);

  // Find overlapping booking
  // We check for ANY overlap, not just exact match, to be safe.
  // Overlap formula: StartA < EndB && EndA > StartB
  const booking = bookings.find(b => {
    // Only consider active bookings
    const status = (b.status || '').toLowerCase();
    if (status !== 'pending' && status !== 'confirmed') return false;

    // Normalize times
    const bStart = new Date(b.startISO || b.startTime || b.start_time).getTime();
    
    // Calculate booking end
    let bEnd;
    if (b.endISO) {
      bEnd = new Date(b.endISO).getTime();
    } else if (b.duration) {
      bEnd = bStart + (b.duration * 60 * 1000);
    } else {
      // Fallback if no duration/end (shouldn't happen with valid data)
      bEnd = bStart + (30 * 60 * 1000); 
    }

    return slotStart < bEnd && slotEnd > bStart;
  });

  if (!booking) {
    return { 
      isBooked: false, 
      disabled: false,
      className: '' 
    };
  }

  const status = (booking.status || 'confirmed').toLowerCase();
  const isPending = status === 'pending';

  return {
    isBooked: true,
    status: status,
    label: isPending ? 'Reserved' : 'Booked',
    // Pending: Orange, Confirmed: Red
    className: isPending 
      ? 'bg-orange-50 border-orange-200 text-orange-600 cursor-not-allowed opacity-90' 
      : 'bg-red-50 border-red-200 text-red-600 cursor-not-allowed opacity-80',
    disabled: true
  };
}
