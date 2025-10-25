// /js/availability.model.js
export const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

export function createDefaultAvailability() {
  const weekly = {};
  for (const d of DAYS) {
    weekly[d] = { enabled: false, blocks: [] };
  }
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    weekly,
    rules: {
      minNoticeHours: 24,
      windowDays: 60,
      incrementsMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      dailyCap: '',
      allowedDurationsMinutes: [15, 30, 60]
    }
  };
}

export function normalizeAvailability(src) {
  const base = createDefaultAvailability();
  if (!src || typeof src !== 'object') return base;
  const out = structuredClone(base);
  out.timezone = src.timezone || base.timezone;
  for (const d of DAYS) {
    const day = src.weekly?.[d] || {};
    out.weekly[d].enabled = !!day.enabled;
    out.weekly[d].blocks = Array.isArray(day.blocks) ? day.blocks.filter(b => isValidBlock(b)).map(b => ({ start: b.start, end: b.end })) : [];
    out.weekly[d].blocks.sort((a,b) => a.start.localeCompare(b.start));
  }
  const r = src.rules || {};
  out.rules.minNoticeHours = numberOr(r.minNoticeHours, base.rules.minNoticeHours);
  out.rules.windowDays = numberOr(r.windowDays, base.rules.windowDays);
  out.rules.incrementsMinutes = numberOr(r.incrementsMinutes, base.rules.incrementsMinutes);
  out.rules.bufferBeforeMinutes = numberOr(r.bufferBeforeMinutes, base.rules.bufferBeforeMinutes);
  out.rules.bufferAfterMinutes = numberOr(r.bufferAfterMinutes, base.rules.bufferAfterMinutes);
  out.rules.dailyCap = r.dailyCap === '' || r.dailyCap == null ? '' : numberOr(r.dailyCap, '');
  out.rules.allowedDurationsMinutes = Array.isArray(r.allowedDurationsMinutes) && r.allowedDurationsMinutes.length
    ? r.allowedDurationsMinutes.map(n => Number(n)).filter(n => !Number.isNaN(n))
    : base.rules.allowedDurationsMinutes;
  return out;
}

export function isValidBlock(b) {
  if (!b || typeof b.start !== 'string' || typeof b.end !== 'string') return false;
  return /^\\d{2}:\\d{2}$/.test(b.start) && /^\\d{2}:\\d{2}$/.test(b.end) && b.start < b.end;
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
  next.rules = normalizeAvailability({ rules: rulesPatch }).rules;
  return next;
}
