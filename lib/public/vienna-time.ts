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
 * UTC offset for Vienna on a given calendar date, as a string suffix.
 * '+01:00' in winter (CET), '+02:00' in summer (CEST). DST-aware.
 */
export function viennaOffsetForDate(dateStr: string): string {
  // Probe at noon UTC of the given date — it's always inside the same Vienna
  // calendar day (Vienna is UTC+1 or +2, never crosses midnight from 12:00 UTC).
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const tzName = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value

  // Examples: 'GMT+1', 'GMT+2'. Older runtimes may emit 'GMT+01:00'.
  const m = tzName?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
  if (!m) return '+01:00'
  const sign = m[1]
  const hours = m[2].padStart(2, '0')
  const minutes = (m[3] ?? '00').padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

/**
 * Convert a (Vienna-local date string, Vienna-local time string) pair to an
 * ISO UTC timestamp. Same value regardless of where this runs.
 *
 *   viennaIso('2026-06-07', '15:00') === '2026-06-07T13:00:00.000Z'  (CEST)
 *   viennaIso('2026-01-07', '15:00') === '2026-01-07T14:00:00.000Z'  (CET)
 */
export function viennaIso(dateStr: string, timeStr: string): string {
  const offset = viennaOffsetForDate(dateStr)
  return new Date(`${dateStr}T${timeStr}:00${offset}`).toISOString()
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
