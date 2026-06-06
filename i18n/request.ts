import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { locales, defaultLocale, type Locale } from './config'

/**
 * Определяет локаль для текущего запроса.
 *
 * Приоритет:
 * 1. requestLocale — явно переданная локаль от next-intl
 *    (например `getTranslations({ locale: 'de' })` на публичных страницах).
 *    Это ОБЯЗАТЕЛЬНО иначе server-компоненты публички, дёргающие
 *    getTranslations({ locale: 'de' }), будут получать UK messages
 *    из-за сессии/cookie админа.
 * 2. User.locale из БД — для залогиненных пользователей (админка).
 * 3. Cookie NEXT_LOCALE.
 * 4. defaultLocale (uk).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale: Locale | null = null

  // 1. Явно запрошенная локаль (next-intl 3.22+).
  const requested = await requestLocale
  if (requested && (locales as readonly string[]).includes(requested)) {
    locale = requested as Locale
  }

  // 2. Из сессии и БД.
  if (!locale) {
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { locale: true },
        })
        if (user?.locale && (locales as readonly string[]).includes(user.locale)) {
          locale = user.locale as Locale
        }
      }
    } catch {
      // на этапе билда или в edge cases — игнорируем
    }
  }

  // 3. Из cookie.
  if (!locale) {
    try {
      const cookieStore = await cookies()
      const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
      if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
        locale = cookieLocale as Locale
      }
    } catch {
      // не для всех путей доступны cookies — игнорируем
    }
  }

  // 4. Default.
  if (!locale) locale = defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
