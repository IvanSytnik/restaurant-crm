/**
 * Helpers for working with Europe/Vienna local time, regardless of where the
 * code runs (Vercel/UTC, local dev/Vienna, guest's browser in another tz).
 *
 * Why this matters:
 *   `new Date('2026-06-07T15:00:00')` (no timezone suffix) is interpreted in
 *   the runtime's LOCAL timezone — UTC on Vercel, Vienna locally. This caused
 *   /api/availability to emit slots that were 2 hours off on production:
 *   the server generated "15:00" thinking it was UTC = 17:00 Vienna, while
 *   the guest's browser interpreted "15:00" as Vienna local. The two never
 *   agreed, and bookings failed with PAST_TIME.
 *
 *   The fix: pin every parse/format to Europe/Vienna explicitly.
 */

/**
 * Vienna's UTC offset in minutes at a given instant (+60 in winter, +120 in
 * summer).
 */
function viennaOffsetMinutesAt(instant: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - Math.floor(instant / 60_000) * 60_000) / 60_000)
}

/**
 * Convert a (Vienna-local date string, Vienna-local time string) pair to an
 * ISO UTC timestamp. Same value regardless of where this runs.
 *
 *   viennaIso('2026-06-07', '15:00') === '2026-06-07T13:00:00.000Z'  (CEST)
 *   viennaIso('2026-01-07', '15:00') === '2026-01-07T14:00:00.000Z'  (CET)
 *
 * The offset is resolved for the wall-clock time itself, not for the whole
 * day, so times before the 02:00/03:00 switch on DST days are correct too.
 * A non-existent spring-forward time (02:30 on the last Sunday of March)
 * resolves to the instant one hour later (03:30 CEST).
 */
export function viennaIso(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi)
  // Two passes: the offset at a first guess, then at the corrected instant.
  const guess = wallAsUtc - viennaOffsetMinutesAt(wallAsUtc) * 60_000
  const utc = wallAsUtc - viennaOffsetMinutesAt(guess) * 60_000
  return new Date(utc).toISOString()
}

/**
 * Format a Date as 'HH:mm' in Vienna time.
 */
export function formatViennaTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Format a Date as 'YYYY-MM-DD' in Vienna time. Used to determine whether a
 * given calendar day is "today" from the restaurant's perspective.
 */
export function formatViennaDate(date: Date): string {
  // en-CA produces ISO-like YYYY-MM-DD natively.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
  }).format(date)
}

/**
 * Day-of-week for a Vienna calendar date (0 = Sunday, 6 = Saturday).
 * Matches Prisma WorkingHours.dayOfWeek convention.
 */
export function viennaDayOfWeek(dateStr: string): number {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    weekday: 'short',
  }).format(probe)
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[wd] ?? 1
}

/** Today's calendar date in Vienna as 'YYYY-MM-DD'. */
export function viennaToday(): string {
  return formatViennaDate(new Date())
}

/** Pure calendar arithmetic on a 'YYYY-MM-DD' string (no timezone involved). */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * A Vienna calendar day as a half-open UTC interval [start, end). Use with
 * `{ gte: start, lt: end }`. 23 or 25 hours long on DST change days.
 */
export function viennaDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(viennaIso(dateStr, '00:00')),
    end: new Date(viennaIso(addDays(dateStr, 1), '00:00')),
  }
}

/**
 * Value for a Prisma `@db.Date` column: the Vienna calendar day of `instant`,
 * as UTC midnight. Never derive it with setHours(), which uses the host TZ.
 */
export function viennaDateColumn(instant: Date): Date {
  return new Date(`${formatViennaDate(instant)}T00:00:00.000Z`)
}
