'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ContactsMap, ContactKey } from '@/lib/contacts'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

const textareaClass = `${inputClass} resize-y min-h-[120px] font-mono text-xs`

export function LegalTab({ initial }: { initial: ContactsMap }) {
  const t = useTranslations('settings.legal')
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>{t('disclaimerTitle')}</strong>
        <p className="mt-1">{t('disclaimerBody')}</p>
        <p className="mt-2">
          <a
            href="https://www.wko.at/service/wirtschaftsrecht-gewerberecht/musterimpressum.html"
            target="_blank"
            rel="noreferrer noopener"
            className="underline hover:text-amber-700"
          >
            {t('wkoLink')}
          </a>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{ok}</div>
      )}

      {/* Impressum structured fields */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('impressumTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('impressumHint')}</p>
        </div>

        <Field label={t('legalCompanyName')} hint={t('legalCompanyNameHint')}>
          <input className={inputClass} value={values.legal_company_name ?? ''} onChange={(e) => set('legal_company_name', e.target.value)} placeholder="Sytnik Gastro GmbH" />
        </Field>

        <Field label={t('legalOwner')}>
          <input className={inputClass} value={values.legal_owner_name ?? ''} onChange={(e) => set('legal_owner_name', e.target.value)} placeholder="Ivan Sytnik" />
        </Field>

        <Field label={t('legalAddress')}>
          <input className={inputClass} value={values.legal_address ?? ''} onChange={(e) => set('legal_address', e.target.value)} placeholder="Mariahilferstr. 100, 1070 Wien" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('legalFirmenbuch')}>
            <input className={inputClass} value={values.legal_firmenbuch ?? ''} onChange={(e) => set('legal_firmenbuch', e.target.value)} placeholder="FN 123456 a" />
          </Field>
          <Field label={t('legalFirmenbuchCourt')}>
            <input className={inputClass} value={values.legal_firmenbuch_court ?? ''} onChange={(e) => set('legal_firmenbuch_court', e.target.value)} placeholder="Handelsgericht Wien" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('legalUid')}>
            <input className={inputClass} value={values.legal_uid ?? ''} onChange={(e) => set('legal_uid', e.target.value)} placeholder="ATU12345678" />
          </Field>
          <Field label={t('legalGewerbe')}>
            <input className={inputClass} value={values.legal_gewerbe ?? ''} onChange={(e) => set('legal_gewerbe', e.target.value)} placeholder="Gastgewerbe" />
          </Field>
        </div>

        <Field label={t('legalChamber')}>
          <input className={inputClass} value={values.legal_chamber ?? ''} onChange={(e) => set('legal_chamber', e.target.value)} placeholder="WKO Wien, Fachgruppe Gastronomie" />
        </Field>

        <Field label={t('legalSupervisingAuthority')}>
          <input className={inputClass} value={values.legal_supervising_authority ?? ''} onChange={(e) => set('legal_supervising_authority', e.target.value)} placeholder="Magistrat der Stadt Wien" />
        </Field>
      </section>

      {/* Custom Impressum override */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('customImpressumTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('customImpressumHint')}</p>
        </div>

        <Field label="Impressum (DE)">
          <textarea className={textareaClass} value={values.impressum_text_de ?? ''} onChange={(e) => set('impressum_text_de', e.target.value)} rows={8} placeholder={t('customImpressumPlaceholder')} />
        </Field>
        <Field label="Impressum (EN)">
          <textarea className={textareaClass} value={values.impressum_text_en ?? ''} onChange={(e) => set('impressum_text_en', e.target.value)} rows={6} />
        </Field>
        <Field label="Impressum (UK)">
          <textarea className={textareaClass} value={values.impressum_text_uk ?? ''} onChange={(e) => set('impressum_text_uk', e.target.value)} rows={6} />
        </Field>
      </section>

      {/* DSGVO */}
      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('dsgvoTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('dsgvoHint')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('dpoName')}>
            <input className={inputClass} value={values.dpo_name ?? ''} onChange={(e) => set('dpo_name', e.target.value)} />
          </Field>
          <Field label={t('dpoContact')} hint={t('dpoContactHint')}>
            <input type="email" className={inputClass} value={values.dpo_contact ?? ''} onChange={(e) => set('dpo_contact', e.target.value)} placeholder="datenschutz@restaurant.at" />
          </Field>
        </div>

        <Field label="Datenschutzerklärung (DE) *" hint={t('privacyHint')}>
          <textarea className={textareaClass} value={values.privacy_text_de ?? ''} onChange={(e) => set('privacy_text_de', e.target.value)} rows={10} placeholder={t('privacyPlaceholder')} />
        </Field>
        <Field label="Privacy policy (EN)">
          <textarea className={textareaClass} value={values.privacy_text_en ?? ''} onChange={(e) => set('privacy_text_en', e.target.value)} rows={8} />
        </Field>
        <Field label="Політика приватності (UK)">
          <textarea className={textareaClass} value={values.privacy_text_uk ?? ''} onChange={(e) => set('privacy_text_uk', e.target.value)} rows={8} />
        </Field>
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
