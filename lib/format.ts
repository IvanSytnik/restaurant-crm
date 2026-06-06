/**
 * Price formatting helpers for the public site.
 * Restaurant is in Austria — use de-AT locale and EUR currency.
 */

import type { Locale } from '@/i18n/config'

const FORMATTERS: Record<Locale, Intl.NumberFormat> = {
  de: new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }),
  uk: new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'EUR' }),
}

/**
 * Format a price for the public site. Accepts Decimal (Prisma), number, or string.
 */
export function formatPrice(value: unknown, locale: Locale = 'de'): string {
  const n = typeof value === 'number' ? value : Number(value?.toString?.() ?? value)
  if (!Number.isFinite(n)) return ''
  return FORMATTERS[locale].format(n)
}

/**
 * Format a date range like "12. Mai – 30. Juni 2025" using locale-aware month names.
 */
export function formatDateRange(start: Date | string, end: Date | string, locale: Locale = 'de'): string {
  const s = new Date(start)
  const e = new Date(end)
  const tag = locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'de-AT'
  const fmt = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' })
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()) {
    return fmt.format(s)
  }
  return `${fmt.format(s)} – ${fmt.format(e)}`
}
