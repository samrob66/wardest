// Ward-local dates and times <-> UTC instants. Volunteer posts store wall-clock dates
// (YYYY-MM-DD) and times (HH:MM) in the ward's IANA time zone (wards.timezone); cutoffs,
// "the day before", "within 14 days" and "is over" are all computed through here so DST is
// handled in one place.

const DAY_MS = 86_400_000;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallParts(tz: string, instant: Date): WallParts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

// Offset of `tz` from UTC at `instant`, in ms (Denver winter = -7h).
function offsetMs(tz: string, instant: Date): number {
  const w = wallParts(tz, instant);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const whole = Math.floor(instant.getTime() / 1000) * 1000;
  return asUtc - whole;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

function dateUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

// Wall-clock `date` + `time` in `tz` -> the UTC instant. Guess the wall time as if it were UTC,
// subtract the zone's offset at that guess, then re-read the offset at the result and correct
// once (handles DST). A time that doesn't exist (spring-forward gap) resolves to the instant an
// hour away from it; an ambiguous fall-back time resolves to one of its two instants.
export function localToUtc(date: string, time: string, tz: string): Date {
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const guess = dateUtcMs(date) + hh * 3_600_000 + mm * 60_000;
  const off1 = offsetMs(tz, new Date(guess));
  let t = guess - off1;
  const off2 = offsetMs(tz, new Date(t));
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

// Today's date (YYYY-MM-DD) in the ward's zone.
export function wardToday(tz: string, now: Date): string {
  const w = wallParts(tz, now);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

export function wardHour(tz: string, now: Date): number {
  return wallParts(tz, now).hour;
}

export function addDays(date: string, n: number): string {
  const t = new Date(dateUtcMs(date) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

// Whole days from `a` to `b` (b - a).
export function diffDays(a: string, b: string): number {
  return Math.round((dateUtcMs(b) - dateUtcMs(a)) / DAY_MS);
}

// A date is over at 00:00 ward-local on the following day.
export function dateOverAt(date: string, tz: string): Date {
  return localToUtc(addDays(date, 1), '00:00', tz);
}

export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatTime(time: string): string {
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${pad(mm)} ${hh < 12 ? 'AM' : 'PM'}`;
}

// 'Saturday, Dec 6 · 9:00 AM' (no time -> 'Saturday, Dec 6').
export function formatWhen(date: string, time: string | null): string {
  const t = new Date(dateUtcMs(date));
  const d = `${WEEKDAYS[t.getUTCDay()]}, ${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}`;
  return time ? `${d} · ${formatTime(time)}` : d;
}

// The short list offered on the ward page (the current value is always added too).
export const COMMON_TIMEZONES: Array<[tz: string, label: string]> = [
  ['America/New_York', 'Eastern'],
  ['America/Chicago', 'Central'],
  ['America/Denver', 'Mountain (Denver)'],
  ['America/Phoenix', 'Arizona (Phoenix)'],
  ['America/Los_Angeles', 'Pacific'],
  ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'],
];
