'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Table } from '@prisma/client'

type TableWithCount = Table & { _count: { reservations: number } }

export function TablesClient({ initialTables }: { initialTables: TableWithCount[] }) {
  const router = useRouter()
  const t = useTranslations('tables')
  const tZone = useTranslations('floorPlan.zone')
  const tCommon = useTranslations('common')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleActive(table: TableWithCount) {
    setBusy(table.id)
    setError(null)
    const res = await fetch(`/api/tables/${table.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !table.isActive }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else {
      const data = await res.json()
      setError(data.error)
    }
  }

  async function handleDelete(table: TableWithCount) {
    if (table._count.reservations > 0) {
      setError(t('deleteHasReservations', { name: table.name, count: table._count.reservations }))
      return
    }
    if (!confirm(t('deleteConfirm', { name: table.name }))) return

    setBusy(table.id)
    setError(null)
    const res = await fetch(`/api/tables/${table.id}`, { method: 'DELETE' })
    setBusy(null)

    if (res.ok) router.refresh()
    else {
      const data = await res.json()
      setError(data.error)
    }
  }

  const active = initialTables.filter((tb) => tb.isActive).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('summary', { total: initialTables.length, active })}
          </p>
        </div>
        <Link
          href="/admin/tables/new"
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('newTable')}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {initialTables.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">{t('empty')}</p>
          <Link href="/admin/tables/new" className="inline-block text-sm font-medium text-gray-900 hover:underline">
            {t('createFirst')} →
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">{t('columns.name')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.capacity')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.zone')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.historicalCount')}</th>
                  <th className="px-4 py-3 font-medium">{t('columns.status')}</th>
                  <th className="px-4 py-3 font-medium text-right">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialTables.map((tb) => (
                  <tr key={tb.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tables/${tb.id}`} className="font-medium text-gray-900 hover:underline">
                        {tb.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {t('capacity', { min: tb.minCapacity, max: tb.capacity })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tZone(tb.zone)}</td>
                    <td className="px-4 py-3 text-gray-700">{tb._count.reservations}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(tb)}
                        disabled={busy === tb.id}
                        className={`text-xs px-2.5 py-1 rounded-md border ${
                          tb.isActive
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {tb.isActive ? t('active') : t('inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link href={`/admin/tables/${tb.id}`} className="text-xs text-gray-700 hover:underline">
                        {tCommon('edit')}
                      </Link>
                      <button
                        onClick={() => handleDelete(tb)}
                        disabled={busy === tb.id}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        {tCommon('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {initialTables.map((tb) => (
              <div key={tb.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/admin/tables/${tb.id}`} className="font-semibold text-gray-900 text-base hover:underline">
                      {tb.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t('capacity', { min: tb.minCapacity, max: tb.capacity })} · {tZone(tb.zone)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(tb)}
                    disabled={busy === tb.id}
                    className={`text-xs px-2.5 py-1 rounded-md border ${
                      tb.isActive
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {tb.isActive ? t('active') : t('inactive')}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {t('columns.historicalCount')}: {tb._count.reservations}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/tables/${tb.id}`}
                    className="flex-1 text-center text-sm text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
                  >
                    {tCommon('edit')}
                  </Link>
                  <button
                    onClick={() => handleDelete(tb)}
                    disabled={busy === tb.id}
                    className="flex-1 text-sm text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    {tCommon('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
