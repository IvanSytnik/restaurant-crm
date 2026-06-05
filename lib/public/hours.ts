import { prisma } from '@/lib/prisma'

export type DayHours = {
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
  lastBookingTime: string | null
}

export async function getWorkingHours(): Promise<DayHours[]> {
  const rows = await prisma.workingHours.findMany({
    orderBy: { dayOfWeek: 'asc' },
  })
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    isOpen: r.isOpen,
    openTime: r.openTime,
    closeTime: r.closeTime,
    lastBookingTime: r.lastBookingTime,
  }))
}

/**
 * Compute "open now" using Vienna local time (Austria-only restaurant).
 * Returns { isOpen, today } so the UI can display a status + today's hours.
 */
export function computeOpenNow(hours: DayHours[]): {
  isOpenNow: boolean
  today: DayHours | null
  now: { dayOfWeek: number; hhmm: string }
} {
  // Render server-side in Europe/Vienna regardless of host timezone
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'

  // Map weekday short to Prisma dayOfWeek (0 = Sunday … 6 = Saturday)
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const dayOfWeek = dowMap[weekdayShort] ?? 1
  const hhmm = `${hour}:${minute}`

  const today = hours.find((h) => h.dayOfWeek === dayOfWeek) ?? null
  let isOpenNow = false

  if (today?.isOpen && today.openTime && today.closeTime) {
    // Lex compare works for HH:mm strings. Handles same-day windows.
    // Past-midnight close (e.g. 02:00) isn't modeled here — restaurants usually close before midnight.
    isOpenNow = hhmm >= today.openTime && hhmm <= today.closeTime
  }

  return { isOpenNow, today, now: { dayOfWeek, hhmm } }
}
