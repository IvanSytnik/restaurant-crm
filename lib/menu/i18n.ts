import type { Locale } from '@/i18n/config'

/**
 * Возвращает локализованное название с fallback на DE.
 *
 * Поведение:
 * - Если запрошен DE — всегда вернёт nameDE (обязательное поле)
 * - Если запрошен EN или UK — вернёт это поле, если оно заполнено;
 *   иначе fallback на nameDE
 */
export function pickName(
  obj: { nameDE: string; nameEN?: string | null; nameUK?: string | null },
  locale: Locale
): string {
  if (locale === 'de') return obj.nameDE
  if (locale === 'en') return obj.nameEN || obj.nameDE
  if (locale === 'uk') return obj.nameUK || obj.nameDE
  return obj.nameDE
}

/**
 * Аналогично pickName, но для описаний (опциональное поле).
 * Возвращает null если ни на одном языке не заполнено.
 */
export function pickDescription(
  obj: {
    descriptionDE?: string | null
    descriptionEN?: string | null
    descriptionUK?: string | null
  },
  locale: Locale
): string | null {
  if (locale === 'de') return obj.descriptionDE ?? null
  if (locale === 'en') return obj.descriptionEN || obj.descriptionDE || null
  if (locale === 'uk') return obj.descriptionUK || obj.descriptionDE || null
  return obj.descriptionDE ?? null
}

/**
 * Для названий вариантов блюд (labelDE, labelEN, labelUK).
 */
export function pickLabel(
  obj: { labelDE: string; labelEN?: string | null; labelUK?: string | null },
  locale: Locale
): string {
  if (locale === 'de') return obj.labelDE
  if (locale === 'en') return obj.labelEN || obj.labelDE
  if (locale === 'uk') return obj.labelUK || obj.labelDE
  return obj.labelDE
}

/**
 * Для заголовков акций (titleDE, titleEN, titleUK).
 */
export function pickTitle(
  obj: { titleDE: string; titleEN?: string | null; titleUK?: string | null },
  locale: Locale
): string {
  if (locale === 'de') return obj.titleDE
  if (locale === 'en') return obj.titleEN || obj.titleDE
  if (locale === 'uk') return obj.titleUK || obj.titleDE
  return obj.titleDE
}
