import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/admin/AdminShell'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import { pickName } from '@/lib/menu/i18n'

export async function ProtectedAdminPage({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  // User's locale from the DB, and the restaurant name (Contact key/value
  // rows) for the sidebar header.
  const [user, nameRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    }),
    prisma.contact.findMany({
      where: { key: { in: ['name_de', 'name_en', 'name_uk'] } },
      select: { key: true, value: true },
    }),
  ])

  const userLocale: Locale =
    user?.locale && locales.includes(user.locale as Locale)
      ? (user.locale as Locale)
      : defaultLocale

  const names = Object.fromEntries(nameRows.map((r) => [r.key, r.value]))
  const restaurantName =
    pickName({ nameDE: names.name_de ?? '', nameEN: names.name_en, nameUK: names.name_uk }, userLocale) ||
    'Restaurant CRM'

  return (
    <AdminShell
      role={session.user.role}
      userName={session.user.name}
      locale={userLocale}
      restaurantName={restaurantName}
    >
      {children}
    </AdminShell>
  )
}
