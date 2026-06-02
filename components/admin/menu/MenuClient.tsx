'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { pickName, pickDescription, pickLabel } from '@/lib/menu/i18n'
import { ALLERGEN_CODES } from '@/lib/menu/allergens'
import type { Locale } from '@/i18n/config'

type Variant = {
  id: string
  labelDE: string
  labelEN: string | null
  labelUK: string | null
  price: number | string
  position: number
}

type Item = {
  id: string
  categoryId: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  price: number | string | null
  imageUrl: string | null
  allergens: string[]
  isVegetarian: boolean
  isVegan: boolean
  spicyLevel: number
  isAvailable: boolean
  position: number
  variants: Variant[]
}

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  slug: string
  position: number
  isVisible: boolean
  items: Item[]
}

export function MenuClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('menu')
  const tCommon = useTranslations('common')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function toggleAvailable(item: Item) {
    setBusy(item.id)
    const res = await fetch(`/api/menu/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else setError('Error')
  }

  async function deleteItem(item: Item) {
    if (!confirm(t('confirmDeleteItem', { name: pickName(item, locale) }))) return
    setBusy(item.id)
    const res = await fetch(`/api/menu/items/${item.id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) router.refresh()
    else setError('Error')
  }

  function formatPrice(value: number | string | null): string {
    if (value == null) return '—'
    const n = typeof value === 'string' ? parseFloat(value) : value
    return `€${n.toFixed(2)}`
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('summary', {
              categories: initialCategories.length,
              items: initialCategories.reduce((sum, c) => sum + c.items.length, 0),
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/menu/categories"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('manageCategories')}
          </Link>
          <Link
            href="/admin/menu/items/new"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('newItem')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {initialCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">{t('empty')}</p>
          <Link
            href="/admin/menu/categories/new"
            className="inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            {t('createFirstCategory')} →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {initialCategories.map((cat) => (
            <section key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <header className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{pickName(cat, locale)}</h2>
                  {!cat.isVisible && (
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {t('hidden')}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">({cat.items.length})</span>
                </div>
                <Link
                  href={`/admin/menu/categories/${cat.id}`}
                  className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {tCommon('edit')}
                </Link>
              </header>

              {cat.items.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-sm text-gray-400">
                  {t('emptyCategory')}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {cat.items.map((item) => {
                    const itemName = pickName(item, locale)
                    const itemDesc = pickDescription(item, locale)
                    return (
                      <li
                        key={item.id}
                        className={`px-4 sm:px-6 py-4 flex gap-4 ${
                          !item.isAvailable ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Image */}
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={itemName}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-gray-900 truncate">{itemName}</h3>
                                {item.isVegan && (
                                  <span className="text-[10px] uppercase tracking-wide bg-green-50 text-green-800 px-1.5 py-0.5 rounded font-medium">
                                    Vegan
                                  </span>
                                )}
                                {!item.isVegan && item.isVegetarian && (
                                  <span className="text-[10px] uppercase tracking-wide bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                                    Veg
                                  </span>
                                )}
                                {item.spicyLevel > 0 && (
                                  <span className="text-xs">
                                    {'🌶️'.repeat(item.spicyLevel)}
                                  </span>
                                )}
                              </div>
                              {itemDesc && (
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{itemDesc}</p>
                              )}
                              {item.allergens.length > 0 && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {t('allergensLabel')}:{' '}
                                  {item.allergens
                                    .map((a) => ALLERGEN_CODES[a as keyof typeof ALLERGEN_CODES])
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right whitespace-nowrap">
                              {item.variants.length > 0 ? (
                                <div className="space-y-0.5">
                                  {item.variants.map((v) => (
                                    <div key={v.id} className="text-sm">
                                      <span className="text-gray-500 text-xs mr-1">
                                        {pickLabel(v, locale)}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {formatPrice(v.price)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="font-semibold text-gray-900">
                                  {formatPrice(item.price)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              onClick={() => toggleAvailable(item)}
                              disabled={busy === item.id}
                              className={`text-xs px-2.5 py-1 rounded-md border ${
                                item.isAvailable
                                  ? 'bg-green-50 text-green-800 border-green-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {item.isAvailable ? t('available') : t('notAvailable')}
                            </button>
                            <Link
                              href={`/admin/menu/items/${item.id}`}
                              className="text-xs text-gray-700 hover:underline px-2 py-1"
                            >
                              {tCommon('edit')}
                            </Link>
                            <button
                              onClick={() => deleteItem(item)}
                              disabled={busy === item.id}
                              className="text-xs text-red-600 hover:underline px-2 py-1 disabled:opacity-50"
                            >
                              {tCommon('delete')}
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
