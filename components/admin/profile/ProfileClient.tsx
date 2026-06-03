'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Initial = {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  locale: string
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

const errorMessages: Record<string, string> = {
  WRONG_CURRENT_PASSWORD: 'wrongCurrentPassword',
  SAME_PASSWORD: 'samePassword',
}

export function ProfileClient({ initial }: { initial: Initial }) {
  const t = useTranslations('profile')
  const tUsers = useTranslations('users')
  const tUser = useTranslations('user')
  const router = useRouter()

  const [name, setName] = useState(initial.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileOk, setProfileOk] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileOk(null)
    setBusy(true)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setProfileError(tUsers('errors.updateGeneric'))
      setBusy(false)
      return
    }
    setProfileOk(t('saveOk'))
    setBusy(false)
    router.refresh()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwOk(null)

    if (newPassword.length < 8) {
      setPwError(tUsers('errors.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('passwordMismatch'))
      return
    }

    setBusy(true)
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const key = errorMessages[data.error]
      setPwError(key ? t(key) : tUsers('errors.updateGeneric'))
      setBusy(false)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPwOk(t('passwordChangedOk'))
    setBusy(false)
  }

  const roleLabel =
    initial.role === 'OWNER' ? tUser('owner') :
    initial.role === 'MANAGER' ? tUser('manager') : tUser('staff')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <form onSubmit={saveProfile} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('accountSection')}</h2>

        {profileError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {profileError}
          </div>
        )}
        {profileOk && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {profileOk}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('email')}</label>
          <input value={initial.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('role')}</label>
          <input value={roleLabel} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">{t('passwordSection')}</h2>

        {pwError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pwError}</div>
        )}
        {pwOk && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{pwOk}</div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('currentPassword')}</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('newPassword')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">{t('passwordHint')}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('confirmPassword')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {t('changePassword')}
          </button>
        </div>
      </form>
    </div>
  )
}
