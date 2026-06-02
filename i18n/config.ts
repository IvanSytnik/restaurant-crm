// Стандартные коды языков (используются в коде, в БД, в next-intl)
export const locales = ['uk', 'de', 'en'] as const
export type Locale = (typeof locales)[number]

// CRM по умолчанию — украинский
export const defaultLocale: Locale = 'uk'

// Публичный сайт по умолчанию — немецкий
export const publicDefaultLocale: Locale = 'de'

// Маппинг URL-сегментов на стандартные коды.
// Пользователь видит /ua в URL, но код работает с uk.
export const urlToLocale: Record<string, Locale> = {
  ua: 'uk',
  de: 'de',
  en: 'en',
}

export const localeToUrl: Record<Locale, string> = {
  uk: 'ua',
  de: 'de',
  en: 'en',
}

// Названия языков для UI
export const localeLabels: Record<Locale, { native: string; flag: string }> = {
  uk: { native: 'Українська', flag: '🇺🇦' },
  de: { native: 'Deutsch',    flag: '🇩🇪' },
  en: { native: 'English',    flag: '🇬🇧' },
}
