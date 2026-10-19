import { formatViennaDate, formatViennaTime, viennaDayOfWeek } from '@/lib/public/vienna-time'

/** Public booking slots start every SLOT_STEP_MINUTES from opening time. */
export const SLOT_STEP_MINUTES = 15

export type DayBookingHours = {
  isOpen: boolean
  openTime: string
  lastBookingTime: string
}

export type SlotCheck = { ok: true } | { ok: false; reason: 'CLOSED' | 'OUTSIDE_HOURS' | 'OFF_GRID' }

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Vienna weekday (0 = Sunday) of an instant — the WorkingHours row to use. */
export function viennaWeekdayOf(instant: Date): number {
  return viennaDayOfWeek(formatViennaDate(instant))
}

/**
 * Is `start` a slot the public form could have offered? It must fall on an
 * open day, between opening time and last booking time (inclusive), on the
 * SLOT_STEP_MINUTES grid counted from opening time — all in Vienna time.
 * Admin bookings deliberately skip this check (events, private bookings).
 */
export function checkPublicSlot(start: Date, hours: DayBookingHours | null): SlotCheck {
  if (!hours || !hours.isOpen) return { ok: false, reason: 'CLOSED' }

  if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) {
    return { ok: false, reason: 'OFF_GRID' }
  }

  const minute = toMinutes(formatViennaTime(start))
  const open = toMinutes(hours.openTime)
  const last = toMinutes(hours.lastBookingTime)

  if (minute < open || minute > last) return { ok: false, reason: 'OUTSIDE_HOURS' }
  if ((minute - open) % SLOT_STEP_MINUTES !== 0) return { ok: false, reason: 'OFF_GRID' }
  return { ok: true }
}
