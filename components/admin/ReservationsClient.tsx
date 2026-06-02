'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Reservation, Table, ReservationStatus } from '@prisma/client'

type ReservationWithTable = Reservation & { table: Table }

const STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200',
  SEATED:    'bg-green-50 text-green-800 border-green-200',
  COMPLETED: 'bg-gray-50 text-gray-700 border-gray-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  NO_SHOW:   'bg-red-50 text-red-700 border-red-200',
}

const STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ReservationsClient({
  initialReservations,
  initialDate,
}: {
  initialReservations: ReservationWithTable[]
  initialDate: string
}) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate)
  const t = useTranslations('reservations')

  function handleDateChange(newDate: string) {
    setDate(newDate)
    router.push(`/admin/reservations?date=${newDate}`)
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) router.refresh()
  }

  const isToday = date === todayStr()
  const isTomorrow = date === tomorrowStr()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('onThisDay')}: {initialReservations.length}
          </p>
        </div>
        <Link
          href="/admin/reservations/new"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('newReservation')}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => handleDateChange(todayStr())}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isToday ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('today')}
        </button>
        <button
          onClick={() => handleDateChange(tomorrowStr())}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isTomorrow ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('tomorrow')}
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {initialReservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <svg className="mx-auto text-gray-300 mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p className="text-gray-500 text-sm">{t('empty')}</p>
          <Link href="/admin/reservations/new" className="inline-block mt-4 text-sm font-medium text-gray-900 hover:underline">
            {t('createFirst')} →
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">{t('columns.time')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.table')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.guest')}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('columns.guests')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.contacts')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.source')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {formatTime(r.startTime)}<span className="text-gray-400"> – {formatTime(r.endTime)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                        {r.table.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.guestName}</div>
                      {r.comment && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.comment}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{r.guestCount}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-sm">{r.guestPhone}</div>
                      <div className="text-xs text-gray-500">{r.guestEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t(`source.${r.source}`)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value as ReservationStatus)}
                        className={`text-xs px-2 py-1.5 rounded-md border cursor-pointer ${STATUS_COLORS[r.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{t(`status.${s}`)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {initialReservations.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-base">
                      {formatTime(r.startTime)}<span className="text-gray-400 font-normal"> – {formatTime(r.endTime)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {r.guestCount} {t('columns.guests').toLowerCase()} · {t(`source.${r.source}`)}
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[40px] h-8 px-2.5 rounded-md bg-gray-100 text-gray-800 text-sm font-medium">
                    {r.table.name}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="font-medium text-gray-900">{r.guestName}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{r.guestPhone}</div>
                  {r.guestEmail && !r.guestEmail.endsWith('@phone.local') && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{r.guestEmail}</div>
                  )}
                  {r.comment && <p className="text-xs text-gray-500 mt-2 italic">{r.comment}</p>}
                </div>
                <select
                  value={r.status}
                  onChange={(e) => updateStatus(r.id, e.target.value as ReservationStatus)}
                  className={`w-full text-sm px-3 py-2 rounded-lg border cursor-pointer ${STATUS_COLORS[r.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}
