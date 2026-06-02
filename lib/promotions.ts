/**
 * Определяет текущий статус акции:
 * - ARCHIVED: явно архивирована админом
 * - INACTIVE: isActive = false
 * - SCHEDULED: ещё не началась (startDate > сейчас)
 * - ACTIVE: идёт прямо сейчас
 * - EXPIRED: закончилась (endDate < сейчас), но не архивирована
 */

export type PromotionStatus = 'ARCHIVED' | 'INACTIVE' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED'

export function getPromotionStatus(p: {
  isActive: boolean
  isArchived: boolean
  startDate: Date | string
  endDate: Date | string
}): PromotionStatus {
  if (p.isArchived) return 'ARCHIVED'
  if (!p.isActive) return 'INACTIVE'

  const now = new Date()
  const start = new Date(p.startDate)
  const end = new Date(p.endDate)
  // endDate включается полностью — до конца дня
  end.setHours(23, 59, 59, 999)

  if (now < start) return 'SCHEDULED'
  if (now > end) return 'EXPIRED'
  return 'ACTIVE'
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
