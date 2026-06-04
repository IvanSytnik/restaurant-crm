'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Row = {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
  lastBookingTime: string
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400'

export function WorkingHoursTab({ initial }: { initial: Row[] }) {
  const t = useTranslations('settings.hours')
  const tDays = useTranslations('settings.days')

  const [rows, setRows] = useState<Row[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  function updateRow(day: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setBusy(true)
    try {
      const res = await fetch('/api/settings/working-hours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const code = data.error
        const day = typeof data.dayOfWeek === 'number' ? tDays(String(data.dayOfWeek)) : ''
        if (code === 'INVALID_RANGE') setError(`${t('errors.invalidRange')}${day ? ` (${day})` : ''}`)
        else if (code === 'INVALID_LAST_BOOKING') setError(`${t('errors.invalidLastBooking')}${day ? ` (${day})` : ''}`)
        else setError(t('saveError'))
        setBusy(false)
        return
      }
      setOk(t('saveOk'))
      setBusy(false)
    } catch {
      setError(t('networkError'))
      setBusy(false)
    }
  }

  // Display order: Monday first
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]

  return (
    <form onSubmit={save} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{ok}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header (desktop) */}
        <div className="hidden md:grid grid-cols-[160px_100px_1fr_1fr_1fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs uppercase text-gray-500">
          <div>{t('day')}</div>
          <div>{t('open')}</div>
          <div>{t('from')}</div>
          <div>{t('to')}</div>
          <div>{t('lastBooking')}</div>
        </div>

        <div className="divide-y divide-gray-100">
          {orderedDays.map((day) => {
            const row = rows.find((r) => r.dayOfWeek === day)!
            return (
              <div key={day} className="grid grid-cols-1 md:grid-cols-[160px_100px_1fr_1fr_1fr] gap-3 md:gap-4 p-5">
                <div className="font-medium text-gray-900">{tDays(String(day))}</div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.isOpen}
                    onChange={(e) => updateRow(day, { isOpen: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-600 md:hidden">{t('open')}</span>
                  <span className="text-sm text-gray-600 hidden md:inline">
                    {row.isOpen ? t('open') : t('closed')}
                  </span>
                </label>

                <div className="md:contents grid grid-cols-3 gap-2">
                  <FieldInline label={t('from')}>
                    <input
                      type="time"
                      value={row.openTime}
                      disabled={!row.isOpen}
                      onChange={(e) => updateRow(day, { openTime: e.target.value })}
                      className={inputClass}
                    />
                  </FieldInline>
                  <FieldInline label={t('to')}>
                    <input
                      type="time"
                      value={row.closeTime}
                      disabled={!row.isOpen}
                      onChange={(e) => updateRow(day, { closeTime: e.target.value })}
                      className={inputClass}
                    />
                  </FieldInline>
                  <FieldInline label={t('lastBooking')}>
                    <input
                      type="time"
                      value={row.lastBookingTime}
                      disabled={!row.isOpen}
                      onChange={(e) => updateRow(day, { lastBookingTime: e.target.value })}
                      className={inputClass}
                    />
                  </FieldInline>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500">{t('lastBookingHint')}</p>

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

function FieldInline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-gray-500 md:hidden">{label}</span>
      {children}
    </div>
  )
}
