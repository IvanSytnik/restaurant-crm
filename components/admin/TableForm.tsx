'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Table } from '@prisma/client'

type Zone = 'INDOOR' | 'OUTDOOR' | 'TERRACE' | 'PRIVATE'

interface TableFormProps {
  mode: 'create' | 'edit'
  initial?: Table
}

export function TableForm({ mode, initial }: TableFormProps) {
  const router = useRouter()
  const t = useTranslations('tables.form')
  const tZone = useTranslations('floorPlan.zone')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    capacity: initial?.capacity ?? 2,
    minCapacity: initial?.minCapacity ?? 1,
    zone: (initial?.zone ?? 'INDOOR') as Zone,
    posX: initial?.posX ?? 50,
    posY: initial?.posY ?? 50,
    isActive: initial?.isActive ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.minCapacity > form.capacity) {
      setError(t('minMaxError'))
      setLoading(false)
      return
    }

    const url = mode === 'create' ? '/api/tables' : `/api/tables/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t('saveError'))
      return
    }

    router.push('/admin/tables')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
      <Field label={t('name')} required>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder={t('namePlaceholder')}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('minCapacity')} required>
          <input
            type="number"
            min={1}
            max={20}
            value={form.minCapacity}
            onChange={(e) => setForm({ ...form, minCapacity: parseInt(e.target.value) || 1 })}
            required
            className={inputClass}
          />
        </Field>

        <Field label={t('maxCapacity')} required>
          <input
            type="number"
            min={1}
            max={20}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t('zone')}>
        <select
          value={form.zone}
          onChange={(e) => setForm({ ...form, zone: e.target.value as Zone })}
          className={inputClass}
        >
          <option value="INDOOR">{tZone('INDOOR')}</option>
          <option value="OUTDOOR">{tZone('OUTDOOR')}</option>
          <option value="TERRACE">{tZone('TERRACE')}</option>
          <option value="PRIVATE">{tZone('PRIVATE')}</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('posX')}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.posX}
            onChange={(e) => setForm({ ...form, posX: parseFloat(e.target.value) || 0 })}
            className={inputClass}
          />
        </Field>

        <Field label={t('posY')}>
          <input
            type="number"
            min={0}
            max={100}
            value={form.posY}
            onChange={(e) => setForm({ ...form, posY: parseFloat(e.target.value) || 0 })}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">{t('isActive')}</span>
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
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
          className="flex-1 sm:flex-initial bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? tCommon('saving') : mode === 'create' ? t('createButton') : tCommon('save')}
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
