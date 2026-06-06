'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function PublicNotFound() {
  const t = useTranslations('public.notFound')
  const pathname = usePathname()

  // Preserve current URL locale segment for the "back home" link.
  const match = pathname?.match(/^\/(de|en|ua)/)
  const localeSeg = match?.[1] ?? 'de'

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-cream text-ink px-6 py-32">
      <div className="text-center max-w-md">
        <p className="public-eyebrow text-accent mb-4">404</p>
        <h1 className="font-display text-4xl sm:text-5xl mb-4">{t('title')}</h1>
        <p className="text-ink-soft mb-8">{t('subtitle')}</p>
        <Link
          href={`/${localeSeg}`}
          className="inline-block bg-ink text-cream px-6 py-3 text-sm tracking-wider uppercase hover:bg-black transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}
