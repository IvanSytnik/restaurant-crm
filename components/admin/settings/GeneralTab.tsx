'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ContactsMap, ContactKey } from '@/lib/contacts'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

const textareaClass = `${inputClass} resize-y min-h-[80px]`

export function GeneralTab({ initial }: { initial: ContactsMap }) {
  const t = useTranslations('settings.general')
  const [values, setValues] = useState<ContactsMap>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  function set(k: ContactKey, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setBusy(true)
    try {
      const res = await fetch('/api/settings/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        setError(t('saveError'))
        setBusy(false)
        return
      }
      const fresh = await res.json()
      setValues(fresh)
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

      {/* Branding */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('branding')}</h2>

        <Field label={`${t('name')} (DE) *`}>
          <input className={inputClass} value={values.name_de ?? ''} onChange={(e) => set('name_de', e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t('name')} (EN)`}>
            <input className={inputClass} value={values.name_en ?? ''} onChange={(e) => set('name_en', e.target.value)} />
          </Field>
          <Field label={`${t('name')} (UK)`}>
            <input className={inputClass} value={values.name_uk ?? ''} onChange={(e) => set('name_uk', e.target.value)} />
          </Field>
        </div>

        <Field label={`${t('tagline')} (DE)`} hint={t('taglineHint')}>
          <input className={inputClass} value={values.tagline_de ?? ''} onChange={(e) => set('tagline_de', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t('tagline')} (EN)`}>
            <input className={inputClass} value={values.tagline_en ?? ''} onChange={(e) => set('tagline_en', e.target.value)} />
          </Field>
          <Field label={`${t('tagline')} (UK)`}>
            <input className={inputClass} value={values.tagline_uk ?? ''} onChange={(e) => set('tagline_uk', e.target.value)} />
          </Field>
        </div>

        <Field label={`${t('description')} (DE)`} hint={t('descriptionHint')}>
          <textarea className={textareaClass} value={values.description_de ?? ''} onChange={(e) => set('description_de', e.target.value)} rows={4} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t('description')} (EN)`}>
            <textarea className={textareaClass} value={values.description_en ?? ''} onChange={(e) => set('description_en', e.target.value)} rows={4} />
          </Field>
          <Field label={`${t('description')} (UK)`}>
            <textarea className={textareaClass} value={values.description_uk ?? ''} onChange={(e) => set('description_uk', e.target.value)} rows={4} />
          </Field>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('address')}</h2>

        <Field label={t('addressLine')}>
          <input className={inputClass} value={values.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="Mariahilferstrasse 100" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('postalCode')}>
            <input className={inputClass} value={values.postal_code ?? ''} onChange={(e) => set('postal_code', e.target.value)} placeholder="1070" />
          </Field>
          <Field label={t('city')}>
            <input className={inputClass} value={values.city ?? ''} onChange={(e) => set('city', e.target.value)} placeholder="Wien" />
          </Field>
          <Field label={t('country')}>
            <input className={inputClass} value={values.country ?? ''} onChange={(e) => set('country', e.target.value)} placeholder="Österreich" />
          </Field>
        </div>
      </section>

      {/* Contacts */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('publicContacts')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('phone')}>
            <input className={inputClass} value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+43 1 234 5678" />
          </Field>
          <Field label={t('email')}>
            <input type="email" className={inputClass} value={values.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="info@restaurant.at" />
          </Field>
        </div>

        <Field label={t('mapsUrl')} hint={t('mapsUrlHint')}>
          <input type="url" className={inputClass} value={values.maps_url ?? ''} onChange={(e) => set('maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram">
            <input type="url" className={inputClass} value={values.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
          </Field>
          <Field label="Facebook">
            <input type="url" className={inputClass} value={values.facebook ?? ''} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
          </Field>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
