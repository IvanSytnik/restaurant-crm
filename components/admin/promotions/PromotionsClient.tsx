'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { pickTitle, pickDescription } from '@/lib/menu/i18n'
import { getPromotionStatus, type PromotionStatus } from '@/lib/promotions'
import type { Locale } from '@/i18n/config'

type Promotion = {
  id: string
  titleDE: string
  titleEN: string | null
  titleUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  slug: string
  imageUrl: string | null
  startDate: string
  endDate: string
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
  isActive: boolean
  isArchived: boolean
}

const STATUS_STYLES: Record<PromotionStatus, string> = {
  ACTIVE:    'bg-green-50 text-green-800 border-green-200',
  SCHEDULED: 'bg-blue-50 text-blue-800 border-blue-200',
  EXPIRED:   'bg-amber-50 text-amber-800 border-amber-200',
  ARCHIVED:  'bg-gray-100 text-gray-600 border-gray-200',
  INACTIVE:  'bg-gray-50 text-gray-500 border-gray-200',
}

const DAY_SHORT: Record<Locale, string[]> = {
  uk: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

export function PromotionsClient({
  initialPromotions,
  showArchived,
}: {
  initialPromotions: Promotion[]
  showArchived: boolean
}) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('promotions')
  const tCommon = useTranslations('common')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id)
    const res = await fetch(`/api/promotions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else setError('Error')
  }

  async function handleDelete(p: Promotion) {
    if (!confirm(t('confirmDelete', { title: pickTitle(p, locale) }))) return
    setBusy(p.id)
    const res = await fetch(`/api/promotions/${p.id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) router.refresh()
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {showArchived ? t('archivedCount', { count: initialPromotions.length }) : t('activeCount', { count: initialPromotions.length })}
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('newPromotion')}
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        <Link
          href="/admin/promotions"
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            !showArchived ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tabActive')}
        </Link>
        <Link
          href="/admin/promotions?view=archived"
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showArchived ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tabArchived')}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {initialPromotions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">
            {showArchived ? t('emptyArchived') : t('empty')}
          </p>
          {!showArchived && (
            <Link href="/admin/promotions/new" className="inline-block text-sm font-medium text-gray-900 hover:underline">
              {t('createFirst')} →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {initialPromotions.map((p) => {
            const status = getPromotionStatus(p)
            const title = pickTitle(p, locale)
            const desc = pickDescription(p, locale)
            const days = DAY_SHORT[locale]

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={title} className="w-full sm:w-40 h-32 sm:h-auto object-cover bg-gray-100" />
                  ) : (
                    <div className="w-full sm:w-40 h-32 sm:h-auto bg-gray-100 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <code className="bg-gray-100 px-1 rounded">{p.slug}</code>
                        </p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md border whitespace-nowrap ${STATUS_STYLES[status]}`}>
                        {t(`status.${status}`)}
                      </span>
                    </div>

                    {desc && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{desc}</p>}

                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        📅 {formatDate(p.startDate)} – {formatDate(p.endDate)}
                      </div>
                      {p.daysOfWeek.length > 0 && p.daysOfWeek.length < 7 && (
                        <div>
                          🗓 {p.daysOfWeek.map((d) => days[d]).join(', ')}
                        </div>
                      )}
                      {p.startTime && p.endTime && (
                        <div>
                          🕐 {p.startTime} – {p.endTime}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {!p.isArchived ? (
                        <>
                          <button
                            onClick={() => patch(p.id, { isActive: !p.isActive })}
                            disabled={busy === p.id}
                            className={`text-xs px-2.5 py-1 rounded-md border ${
                              p.isActive
                                ? 'bg-green-50 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {p.isActive ? t('active') : t('inactive')}
                          </button>
                          <button
                            onClick={() => patch(p.id, { isArchived: true })}
                            disabled={busy === p.id}
                            className="text-xs text-gray-700 hover:underline px-2 py-1"
                          >
                            {t('archive')}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => patch(p.id, { isArchived: false })}
                          disabled={busy === p.id}
                          className="text-xs text-gray-700 hover:underline px-2 py-1"
                        >
                          {t('unarchive')}
                        </button>
                      )}

                      <Link
                        href={`/admin/promotions/${p.id}`}
                        className="text-xs text-gray-700 hover:underline px-2 py-1"
                      >
                        {tCommon('edit')}
                      </Link>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={busy === p.id}
                        className="text-xs text-red-600 hover:underline px-2 py-1 disabled:opacity-50"
                      >
                        {tCommon('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
