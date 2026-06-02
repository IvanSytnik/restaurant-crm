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
 * 1. Если пользователь залогинен — берём User.locale из БД
 * 2. Иначе — cookie NEXT_LOCALE
 * 3. Иначе — defaultLocale (uk)
 */
export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale

  // 1. Из сессии и БД (для залогиненных пользователей)
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true },
      })
      if (user?.locale && locales.includes(user.locale as Locale)) {
        locale = user.locale as Locale
      }
    } else {
      // 2. Из cookie
      const cookieStore = await cookies()
      const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
      if (cookieLocale && locales.includes(cookieLocale as Locale)) {
        locale = cookieLocale as Locale
      }
    }
  } catch {
    // на этапе билда или в edge cases — оставляем default
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
