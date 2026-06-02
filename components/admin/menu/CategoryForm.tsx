'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LangTabs } from './LangTabs'

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  slug: string
  isVisible: boolean
}

interface Props {
  mode: 'create' | 'edit'
  initial?: Category
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function CategoryForm({ mode, initial }: Props) {
  const router = useRouter()
  const t = useTranslations('menu.categories.form')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nameDE: initial?.nameDE ?? '',
    nameEN: initial?.nameEN ?? '',
    nameUK: initial?.nameUK ?? '',
    slug: initial?.slug ?? '',
    isVisible: initial?.isVisible ?? true,
  })

  // Автогенерация slug из nameDE при создании
  function handleNameDEChange(v: string) {
    setForm((f) => ({
      ...f,
      nameDE: v,
      slug: mode === 'create' && !initial ? slugify(v) : f.slug,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const url = mode === 'create' ? '/api/menu/categories' : `/api/menu/categories/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nameDE: form.nameDE,
        nameEN: form.nameEN || null,
        nameUK: form.nameUK || null,
        slug: form.slug,
        isVisible: form.isVisible,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error')
      return
    }

    router.push('/admin/menu/categories')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
      <LangTabs
        values={{ de: form.nameDE, en: form.nameEN, uk: form.nameUK }}
        onChange={(lang, value) =>
          setForm({
            ...form,
            nameDE: lang === 'de' ? value : form.nameDE,
            nameEN: lang === 'en' ? value : form.nameEN,
            nameUK: lang === 'uk' ? value : form.nameUK,
          })
        }
        onDEChange={handleNameDEChange}
        label={t('name')}
        placeholder={{
          de: 'Vorspeisen',
          en: 'Appetizers',
          uk: 'Закуски',
        }}
        requiredDE
      />

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          {t('slug')} <span className="text-red-500">*</span>
        </label>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          pattern="[a-z0-9-]+"
          placeholder="vorspeisen"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="text-xs text-gray-500 mt-1">{t('slugHint')}</p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">{t('isVisible')}</span>
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
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
