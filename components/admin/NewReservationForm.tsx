'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Locale = 'de' | 'en' | 'uk'

export function NewReservationForm() {
  const router = useRouter()
  const today = todayStr()
  const t = useTranslations('reservations.form')
  const tCommon = useTranslations('common')

  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    guestCount: 2,
    date: today,
    time: '',
    comment: '',
    source: 'PHONE' as 'PHONE' | 'WALKIN' | 'ADMIN',
    locale: 'de' as Locale,
  })

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setSlotsLoading(true)
      try {
        const res = await fetch(`/api/availability?date=${form.date}&guestCount=${form.guestCount}`)
        if (res.ok) {
          const data = await res.json()
          setSlots(data.slots)
        }
      } finally {
        setSlotsLoading(false)
      }
    }
    load()
    setForm((f) => ({ ...f, time: '' }))
  }, [form.date, form.guestCount])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.time) {
      setError(t('selectTime'))
      return
    }

    setLoading(true)
    setError('')

    const startTime = new Date(`${form.date}T${form.time}:00`).toISOString()

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: form.guestName,
        guestEmail: form.guestEmail || `${form.guestPhone}@phone.local`,
        guestPhone: form.guestPhone,
        guestCount: form.guestCount,
        startTime,
        comment: form.comment,
        source: form.source,
        locale: form.locale,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t('createError'))
      return
    }

    router.push(`/admin/reservations?date=${form.date}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('guestName')} required>
          <input
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            required
            placeholder={t('guestNamePlaceholder')}
            className={inputClass}
          />
        </Field>
        <Field label={t('phone')} required>
          <input
            type="tel"
            value={form.guestPhone}
            onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
            required
            placeholder={t('phonePlaceholder')}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t('email')}>
        <input
          type="email"
          value={form.guestEmail}
          onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
          placeholder={t('emailPlaceholder')}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('date')} required>
          <input
            type="date"
            value={form.date}
            min={today}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className={inputClass}
          />
        </Field>
        <Field label={t('guestCount')} required>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, guestCount: n })}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  form.guestCount === n
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label={t('time')} required>
        {slotsLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">{t('noTimeAvailable')}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setForm({ ...form, time })}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  form.time === time
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('source')}>
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as 'PHONE' | 'WALKIN' | 'ADMIN' })}
            className={inputClass}
          >
            <option value="PHONE">{t('sourcePhone')}</option>
            <option value="WALKIN">{t('sourceWalkin')}</option>
            <option value="ADMIN">{t('sourceOther')}</option>
          </select>
        </Field>
        <Field label={t('emailLanguage')}>
          <select
            value={form.locale}
            onChange={(e) => setForm({ ...form, locale: e.target.value as Locale })}
            className={inputClass}
          >
            <option value="de">🇩🇪 Deutsch</option>
            <option value="en">🇬🇧 English</option>
            <option value="uk">🇺🇦 Українська</option>
          </select>
        </Field>
      </div>

      <Field label={t('comment')}>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={2}
          placeholder={t('commentPlaceholder')}
          className={inputClass}
        />
      </Field>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 bg-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || !form.time}
          className="flex-1 sm:flex-initial bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? tCommon('creating') : t('create')}
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
