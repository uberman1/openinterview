import { getSlotState } from './booking_utils.js';

function getSafeTz(tz) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch (e) {
    console.warn(`[slotgen] Invalid timezone "${tz}", falling back to UTC`);
    return 'UTC';
  }
}

export function generateSlots(availability, existingBookings = [], opts = {}) {
  console.log('[slotgen] Starting generation with:', { 
    tz: availability?.timezone, 
    weeklyWed: availability?.weekly?.wed,
    bookings: existingBookings.length
  });

  const result = new Map();
  if (!availability) return result;
  const tz = getSafeTz(availability.timezone || 'UTC');
  
    const rules = availability.rules || {};
  
  const now = opts.today instanceof Date ? opts.today : new Date();
  const minNoticeMs = (Number(rules.minNoticeHours) || 0) * 60 * 60 * 1000;
  const windowDays =  Number(rules.windowDays ?? availability.windowDays ?? 60) || 60;
  const duration =  Number(availability.durationMinutes ?? rules.durationMinutes ?? 15) || 15;
  const bufferBefore =Number(rules.bufferBeforeMinutes) || 0;
  const bufferAfter = Number(rules.bufferAfterMinutes) || 0;
  const dailyCap = rules.dailyCap === '' ? Infinity : Number(rules.dailyCap) || Infinity;

  // Use the helper to determine booking state, BUT we also need to respect buffers for "unavailable" slots.
  // We keep the old overlap logic for buffers, but we will explicitly check for "booked" state.
  
  // FIX: Use Real UTC timestamps for booking ranges (no fake UTC conversion)
  // Also handle different field names for start time
  const bookingRanges = existingBookings.map(b => {
    const startMs = new Date(b.startISO || b.startTime || b.start_time).getTime();
    const endMs = b.endISO ? new Date(b.endISO).getTime() 
                : b.duration ? startMs + (b.duration * 60 * 1000)
                : startMs + (30 * 60 * 1000); // fallback 30m
    
    return {
      start: startMs - bufferBefore * 60 * 1000,
      end: endMs + bufferAfter * 60 * 1000,
      isBooking: true
    };
  });

  for (let d = 0; d <= windowDays; d++) {
    const date = addDays(now, d);
    const dayKey = fmtDate(date, tz);
    
    // Determine weekday in Profile Timezone to match the schedule correctly
    const dowPart = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
    const dayName = dowPart.toLowerCase(); // 'sun', 'mon', etc.
    
    const dayCfg = availability.weekly[dayName];
    
    // Debug log for Wednesday
    if (dayName === 'wed' && d < 20) {
        console.log(`[slotgen] Checking Wed ${dayKey} (derived from ${dowPart}): enabled=${dayCfg?.enabled}, blocks=${JSON.stringify(dayCfg?.blocks)}`);
    }

    if (!dayCfg?.enabled || !dayCfg.blocks?.length) continue;

    const daySlots = [];
    for (const block of dayCfg.blocks) {
      const [bsH, bsM] = block.start.split(':').map(Number);
      const [beH, beM] = block.end.split(':').map(Number);

      let cursor = atTime(date, bsH, bsM, tz);
      const blockEnd = atTime(date, beH, beM, tz);

       if (cursor == null || blockEnd == null) continue;


      while (cursor < blockEnd) {
        if (cursor - now.getTime() >= minNoticeMs) {
          const end = cursor + duration * 60 * 1000;
          if (end <= blockEnd) {
            const startISO = toISO(cursor);
            
            // 1. Check strict booking overlap (is it taken?)
            const bookingState = getSlotState(startISO, duration, existingBookings);
            
            // 2. Check buffer overlap (is it unavailable due to buffer rules?)
            // We only care about buffer overlap if it's NOT strictly booked.
            // If it IS booked, we show it as booked.
            // If it's NOT booked but overlaps a buffer, we hide it (unavailable).
            
            let overlapsBuffer = false;
            if (!bookingState.isBooked) {
                overlapsBuffer = bookingRanges.some(r => !(end <= r.start || cursor >= r.end));
            }

            if (bookingState.isBooked || !overlapsBuffer) {
              daySlots.push({
                startISO: startISO,
                endISO: toISO(end),
                durationMinutes: duration,
                ...bookingState // add isBooked, status, label, className, disabled
              });
            }
          }
        }
        // Advance by duration (no increments)
        cursor += duration * 60 * 1000;
      }
    }

    const capped = daySlots.slice(0, dailyCap);
    if (capped.length) {
        if (dayName === 'wed' && d < 20) console.log(`[slotgen] Generated ${capped.length} slots for ${dayKey}`);
        result.set(dayKey, capped);
    }
  }
  return result;
}

function addDays(d, days) { const n = new Date(d.getTime()); n.setDate(n.getDate() + days); return n; }

export function fmtDate(d, tz) {
  const safeTz = getSafeTz(tz);
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: safeTz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const da = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${da}`;
}

function atTime(d, hh, mm, tz) {
  const safeTz = getSafeTz(tz);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });

  const parts = dtf.formatToParts(d);
  const y = parseInt(parts.find(p => p.type === 'year').value, 10);
  const m = parseInt(parts.find(p => p.type === 'month').value, 10);
  const da = parseInt(parts.find(p => p.type === 'day').value, 10);

  // Guess UTC timestamp by treating target wall time as UTC

    let guess = Date.UTC(y, m - 1, da, hh, mm, 0, 0);

  // Refine guess to match target timezone
  for (let i = 0; i < 3; i++) {
    const checkParts = dtf.formatToParts(new Date(guess));
    const cy = parseInt(checkParts.find(p => p.type === 'year').value, 10);
    const cm = parseInt(checkParts.find(p => p.type === 'month').value, 10);
    const cd = parseInt(checkParts.find(p => p.type === 'day').value, 10);
    const ch = parseInt(checkParts.find(p => p.type === 'hour').value, 10);
    const cmin = parseInt(checkParts.find(p => p.type === 'minute').value, 10);

    const currentVal = Date.UTC(cy, cm - 1, cd, ch, cmin, 0, 0);
    const targetVal = Date.UTC(y, m - 1, da, hh, mm, 0, 0);
    const diff = targetVal - currentVal;
    
    if (diff === 0) break;
    guess += diff;
  }
  // ✅ DST non-existent time guard: verify exact hh:mm in target tz
  const verify = dtf.formatToParts(new Date(guess));
  const vh = parseInt(verify.find(p => p.type === 'hour').value, 10);
  const vm = parseInt(verify.find(p => p.type === 'minute').value, 10);

  if (vh !== hh || vm !== mm) {
    // e.g. "02:30" on spring-forward day (doesn't exist)
    return null;
  }
  return guess;
}

function toISO(ms) { return new Date(ms).toISOString(); }
