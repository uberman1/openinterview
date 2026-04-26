// /js/availability.model.js
export const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

function resolveTimezone(tz) {
  if (!tz) return 'UTC';

  // Legacy/Dropdown string mapping
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

  if (map[tz]) {
      console.log(`[availability] Resolved legacy timezone "${tz}" to "${map[tz]}"`);
      return map[tz];
  }

  // Try to use it directly
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch (e) {
    console.warn(`[availability] Invalid timezone "${tz}", falling back to UTC`);
    return 'UTC';
  }
}

export function createDefaultAvailability() {
  const weekly = {};
  for (const d of DAYS) {
    weekly[d] = { enabled: false, blocks: [] };
  }
  return {
    timezone: resolveTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone),
    weekly,
    rules: {
      minNoticeHours: 24,
      windowDays: 60,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      dailyCap: ''
    }
  };
}

export function normalizeAvailability(src) {
  const base = createDefaultAvailability();
  if (!src || typeof src !== 'object') return base;
  const out = structuredClone(base);
  out.timezone = resolveTimezone(src.timezone || base.timezone);
  for (const d of DAYS) {
    const day = src.weekly?.[d] || {};
    out.weekly[d].enabled = !!day.enabled;
    out.weekly[d].blocks = Array.isArray(day.blocks) ? day.blocks.filter(b => isValidBlock(b)).map(b => ({ start: b.start, end: b.end })) : [];
    out.weekly[d].blocks.sort((a,b) => a.start.localeCompare(b.start));
  }
  const r = src.rules || {};
  out.rules.minNoticeHours = numberOr(r.minNoticeHours, base.rules.minNoticeHours);
  out.rules.windowDays = 60; // Enforce fixed 60 days
  out.rules.durationMinutes = numberOr(r.durationMinutes, base.rules.durationMinutes);
  out.rules.bufferBeforeMinutes = numberOr(r.bufferBeforeMinutes, base.rules.bufferBeforeMinutes);
  out.rules.bufferAfterMinutes = numberOr(r.bufferAfterMinutes, base.rules.bufferAfterMinutes);
  out.rules.dailyCap = r.dailyCap === '' || r.dailyCap == null ? '' : numberOr(r.dailyCap, '');
  
  return out;
}

export function isValidBlock(b) {
  if (!b || typeof b.start !== 'string' || typeof b.end !== 'string') return false;
  return /^\d{2}:\d{2}$/.test(b.start) && /^\d{2}:\d{2}$/.test(b.end) && b.start < b.end;
}

function numberOr(v, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

export function setDayEnabled(av, day, enabled) {
  if (!DAYS.includes(day)) return av;
  const next = structuredClone(av);
  next.weekly[day].enabled = !!enabled;
  return next;
}

export function addBlock(av, day, block) {
  if (!DAYS.includes(day)) return av;
  if (!isValidBlock(block)) return av;
  const next = structuredClone(av);
  const list = next.weekly[day].blocks;
  for (const b of list) {
    if (!(block.end <= b.start || block.start >= b.end)) {
      return av;
    }
  }
  list.push({ start: block.start, end: block.end });
  list.sort((a,b) => a.start.localeCompare(b.start));
  return next;
}

export function removeBlock(av, day, index) {
  if (!DAYS.includes(day)) return av;
  const next = structuredClone(av);
  next.weekly[day].blocks.splice(index, 1);
  return next;
}

export function clearBlocks(av, day) {
  if (!DAYS.includes(day)) return av;
  const next = structuredClone(av);
  next.weekly[day].blocks = [];
  return next;
}

export function copyDayToAll(av, srcDay) {
  if (!DAYS.includes(srcDay)) return av;
  const next = structuredClone(av);
  for (const d of DAYS) {
    next.weekly[d].blocks = structuredClone(av.weekly[srcDay].blocks || []);
  }
  return next;
}

export function setRules(av, rulesPatch) {
  const next = structuredClone(av);
  const merged = { ...next.rules, ...rulesPatch };
  next.rules = normalizeAvailability({ ...next, rules: merged }).rules;
  return next;
}
