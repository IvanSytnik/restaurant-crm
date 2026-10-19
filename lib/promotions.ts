import { formatViennaDate, formatViennaTime, viennaDayOfWeek } from '@/lib/public/vienna-time'

/**
 * Promotion status by calendar date, evaluated on the Vienna calendar:
 * - ARCHIVED: archived by an admin
 * - INACTIVE: isActive = false
 * - SCHEDULED: today is before startDate
 * - ACTIVE: startDate <= today <= endDate (endDate is inclusive)
 * - EXPIRED: today is after endDate, not archived
 *
 * startDate/endDate are @db.Date columns, i.e. UTC midnight of the calendar
 * day; they are compared as 'YYYY-MM-DD' strings, never in the host timezone.
 * Weekdays and hours are not part of the status — see isPromotionLiveNow().
 */

export type PromotionStatus = 'ARCHIVED' | 'INACTIVE' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED'

type PromotionDates = {
  isActive: boolean
  isArchived: boolean
  startDate: Date | string
  endDate: Date | string
}

type PromotionSchedule = PromotionDates & {
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
}

/** 'YYYY-MM-DD' of a @db.Date value (Date or its JSON-serialized string). */
function calendarDay(value: Date | string): string {
  return (typeof value === 'string' ? value : value.toISOString()).slice(0, 10)
}

export function getPromotionStatus(p: PromotionDates, now: Date = new Date()): PromotionStatus {
  if (p.isArchived) return 'ARCHIVED'
  if (!p.isActive) return 'INACTIVE'

  const today = formatViennaDate(now)
  if (today < calendarDay(p.startDate)) return 'SCHEDULED'
  if (today > calendarDay(p.endDate)) return 'EXPIRED'
  return 'ACTIVE'
}

/**
 * Is the offer valid at this very moment? ACTIVE by date, and — if set — on
 * one of its weekdays (0 = Sunday) and within [startTime, endTime) in Vienna
 * time. Used for the "current special" banner, so a Mon–Fri lunch offer is not
 * advertised on Sunday evening.
 */
export function isPromotionLiveNow(p: PromotionSchedule, now: Date = new Date()): boolean {
  if (getPromotionStatus(p, now) !== 'ACTIVE') return false

  if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(viennaDayOfWeek(formatViennaDate(now)))) {
    return false
  }

  if (p.startTime && p.endTime) {
    const hhmm = formatViennaTime(now)
    if (hhmm < p.startTime || hhmm >= p.endTime) return false
  }
  return true
}

/**
 * Slugify с поддержкой немецких умляутов и кириллицы (через транслитерацию)
 */
const TRANSLIT: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie',
  ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  ю: 'iu', я: 'ia',
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
