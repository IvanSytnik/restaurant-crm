'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { Reservation, Table } from '@prisma/client'
import { TableModal } from './TableModal'

export type TableStatus = 'FREE' | 'SOON' | 'OCCUPIED' | 'INACTIVE'

export interface TableWithStatus extends Table {
  status: TableStatus
  currentReservation: Reservation | null
  soonReservation: Reservation | null
  upcomingReservations: Reservation[]
}

const STATUS_STYLES: Record<TableStatus, { bg: string; border: string; text: string }> = {
  FREE:     { bg: 'bg-green-100',  border: 'border-green-400',  text: 'text-green-900' },
  SOON:     { bg: 'bg-amber-100',  border: 'border-amber-400',  text: 'text-amber-900' },
  OCCUPIED: { bg: 'bg-red-100',    border: 'border-red-400',    text: 'text-red-900' },
  INACTIVE: { bg: 'bg-gray-100',   border: 'border-gray-300',   text: 'text-gray-500' },
}

export function FloorPlanClient() {
  const [tables, setTables] = useState<TableWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const t = useTranslations('floorPlan')
  const tCommon = useTranslations('common')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/floor-status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTables(data.tables)
        setLastUpdate(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const counters = tables.reduce(
    (acc, tb) => {
      acc[tb.status]++
      return acc
    },
    { FREE: 0, SOON: 0, OCCUPIED: 0, INACTIVE: 0 } as Record<TableStatus, number>
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('updated')}: {lastUpdate.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            <span className="text-gray-400"> · {t('autoRefresh')}</span>
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {tCommon('refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Counter label={t('counters.free')}     value={counters.FREE}     color="green" />
        <Counter label={t('counters.soon')}     value={counters.SOON}     color="amber" />
        <Counter label={t('counters.occupied')} value={counters.OCCUPIED} color="red"   />
        <Counter label={t('counters.inactive')} value={counters.INACTIVE} color="gray"  />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="text-xs text-gray-500 mb-3">{t('hint')}</div>

        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm">
            {tCommon('loading')}
          </div>
        ) : tables.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm">
            {t('noTables')}.{' '}
            <a href="/admin/tables" className="ml-1 text-gray-700 underline">
              {t('createTable')} →
            </a>
          </div>
        ) : (
          <div
            className="relative bg-gray-50 rounded-lg border border-dashed border-gray-200 overflow-hidden"
            style={{ aspectRatio: '16 / 9', minHeight: '400px' }}
          >
            {tables.map((tb) => {
              const style = STATUS_STYLES[tb.status]
              const statusLabel = t(`status.${tb.status}`)
              return (
                <button
                  key={tb.id}
                  onClick={() => setSelectedTable(tb)}
                  className={`
                    absolute -translate-x-1/2 -translate-y-1/2
                    flex flex-col items-center justify-center
                    rounded-2xl border-2 transition-all hover:scale-110 hover:shadow-lg
                    ${style.bg} ${style.border} ${style.text}
                  `}
                  style={{ left: `${tb.posX}%`, top: `${tb.posY}%`, width: '88px', height: '88px' }}
                >
                  <span className="font-bold text-lg leading-none">{tb.name}</span>
                  <span className="text-[11px] mt-1 opacity-80">
                    {tb.minCapacity}–{tb.capacity}
                  </span>
                  {tb.status !== 'INACTIVE' && tb.status !== 'FREE' && (
                    <span className="text-[10px] mt-1 font-medium uppercase tracking-wide">
                      {statusLabel}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-600">
          <LegendDot color="bg-green-100 border-green-400" label={t('legend.free')} />
          <LegendDot color="bg-amber-100 border-amber-400" label={t('legend.soon')} />
          <LegendDot color="bg-red-100 border-red-400"     label={t('legend.occupied')} />
          <LegendDot color="bg-gray-100 border-gray-300"   label={t('legend.inactive')} />
        </div>
      </div>

      {selectedTable && (
        <TableModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onAction={() => {
            setSelectedTable(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function Counter({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'green' | 'amber' | 'red' | 'gray'
}) {
  const colorMap = {
    green: 'text-green-700 bg-green-50',
    amber: 'text-amber-700 bg-amber-50',
    red:   'text-red-700 bg-red-50',
    gray:  'text-gray-700 bg-gray-50',
  }
  return (
    <div className={`rounded-xl px-4 py-3 ${colorMap[color]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded border ${color}`} />
      <span>{label}</span>
    </div>
  )
}
