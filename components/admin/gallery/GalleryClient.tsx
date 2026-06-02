'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { pickName } from '@/lib/menu/i18n'
import type { Locale } from '@/i18n/config'

type Image = {
  id: string
  url: string
  altDE: string | null
  altEN: string | null
  altUK: string | null
  isFeatured: boolean
  isVisible: boolean
  position: number
}

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  slug: string
  position: number
  isVisible: boolean
  images: Image[]
}

export function GalleryClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('gallery')
  const tCommon = useTranslations('common')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleFeatured(image: Image) {
    setBusy(image.id)
    const res = await fetch(`/api/gallery/${image.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured: !image.isFeatured }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
  }

  async function toggleVisible(image: Image) {
    setBusy(image.id)
    const res = await fetch(`/api/gallery/${image.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !image.isVisible }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
  }

  async function deleteImage(image: Image) {
    if (!confirm(t('confirmDeleteImage'))) return
    setBusy(image.id)
    const res = await fetch(`/api/gallery/${image.id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) router.refresh()
  }

  const totalImages = initialCategories.reduce((sum, c) => sum + c.images.length, 0)
  const featuredCount = initialCategories.reduce(
    (sum, c) => sum + c.images.filter((i) => i.isFeatured).length,
    0
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('summary', {
              categories: initialCategories.length,
              images: totalImages,
              featured: featuredCount,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/gallery/categories"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            {t('manageCategories')}
          </Link>
          <Link
            href="/admin/gallery/new"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addImage')}
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
          <p className="text-gray-500 text-sm mb-4">{t('noCategoriesYet')}</p>
          <Link
            href="/admin/gallery/categories/new"
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
                  <span className="text-xs text-gray-500">({cat.images.length})</span>
                </div>
                <Link
                  href={`/admin/gallery/categories/${cat.id}`}
                  className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {tCommon('edit')}
                </Link>
              </header>

              {cat.images.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-sm text-gray-400">
                  {t('emptyCategory')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                  {cat.images.map((img) => (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg overflow-hidden bg-gray-100 aspect-square ${
                        !img.isVisible ? 'opacity-40' : ''
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.altDE ?? ''}
                        className="w-full h-full object-cover"
                      />

                      {img.isFeatured && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                          ★ {t('featured')}
                        </span>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                        <button
                          onClick={() => toggleFeatured(img)}
                          disabled={busy === img.id}
                          className="bg-white/90 hover:bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-md w-full"
                        >
                          {img.isFeatured ? `★ ${t('unmarkFeatured')}` : `☆ ${t('markFeatured')}`}
                        </button>
                        <button
                          onClick={() => toggleVisible(img)}
                          disabled={busy === img.id}
                          className="bg-white/90 hover:bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-md w-full"
                        >
                          {img.isVisible ? t('hideAction') : t('showAction')}
                        </button>
                        <Link
                          href={`/admin/gallery/${img.id}`}
                          className="bg-white/90 hover:bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-md w-full text-center"
                        >
                          {tCommon('edit')}
                        </Link>
                        <button
                          onClick={() => deleteImage(img)}
                          disabled={busy === img.id}
                          className="bg-red-500/90 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-md w-full"
                        >
                          {tCommon('delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
