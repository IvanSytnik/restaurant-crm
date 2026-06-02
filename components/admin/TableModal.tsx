'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Reservation } from '@prisma/client'
import type { TableWithStatus } from './FloorPlanClient'

type Tab = 'info' | 'walkin'

export function TableModal({
  table,
  onClose,
  onAction,
}: {
  table: TableWithStatus
  onClose: () => void
  onAction: () => void
}) {
  const t = useTranslations('floorPlan.modal')
  const tZone = useTranslations('floorPlan.zone')
  const [tab, setTab] = useState<Tab>(table.status === 'FREE' ? 'walkin' : 'info')

  const canWalkin = table.isActive && table.status !== 'OCCUPIED'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('table')} {table.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {table.minCapacity}–{table.capacity} {t('seats')} · {tZone(table.zone)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 rounded-lg hover:bg-gray-100 active:bg-gray-200" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-2 border-b border-gray-200">
          <TabButton active={tab === 'info'} onClick={() => setTab('info')}>{t('tabInfo')}</TabButton>
          <TabButton active={tab === 'walkin'} onClick={() => canWalkin && setTab('walkin')} disabled={!canWalkin}>
            {t('tabWalkin')}
          </TabButton>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'info' ? <InfoTab table={table} /> : <WalkinTab table={table} onSuccess={onAction} />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ children, active, disabled, onClick }: { children: React.ReactNode; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

function InfoTab({ table }: { table: TableWithStatus }) {
  const t = useTranslations('floorPlan.modal')
  const tCommon = useTranslations('common')
  const { currentReservation, soonReservation, upcomingReservations } = table

  if (table.status === 'INACTIVE') {
    return (
      <div className="px-5 py-8 text-center text-sm text-gray-500">
        {t('inactive')}{' '}
        <a href="/admin/tables" className="text-gray-900 underline">{t('tables')}</a>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {currentReservation && (
        <Section title={t('nowSeated')}>
          <ReservationCard r={currentReservation} highlight="red" />
        </Section>
      )}
      {soonReservation && (
        <Section title={t('soonReservation')}>
          <ReservationCard r={soonReservation} highlight="amber" />
        </Section>
      )}
      {upcomingReservations.length > 0 && (
        <Section title={`${t('upcomingToday')} (${upcomingReservations.length})`}>
          <div className="space-y-2">
            {upcomingReservations.map((r) => <ReservationCard key={r.id} r={r} />)}
          </div>
        </Section>
      )}
      {!currentReservation && !soonReservation && upcomingReservations.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">{t('noReservations')}</div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function ReservationCard({ r, highlight }: { r: Reservation; highlight?: 'red' | 'amber' }) {
  const bg =
    highlight === 'red' ? 'bg-red-50 border-red-200' :
    highlight === 'amber' ? 'bg-amber-50 border-amber-200' :
    'bg-gray-50 border-gray-200'

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${bg}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-900 text-sm">
          {formatTime(r.startTime)} – {formatTime(r.endTime)}
        </div>
        <div className="text-xs text-gray-500">{r.guestCount}</div>
      </div>
      <div className="text-sm text-gray-700 mt-1">{r.guestName}</div>
      {r.guestPhone && r.guestPhone !== '-' && <div className="text-xs text-gray-500 mt-0.5">{r.guestPhone}</div>}
      {r.comment && <div className="text-xs text-gray-500 mt-1 italic">{r.comment}</div>}
    </div>
  )
}

function WalkinTab({ table, onSuccess }: { table: TableWithStatus; onSuccess: () => void }) {
  const t = useTranslations('floorPlan.modal')
  const maxGuests = table.capacity
  const minGuests = table.minCapacity

  const [guestCount, setGuestCount] = useState(Math.max(minGuests, 2))
  const [guestName, setGuestName] = useState('')
  const [duration, setDuration] = useState(() => (Math.max(minGuests, 2) <= 2 ? 60 : 90))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const guestOptions: number[] = []
  for (let i = minGuests; i <= maxGuests; i++) guestOptions.push(i)

  async function handleSeat() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/reservations/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: table.id,
        guestName: guestName || undefined,
        guestCount,
        durationMinutes: duration,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error')
      return
    }

    onSuccess()
  }

  return (
    <div className="px-5 py-4 space-y-4">
      <div className="text-sm text-gray-600">
        {t('walkinDescription')}{' '}
        <span className="font-medium text-gray-900">{t('walkinSeated')}</span>.
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('guestCount')}</label>
        <div className="flex gap-2 flex-wrap">
          {guestOptions.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setGuestCount(n)}
              className={`flex-1 min-w-[50px] rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                guestCount === n
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('guestName')}</label>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Walk-in"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('duration')}</label>
        <div className="flex gap-2">
          {[60, 90, 120, 150].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                duration === m
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={handleSeat}
        disabled={loading}
        className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t('seating') : t('seatButton')}
      </button>
    </div>
  )
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}
