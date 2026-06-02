'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { locales, localeLabels, type Locale } from '@/i18n/config'

export function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function change(locale: Locale) {
    setOpen(false)
    if (locale === currentLocale) return

    startTransition(async () => {
      const res = await fetch('/api/user/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      if (res.ok) {
        router.refresh()
      }
    })
  }

  const current = localeLabels[currentLocale]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="flex-1 text-left">{current.native}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {locales.map((loc) => {
              const label = localeLabels[loc]
              const active = loc === currentLocale
              return (
                <button
                  key={loc}
                  onClick={() => change(loc)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">{label.flag}</span>
                  <span>{label.native}</span>
                  {active && (
                    <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
