'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { localeToUrl, localeLabels, locales, type Locale } from '@/i18n/config'

type Props = {
  current: Locale
  /** color theme for current text */
  variant?: 'light' | 'dark'
}

export function PublicLocaleSwitcher({ current, variant = 'dark' }: Props) {
  const pathname = usePathname() ?? '/'

  // Strip current /xx prefix from pathname
  const trailing = pathname.replace(/^\/(ua|de|en)(?=\/|$)/, '')

  const color = variant === 'light' ? 'text-cream/80 hover:text-cream' : 'text-ink-soft hover:text-ink'
  const active = variant === 'light' ? 'text-cream' : 'text-ink'

  return (
    <div className="flex items-center gap-3 text-xs tracking-widest uppercase">
      {locales.map((loc, idx) => {
        const seg = localeToUrl[loc]
        const isActive = loc === current
        return (
          <span key={loc} className="flex items-center gap-3">
            {idx > 0 && <span className={color}>·</span>}
            <Link
              href={`/${seg}${trailing}`}
              aria-current={isActive ? 'page' : undefined}
              className={`${isActive ? active : color} transition-colors`}
            >
              {seg === 'ua' ? 'UA' : seg.toUpperCase()}
              <span className="sr-only">{localeLabels[loc].native}</span>
            </Link>
          </span>
        )
      })}
    </div>
  )
}
