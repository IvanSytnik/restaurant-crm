import { notFound } from 'next/navigation'
import { urlToLocale, localeToUrl, locales, type Locale } from '@/i18n/config'

/**
 * Resolve URL segment (de | en | ua) to internal Locale (de | en | uk).
 * Throws notFound() for unknown segments — Next.js will render 404.
 */
export function resolvePublicLocale(urlSegment: string): Locale {
  const loc = urlToLocale[urlSegment]
  if (!loc) notFound()
  return loc
}

/**
 * Build a public URL for a given locale.
 *   pathForLocale('uk', '/menu') -> '/ua/menu'
 *   pathForLocale('de', '')      -> '/de'
 */
export function pathForLocale(locale: Locale, subpath = ''): string {
  const seg = localeToUrl[locale]
  const tail = subpath ? `/${subpath.replace(/^\/+/, '')}` : ''
  return `/${seg}${tail}`
}

export function isValidUrlLocaleSegment(seg: string): boolean {
  return seg in urlToLocale
}

export { locales }
