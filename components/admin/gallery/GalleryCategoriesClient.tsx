'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { pickName } from '@/lib/menu/i18n'
import type { Locale } from '@/i18n/config'

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  slug: string
  position: number
  isVisible: boolean
  _count: { images: number }
}

export function GalleryCategoriesClient({
  initialCategories,
}: {
  initialCategories: Category[]
}) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('gallery.categories')
  const tCommon = useTranslations('common')
  const [categories, setCategories] = useState(initialCategories)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return

    const newOrder = [...categories]
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setCategories(newOrder)

    const res = await fetch('/api/gallery/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'category', ids: newOrder.map((c) => c.id) }),
    })
    if (!res.ok) setCategories(initialCategories)
  }

  async function toggleVisible(cat: Category) {
    setBusy(cat.id)
    const res = await fetch(`/api/gallery/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !cat.isVisible }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
  }

  async function handleDelete(cat: Category) {
    if (cat._count.images > 0) {
      setError(t('cannotDelete', { name: pickName(cat, locale), count: cat._count.images }))
      return
    }
    if (!confirm(t('confirmDelete', { name: pickName(cat, locale) }))) return

    setBusy(cat.id)
    const res = await fetch(`/api/gallery/categories/${cat.id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) router.refresh()
    else {
      const data = await res.json()
      setError(data.error)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/gallery" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {tCommon('back')}
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{t('title')}</h1>
        </div>
        <Link
          href="/admin/gallery/categories/new"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('newCategory')}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">{t('empty')}</p>
          <Link href="/admin/gallery/categories/new" className="inline-block text-sm font-medium text-gray-900 hover:underline">
            {t('createFirst')} →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {categories.map((cat, idx) => (
              <li key={cat.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Up"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === categories.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Down"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/admin/gallery/categories/${cat.id}`} className="font-medium text-gray-900 hover:underline">
                    {pickName(cat, locale)}
                  </Link>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <code className="bg-gray-100 px-1 rounded">{cat.slug}</code> · {t('imagesCount', { count: cat._count.images })}
                  </div>
                </div>

                <button
                  onClick={() => toggleVisible(cat)}
                  disabled={busy === cat.id}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    cat.isVisible
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {cat.isVisible ? t('visible') : t('hidden')}
                </button>

                <Link href={`/admin/gallery/categories/${cat.id}`} className="text-xs text-gray-700 hover:underline px-2">
                  {tCommon('edit')}
                </Link>
                <button
                  onClick={() => handleDelete(cat)}
                  disabled={busy === cat.id}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {tCommon('delete')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
