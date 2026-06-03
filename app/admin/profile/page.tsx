import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ProfileClient } from '@/components/admin/profile/ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/admin/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, locale: true },
  })

  if (!user) redirect('/admin/login')

  return (
    <ProtectedAdminPage>
      <ProfileClient initial={user} />
    </ProtectedAdminPage>
  )
}
