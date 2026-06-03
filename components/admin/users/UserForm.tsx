'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

type Role = 'OWNER' | 'MANAGER' | 'STAFF'

type Initial = {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

const errorMessages: Record<string, string> = {
  EMAIL_TAKEN: 'emailTaken',
  CANNOT_CHANGE_OWN_ROLE: 'cannotChangeOwnRole',
  CANNOT_DEACTIVATE_SELF: 'cannotDeactivateSelf',
  LAST_OWNER: 'lastOwner',
}

export function UserForm({
  mode,
  initial,
  isSelf,
}: {
  mode: 'create' | 'edit'
  initial?: Initial
  isSelf?: boolean
}) {
  const t = useTranslations('users')
  const tUser = useTranslations('user')
  const router = useRouter()

  const [email, setEmail] = useState(initial?.email ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState<Role>(initial?.role ?? 'STAFF')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [password, setPassword] = useState('')
  const [resetPassword, setResetPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function decodeError(code?: string, fallbackKey = 'generic') {
    const key = code ? errorMessages[code] : undefined
    return key ? t(`errors.${key}`) : t(`errors.${fallbackKey}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)

    try {
      if (mode === 'create') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, role, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(decodeError(data.error, 'createGeneric'))
          setBusy(false)
          return
        }
        router.push('/admin/users')
        router.refresh()
      } else if (initial) {
        const body: Record<string, unknown> = { name }
        if (!isSelf) {
          body.role = role
          body.isActive = isActive
        }
        const res = await fetch(`/api/users/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(decodeError(data.error, 'updateGeneric'))
          setBusy(false)
          return
        }
        setSuccess(t('savedOk'))
        setBusy(false)
        router.refresh()
      }
    } catch {
      setError(t('errors.network'))
      setBusy(false)
    }
  }

  async function handlePasswordReset() {
    if (!initial) return
    if (resetPassword.length < 8) {
      setError(t('errors.passwordTooShort'))
      return
    }
    setError(null)
    setSuccess(null)
    setBusy(true)

    const res = await fetch(`/api/users/${initial.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(decodeError(data.error, 'updateGeneric'))
      setBusy(false)
      return
    }
    setResetPassword('')
    setSuccess(t('passwordResetOk'))
    setBusy(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-gray-500 hover:underline">
          ← {t('backToList')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {mode === 'create' ? t('addUser') : t('editUser')}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fieldEmail')}</label>
          <input
            type="email"
            required
            disabled={mode === 'edit'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          />
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">{t('emailNotEditable')}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('fieldName')} <span className="text-red-500">*</span>
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('fieldRole')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isSelf}
            className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          >
            <option value="STAFF">{tUser('staff')}</option>
            <option value="MANAGER">{tUser('manager')}</option>
            <option value="OWNER">{tUser('owner')}</option>
          </select>
          {isSelf && <p className="mt-1 text-xs text-gray-500">{t('roleSelfHint')}</p>}
        </div>

        {mode === 'create' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('fieldPassword')} <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">{t('passwordHint')}</p>
          </div>
        )}

        {mode === 'edit' && !isSelf && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">{t('fieldIsActive')}</span>
          </label>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Link
            href="/admin/users"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {mode === 'create' ? t('create') : t('save')}
          </button>
        </div>
      </form>

      {mode === 'edit' && initial && !isSelf && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900">{t('resetPasswordTitle')}</h2>
          <p className="text-sm text-gray-500">{t('resetPasswordHint')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              minLength={8}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder')}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={busy || resetPassword.length < 8}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
            >
              {t('resetPasswordAction')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
