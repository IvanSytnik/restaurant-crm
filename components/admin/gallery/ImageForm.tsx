'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LangTabs } from '@/components/admin/menu/LangTabs'
import { pickName } from '@/lib/menu/i18n'
import type { Locale } from '@/i18n/config'

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
}

type Image = {
  id: string
  url: string
  altDE: string | null
  altEN: string | null
  altUK: string | null
  categoryId: string
  isFeatured: boolean
  isVisible: boolean
}

interface Props {
  mode: 'create' | 'edit'
  categories: Category[]
  initial?: Image
}

export function ImageForm({ mode, categories, initial }: Props) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('gallery.images.form')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    url: initial?.url ?? '',
    altDE: initial?.altDE ?? '',
    altEN: initial?.altEN ?? '',
    altUK: initial?.altUK ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    isFeatured: initial?.isFeatured ?? false,
    isVisible: initial?.isVisible ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url = mode === 'create' ? '/api/gallery' : `/api/gallery/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: form.url,
        altDE: form.altDE || null,
        altEN: form.altEN || null,
        altUK: form.altUK || null,
        categoryId: form.categoryId,
        isFeatured: form.isFeatured,
        isVisible: form.isVisible,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error')
      return
    }

    router.push('/admin/gallery')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            {t('imageUrl')} <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
            placeholder="https://..."
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">{t('urlHint')}</p>
          {form.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.url}
              alt=""
              className="mt-3 w-48 h-48 rounded-lg object-cover bg-gray-100"
            />
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            {t('category')} <span className="text-red-500">*</span>
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
            className={inputClass}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {pickName(cat, locale)}
              </option>
            ))}
          </select>
        </div>

        <LangTabs
          values={{ de: form.altDE, en: form.altEN, uk: form.altUK }}
          onChange={(lang, value) =>
            setForm({
              ...form,
              altEN: lang === 'en' ? value : form.altEN,
              altUK: lang === 'uk' ? value : form.altUK,
            })
          }
          onDEChange={(v) => setForm({ ...form, altDE: v })}
          label={t('alt')}
          placeholder={{
            de: 'Innenraum mit Holztischen',
            en: 'Interior with wooden tables',
            uk: "Інтер'єр з дерев'яними столами",
          }}
          requiredDE={false}
        />
        <p className="text-xs text-gray-500 -mt-3">{t('altHint')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">⭐ {t('isFeatured')}</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">{t('isFeaturedHint')}</p>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-100">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{t('isVisible')}</span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 bg-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-initial bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
