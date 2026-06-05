'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { pathForLocale } from '@/lib/public/locale'
import { PublicLocaleSwitcher } from './PublicLocaleSwitcher'
import { pickName } from '@/lib/menu/i18n'

type Props = {
  locale: Locale
  contacts: ContactsMap
}

export function PublicHeader({ locale, contacts }: Props) {
  const t = useTranslations('public.nav')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const name = pickName(
    { nameDE: contacts.name_de ?? '', nameEN: contacts.name_en ?? null, nameUK: contacts.name_uk ?? null },
    locale
  ) || 'Restaurant'

  // Header is transparent over hero, cream-with-border once scrolled.
  // Text colors flip accordingly.
  const shellClass = scrolled
    ? 'bg-cream/95 backdrop-blur border-b border-[var(--border)]'
    : 'bg-transparent'
  const linkClass = scrolled
    ? 'text-ink/80 hover:text-ink'
    : 'text-cream/90 hover:text-cream'
  const brandClass = scrolled ? 'text-ink' : 'text-cream'

  const links: Array<{ key: string; href: string }> = [
    { key: 'menu', href: pathForLocale(locale, 'menu') },
    { key: 'promotions', href: pathForLocale(locale, 'promotions') },
    { key: 'gallery', href: pathForLocale(locale, 'gallery') },
    { key: 'contact', href: pathForLocale(locale, '') + '#contact' },
  ]

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${shellClass}`}>
        <div className="max-w-8xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link href={pathForLocale(locale, '')} className="flex items-center">
            <span className={`font-display text-xl sm:text-2xl tracking-wide transition-colors ${brandClass}`}>
              {name}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={`tracking-wider uppercase text-xs transition-colors ${linkClass}`}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-6">
            <PublicLocaleSwitcher current={locale} variant={scrolled ? 'dark' : 'light'} />
            <Link
              href={pathForLocale(locale, 'booking')}
              className={`text-xs tracking-widest uppercase px-5 py-2.5 border transition-colors ${
                scrolled
                  ? 'border-ink text-ink hover:bg-ink hover:text-cream'
                  : 'border-cream text-cream hover:bg-cream hover:text-ink'
              }`}
            >
              {t('book')}
            </Link>
          </div>

          {/* Mobile button */}
          <button
            type="button"
            className={`md:hidden p-2 -mr-2 transition-colors ${linkClass}`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
              ) : (
                <>
                  <path strokeLinecap="round" d="M3 7h18M3 12h18M3 17h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-cream flex flex-col">
          <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--border)]">
            <span className="font-display text-xl text-ink">{name}</span>
            <button
              type="button"
              className="p-2 -mr-2 text-ink"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="font-display text-3xl text-ink"
              >
                {t(l.key)}
              </Link>
            ))}
            <Link
              href={pathForLocale(locale, 'booking')}
              onClick={() => setMobileOpen(false)}
              className="mt-4 inline-block text-xs tracking-widest uppercase px-8 py-3 bg-ink text-cream"
            >
              {t('book')}
            </Link>
          </nav>
          <div className="px-6 py-6 border-t border-[var(--border)] flex justify-center">
            <PublicLocaleSwitcher current={locale} variant="dark" />
          </div>
        </div>
      )}
    </>
  )
}
