// /js/slotgen.js
import { DAYS } from './availability.model.js';

export function generateSlots(availability, existingBookings = [], opts = {}) {
  const result = new Map();
  if (!availability) return result;
  const tz = availability.timezone || 'UTC';
  const now = opts.today instanceof Date ? opts.today : new Date();
  const minNoticeMs = (availability.rules.minNoticeHours || 0) * 60 * 60 * 1000;
  const windowDays = availability.rules.windowDays || 0;
  const increment = availability.rules.incrementsMinutes || 30;
  const bufferBefore = availability.rules.bufferBeforeMinutes || 0;
  const bufferAfter = availability.rules.bufferAfterMinutes || 0;
  const dailyCap = availability.rules.dailyCap === '' ? Infinity : Number(availability.rules.dailyCap) || Infinity;
  const allowedDurations = availability.rules.allowedDurationsMinutes?.length
    ? availability.rules.allowedDurationsMinutes
    : [30];

  const bookingRanges = existingBookings.map(b => ({
    start: toZonedMs(new Date(b.startISO), tz) - bufferBefore * 60 * 1000,
    end: toZonedMs(new Date(b.endISO), tz) + bufferAfter * 60 * 1000
  }));

  for (let d = 0; d <= windowDays; d++) {
    const date = addDays(now, d);
    const dayKey = fmtDate(date, tz);
    const dow = date.getDay();
    const dayName = DAYS[dow];
    const dayCfg = availability.weekly[dayName];
    if (!dayCfg?.enabled || !dayCfg.blocks?.length) continue;

    const daySlots = [];
    for (const block of dayCfg.blocks) {
      const [bsH, bsM] = block.start.split(':').map(Number);
      const [beH, beM] = block.end.split(':').map(Number);

      let cursor = atTime(date, bsH, bsM, tz);
      const blockEnd = atTime(date, beH, beM, tz);

      while (cursor < blockEnd) {
        if (cursor - now.getTime() >= minNoticeMs) {
          for (const dur of allowedDurations) {
            const end = cursor + dur * 60 * 1000;
            if (end > blockEnd) continue;
            const overlaps = bookingRanges.some(r => !(end <= r.start || cursor >= r.end));
            if (!overlaps) {
              daySlots.push({
                startISO: toISO(cursor, tz),
                endISO: toISO(end, tz),
                durationMinutes: dur
              });
            }
          }
        }
        cursor += increment * 60 * 1000;
      }
    }

    const capped = daySlots.slice(0, dailyCap);
    if (capped.length) result.set(dayKey, capped);
  }
  return result;
}

function addDays(d, days) { const n = new Date(d.getTime()); n.setDate(n.getDate() + days); return n; }

function fmtDate(d, tz) {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const da = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${da}`;
}

function atTime(d, hh, mm, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = dtf.formatToParts(d);
  const y = Number(parts.find(p => p.type === 'year').value);
  const m = Number(parts.find(p => p.type === 'month').value);
  const da = Number(parts.find(p => p.type === 'day').value);
  const date = new Date(Date.UTC(y, m - 1, da, hh, mm, 0));
  return date.getTime();
}

function toZonedMs(d, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = dtf.formatToParts(d);
  const y = Number(parts.find(p => p.type === 'year').value);
  const m = Number(parts.find(p => p.type === 'month').value);
  const da = Number(parts.find(p => p.type === 'day').value);
  const hh = Number(parts.find(p => p.type === 'hour').value);
  const mm = Number(parts.find(p => p.type === 'minute').value);
  const ss = Number(parts.find(p => p.type === 'second').value);
  return Date.UTC(y, m - 1, da, hh, mm, ss);
}

function toISO(ms, tz) { return new Date(ms).toISOString(); }
