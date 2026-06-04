'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Booking = {
  duration_1_2: number
  duration_3_4: number
  duration_5_plus: number
  buffer_minutes: number
  booking_horizon: number
  min_guests: number
  max_guests: number
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

export function BookingTab({ initial }: { initial: Booking }) {
  const t = useTranslations('settings.booking')
  const [values, setValues] = useState<Booking>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  function set(k: keyof Booking, v: number) {
    setValues((prev) => ({ ...prev, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setBusy(true)
    try {
      const res = await fetch('/api/settings/booking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error === 'MIN_GT_MAX') setError(t('errors.minGtMax'))
        else if (data.error === 'OUT_OF_RANGE') setError(t('errors.outOfRange', { key: data.key, min: data.min, max: data.max }))
        else setError(t('saveError'))
        setBusy(false)
        return
      }
      setValues(data)
      setOk(t('saveOk'))
      setBusy(false)
    } catch {
      setError(t('networkError'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{ok}</div>
      )}

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('durations')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('durationsHint')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumField label={t('duration12')} suffix={t('minutes')} value={values.duration_1_2} onChange={(v) => set('duration_1_2', v)} />
          <NumField label={t('duration34')} suffix={t('minutes')} value={values.duration_3_4} onChange={(v) => set('duration_3_4', v)} />
          <NumField label={t('duration5plus')} suffix={t('minutes')} value={values.duration_5_plus} onChange={(v) => set('duration_5_plus', v)} />
        </div>

        <NumField label={t('buffer')} hint={t('bufferHint')} suffix={t('minutes')} value={values.buffer_minutes} onChange={(v) => set('buffer_minutes', v)} />
      </section>

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('limits')}</h2>

        <NumField label={t('horizon')} hint={t('horizonHint')} suffix={t('days')} value={values.booking_horizon} onChange={(v) => set('booking_horizon', v)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <NumField label={t('minGuests')} suffix={t('guests')} value={values.min_guests} onChange={(v) => set('min_guests', v)} />
          <NumField label={t('maxGuests')} hint={t('maxGuestsHint')} suffix={t('guests')} value={values.max_guests} onChange={(v) => set('max_guests', v)} />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  )
}

function NumField({
  label,
  hint,
  suffix,
  value,
  onChange,
}: {
  label: string
  hint?: string
  suffix?: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          className={inputClass + (suffix ? ' pr-16' : '')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
