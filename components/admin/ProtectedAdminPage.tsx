import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminShell } from '@/components/admin/AdminShell'
import { defaultLocale, locales, type Locale } from '@/i18n/config'

export async function ProtectedAdminPage({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  // Получаем локаль пользователя из БД
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locale: true },
  })

  const userLocale: Locale =
    user?.locale && locales.includes(user.locale as Locale)
      ? (user.locale as Locale)
      : defaultLocale

  return (
    <AdminShell role={session.user.role} userName={session.user.name} locale={userLocale}>
      {children}
    </AdminShell>
  )
}
