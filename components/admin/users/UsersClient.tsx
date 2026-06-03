'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'

type User = {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  isActive: boolean
  locale: string
  createdAt: string
}

const errorMessages: Record<string, string> = {
  EMAIL_TAKEN: 'emailTaken',
  CANNOT_CHANGE_OWN_ROLE: 'cannotChangeOwnRole',
  CANNOT_DEACTIVATE_SELF: 'cannotDeactivateSelf',
  LAST_OWNER: 'lastOwner',
  WRONG_CURRENT_PASSWORD: 'wrongCurrentPassword',
  SAME_PASSWORD: 'samePassword',
  HARD_DELETE_DISABLED: 'hardDeleteDisabled',
}

export function UsersClient({
  users,
  currentUserId,
}: {
  users: User[]
  currentUserId: string
}) {
  const t = useTranslations('users')
  const tUser = useTranslations('user')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function toggleActive(user: User) {
    setError(null)
    const msg = user.isActive
      ? t('confirmDeactivate', { email: user.email })
      : t('confirmActivate', { email: user.email })
    if (!confirm(msg)) return

    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const key = errorMessages[data.error]
      setError(key ? t(`errors.${key}`) : t('errors.generic'))
      return
    }

    startTransition(() => router.refresh())
  }

  const roleLabel = (role: string) => {
    if (role === 'OWNER') return tUser('owner')
    if (role === 'MANAGER') return tUser('manager')
    if (role === 'STAFF') return tUser('staff')
    return role
  }

  const roleBadgeClass = (role: string) => {
    if (role === 'OWNER') return 'bg-gray-900 text-white'
    if (role === 'MANAGER') return 'bg-gray-700 text-white'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 active:bg-black whitespace-nowrap"
        >
          {t('addUser')}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Desktop table */}
        <table className="hidden md:table w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t('colName')}</th>
              <th className="px-4 py-3 font-medium">{t('colEmail')}</th>
              <th className="px-4 py-3 font-medium">{t('colRole')}</th>
              <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
              <th className="px-4 py-3 font-medium">{t('colCreated')}</th>
              <th className="px-4 py-3 font-medium text-right">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId
              return (
                <tr key={u.id} className={u.isActive ? '' : 'bg-gray-50/60'}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600">
                        {t('you')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${roleBadgeClass(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-green-700">{t('statusActive')}</span>
                    ) : (
                      <span className="text-gray-400">{t('statusInactive')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-4">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sm font-medium text-gray-900 hover:underline"
                    >
                      {t('edit')}
                    </Link>
                    {!isSelf && (
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={isPending}
                        className="text-sm font-medium text-gray-600 hover:underline disabled:opacity-50"
                      >
                        {u.isActive ? t('deactivate') : t('activate')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {users.map((u) => {
            const isSelf = u.id === currentUserId
            return (
              <div key={u.id} className={`p-4 ${u.isActive ? '' : 'bg-gray-50/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      {u.name}
                      {isSelf && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600">
                          {t('you')}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-gray-600">{u.email}</div>
                  </div>
                  <span className={`shrink-0 inline-block rounded px-2 py-0.5 text-xs font-medium ${roleBadgeClass(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {u.isActive ? t('statusActive') : t('statusInactive')} ·{' '}
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-3 flex gap-4">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {t('edit')}
                  </Link>
                  {!isSelf && (
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={isPending}
                      className="text-sm font-medium text-gray-600 hover:underline disabled:opacity-50"
                    >
                      {u.isActive ? t('deactivate') : t('activate')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
