'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type Locale } from '@/i18n/config'
import { pathForLocale } from '@/lib/public/locale'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysStr(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  locale: Locale
  minGuests: number
  maxGuests: number
  bookingHorizon: number
}

export function PublicBookingForm({ locale, minGuests, maxGuests, bookingHorizon }: Props) {
  const router = useRouter()
  const t = useTranslations('public.booking')
  const tErr = useTranslations('public.booking.error')

  const today = todayStr()
  const maxDate = addDaysStr(bookingHorizon)
  const defaultGuests = Math.min(Math.max(2, minGuests), maxGuests)

  // Captured once at mount; sent to server to verify min fill time.
  const [mountedAt] = useState(() => Date.now())

  const [form, setForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    guestCount: defaultGuests,
    date: today,
    time: '',
    comment: '',
    website: '', // honeypot
  })

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSlotsLoading(true)
      try {
        const res = await fetch(
          `/api/availability?date=${form.date}&guestCount=${form.guestCount}`
        )
        if (res.ok && !cancelled) {
          const data = await res.json()
          setSlots(data.slots)
        }
      } finally {
        if (!cancelled) setSlotsLoading(false)
      }
    }
    load()
    setForm((f) => ({ ...f, time: '' }))
    return () => {
      cancelled = true
    }
  }, [form.date, form.guestCount])

  async function refreshSlots() {
    try {
      const res = await fetch(
        `/api/availability?date=${form.date}&guestCount=${form.guestCount}`
      )
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots)
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.time) {
      setError(tErr('selectTime'))
      return
    }

    setLoading(true)
    setError('')

    // NOTE: same approach as the admin form — date+time interpreted in the
    // client's local timezone, then toISOString(). For an Austrian restaurant
    // with Austrian guests this works. Cross-timezone bookings will shift —
    // handled later via a Europe/Vienna-aware helper.
    const startTime = new Date(`${form.date}T${form.time}:00`).toISOString()

    let res: Response
    try {
      res = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: form.guestName.trim(),
          guestEmail: form.guestEmail.trim(),
          guestPhone: form.guestPhone.trim(),
          guestCount: form.guestCount,
          startTime,
          comment: form.comment.trim() || undefined,
          locale,
          website: form.website,
          mountedAt,
        }),
      })
    } catch {
      setLoading(false)
      setError(tErr('generic'))
      return
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        horizon?: number
        min?: number
        max?: number
      }
      setLoading(false)

      switch (data.error) {
        case 'TOO_MANY_REQUESTS':
          setError(tErr('tooMany'))
          break
        case 'TOO_FAST':
          setError(tErr('tooFast'))
          break
        case 'NO_TABLE_AVAILABLE':
          setError(tErr('noTable'))
          await refreshSlots()
          break
        case 'PAST_TIME':
          setError(tErr('pastTime'))
          await refreshSlots()
          break
        case 'BEYOND_HORIZON':
          setError(tErr('beyondHorizon', { days: data.horizon ?? bookingHorizon }))
          break
        case 'GUEST_COUNT_OUT_OF_RANGE':
          setError(tErr('guestCount', { min: data.min ?? minGuests, max: data.max ?? maxGuests }))
          break
        case 'VALIDATION_ERROR':
          setError(tErr('validation'))
          break
        default:
          setError(tErr('generic'))
      }
      return
    }

    const { id } = await res.json()
    router.push(pathForLocale(locale, `booking/success?id=${id}`))
  }

  const guestButtons: number[] = []
  for (let n = minGuests; n <= maxGuests; n++) guestButtons.push(n)

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-cream border border-[var(--border)] p-6 sm:p-10"
    >
      {/* Honeypot — visually hidden, present in DOM */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
      </div>

      {/* Date + guests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label={t('date')} required>
          <input
            type="date"
            value={form.date}
            min={today}
            max={maxDate}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
            className={inputClass}
          />
        </Field>

        <Field label={t('guestCount')} required>
          <div className="flex flex-wrap gap-2">
            {guestButtons.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm({ ...form, guestCount: n })}
                className={`min-w-[44px] px-3 py-2.5 border text-sm transition-colors ${
                  form.guestCount === n
                    ? 'border-ink bg-ink text-cream'
                    : 'border-[var(--border)] bg-cream text-ink hover:border-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {t('largerGroupsCall', { max: maxGuests })}
          </p>
        </Field>
      </div>

      {/* Time slots */}
      <Field label={t('time')} required>
        {slotsLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-11 bg-[var(--border)]/40 animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink-soft py-2">{t('noTime')}</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setForm({ ...form, time })}
                className={`py-2.5 border text-sm font-medium transition-colors ${
                  form.time === time
                    ? 'border-ink bg-ink text-cream'
                    : 'border-[var(--border)] bg-cream text-ink hover:border-ink'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* Contact info */}
      <div className="pt-2 border-t border-[var(--border)]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Field label={t('name')} required>
          <input
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            required
            placeholder={t('namePlaceholder')}
            className={inputClass}
            maxLength={100}
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
            maxLength={20}
          />
        </Field>
      </div>

      <Field label={t('email')} required>
        <input
          type="email"
          value={form.guestEmail}
          onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
          required
          placeholder={t('emailPlaceholder')}
          className={inputClass}
          maxLength={200}
        />
      </Field>

      <Field label={t('comment')}>
        <textarea
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          rows={3}
          placeholder={t('commentPlaceholder')}
          className={inputClass}
          maxLength={500}
        />
      </Field>

      {error && (
        <div
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading || !form.time}
          className="w-full sm:w-auto sm:min-w-[280px] bg-ink text-cream px-8 py-4 text-xs tracking-[0.25em] uppercase hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
        <p className="text-xs text-ink-soft">{t('privacyHint')}</p>
      </div>
    </form>
  )
}

const inputClass =
  'w-full border border-[var(--border)] bg-cream px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ink transition-colors'

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
      <label className="block text-[11px] tracking-widest uppercase text-ink-soft mb-2">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      {children}
    </div>
  )
}
