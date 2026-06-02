'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LangTabs } from '@/components/admin/menu/LangTabs'
import { slugify } from '@/lib/promotions'
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
}

interface Props {
  mode: 'create' | 'edit'
  initial?: Promotion
}

export function PromotionForm({ mode, initial }: Props) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('promotions.form')
  const tCommon = useTranslations('common')

  const today = new Date().toISOString().slice(0, 10)
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthStr = nextMonth.toISOString().slice(0, 10)

  const [form, setForm] = useState({
    titleDE: initial?.titleDE ?? '',
    titleEN: initial?.titleEN ?? '',
    titleUK: initial?.titleUK ?? '',
    descriptionDE: initial?.descriptionDE ?? '',
    descriptionEN: initial?.descriptionEN ?? '',
    descriptionUK: initial?.descriptionUK ?? '',
    slug: initial?.slug ?? '',
    imageUrl: initial?.imageUrl ?? '',
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : today,
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : nextMonthStr,
    daysOfWeek: initial?.daysOfWeek ?? [],
    startTime: initial?.startTime ?? '',
    endTime: initial?.endTime ?? '',
    isActive: initial?.isActive ?? true,
  })

  const [hasTimeRestriction, setHasTimeRestriction] = useState(
    !!(initial?.startTime || initial?.endTime)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleTitleDEChange(v: string) {
    setForm((f) => ({
      ...f,
      titleDE: v,
      slug: mode === 'create' && !initial ? slugify(v) : f.slug,
    }))
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      titleDE: form.titleDE,
      titleEN: form.titleEN || null,
      titleUK: form.titleUK || null,
      descriptionDE: form.descriptionDE || null,
      descriptionEN: form.descriptionEN || null,
      descriptionUK: form.descriptionUK || null,
      slug: form.slug,
      imageUrl: form.imageUrl || null,
      startDate: form.startDate,
      endDate: form.endDate,
      daysOfWeek: form.daysOfWeek,
      startTime: hasTimeRestriction ? form.startTime : null,
      endTime: hasTimeRestriction ? form.endTime : null,
      isActive: form.isActive,
    }

    const url = mode === 'create' ? '/api/promotions' : `/api/promotions/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error')
      return
    }

    router.push('/admin/promotions')
    router.refresh()
  }

  const dayLabels = {
    uk: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  }[locale]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
        <LangTabs
          values={{ de: form.titleDE, en: form.titleEN, uk: form.titleUK }}
          onChange={(lang, value) =>
            setForm({
              ...form,
              titleEN: lang === 'en' ? value : form.titleEN,
              titleUK: lang === 'uk' ? value : form.titleUK,
            })
          }
          onDEChange={handleTitleDEChange}
          label={t('title')}
          placeholder={{
            de: 'Mittagsmenü',
            en: 'Lunch menu',
            uk: 'Бізнес-ланч',
          }}
          requiredDE
        />

        <LangTabs
          values={{ de: form.descriptionDE, en: form.descriptionEN, uk: form.descriptionUK }}
          onChange={(lang, value) =>
            setForm({
              ...form,
              descriptionEN: lang === 'en' ? value : form.descriptionEN,
              descriptionUK: lang === 'uk' ? value : form.descriptionUK,
            })
          }
          onDEChange={(v) => setForm({ ...form, descriptionDE: v })}
          label={t('description')}
          multiline
          rows={3}
          requiredDE={false}
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
            placeholder="mittagsmenu"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            {t('imageUrl')}
          </label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="https://..."
            className={inputClass}
          />
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" className="mt-3 w-40 h-28 rounded-lg object-cover bg-gray-100" />
          )}
        </div>
      </div>

      {/* Period */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-700">{t('period')}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {t('startDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {t('endDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
              min={form.startDate}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            {t('daysOfWeek')}
            <span className="text-xs text-gray-400 font-normal ml-1">({t('daysOfWeekHint')})</span>
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {dayLabels.map((label, idx) => {
              const active = form.daysOfWeek.includes(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 min-w-[42px] py-2 rounded-lg text-sm font-medium transition-colors border ${
                    active
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasTimeRestriction}
            onChange={(e) => setHasTimeRestriction(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{t('timeRestriction')}</span>
        </label>

        {hasTimeRestriction && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('startTime')}</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('endTime')}</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{t('isActive')}</span>
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
