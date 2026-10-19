'use client'

import { useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiErrorMessage, readApiError } from '@/lib/api-error'
import { viennaIso, viennaToday } from '@/lib/public/vienna-time'

type Locale = 'de' | 'en' | 'uk'

/**
 * Placeholder address for guests who gave no email. Only digits and a leading
 * '+' survive, so "+43 664 123-45" becomes "+4366412345@phone.local", which
 * passes email validation (spaces and parentheses would not).
 * lib/email/send.ts skips every @phone.local address.
 */
function phonePlaceholderEmail(phone: string): string {
  const local = phone.trim().replace(/(?!^\+)[^\d]/g, '') || 'unknown'
  return `${local}@phone.local`
}

// Quick-pick buttons cover the common party sizes; anything up to maxGuests
// can be typed into the number field next to them.
const QUICK_PICKS = 4

export function NewReservationForm({ maxGuests }: { maxGuests: number }) {
  const router = useRouter()
  const today = viennaToday()
  const t = useTranslations('reservations.form')
  const tCommon = useTranslations('common')
  const tApi = useTranslations('apiErrors')

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

    // Slots are Vienna wall-clock times; never parse them in the device's TZ.
    const startTime = viennaIso(form.date, form.time)

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: form.guestName,
        guestEmail: form.guestEmail.trim() || phonePlaceholderEmail(form.guestPhone),
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
      setError(apiErrorMessage(tApi, await readApiError(res)))
      return
    }

    router.push(`/admin/reservations?date=${form.date}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field htmlFor="nr-guest-name" label={t('guestName')} required>
          <input
            id="nr-guest-name"
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            required
            placeholder={t('guestNamePlaceholder')}
            className={inputClass}
          />
        </Field>
        <Field htmlFor="nr-phone" label={t('phone')} required>
          <input
            id="nr-phone"
            type="tel"
            value={form.guestPhone}
            onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
            required
            placeholder={t('phonePlaceholder')}
            className={inputClass}
          />
        </Field>
      </div>

      <Field htmlFor="nr-email" label={t('email')}>
        <input
          id="nr-email"
          type="email"
          value={form.guestEmail}
          onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
          placeholder={t('emailPlaceholder')}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field htmlFor="nr-date" label={t('date')} required>
          <input
            id="nr-date"
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
            {Array.from({ length: Math.min(QUICK_PICKS, maxGuests) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, guestCount: n })}
                aria-pressed={form.guestCount === n}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  form.guestCount === n
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxGuests}
              value={form.guestCount}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                if (Number.isInteger(n) && n >= 1 && n <= maxGuests) {
                  setForm({ ...form, guestCount: n })
                }
              }}
              aria-label={t('guestCountExact', { max: maxGuests })}
              className="w-20 shrink-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
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
                aria-pressed={form.time === time}
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
        <Field htmlFor="nr-source" label={t('source')}>
          <select
            id="nr-source"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as 'PHONE' | 'WALKIN' | 'ADMIN' })}
            className={inputClass}
          >
            <option value="PHONE">{t('sourcePhone')}</option>
            <option value="WALKIN">{t('sourceWalkin')}</option>
            <option value="ADMIN">{t('sourceOther')}</option>
          </select>
        </Field>
        <Field htmlFor="nr-locale" label={t('emailLanguage')}>
          <select
            id="nr-locale"
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

      <Field htmlFor="nr-comment" label={t('comment')}>
        <textarea
          id="nr-comment"
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

/**
 * Labelled form row. With `htmlFor` the label is bound to that control; without
 * it (button groups) the row becomes a named group for assistive tech.
 */
function Field({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  htmlFor?: string
  children: React.ReactNode
}) {
  const groupLabelId = useId()
  const text = (
    <>
      {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
    </>
  )
  if (htmlFor) {
    return (
      <div>
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 mb-1.5 block">
          {text}
        </label>
        {children}
      </div>
    )
  }
  return (
    <div role="group" aria-labelledby={groupLabelId}>
      <span id={groupLabelId} className="text-sm font-medium text-gray-700 mb-1.5 block">
        {text}
      </span>
      {children}
    </div>
  )
}
