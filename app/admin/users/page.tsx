import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { UsersClient } from '@/components/admin/users/UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  if (session.user.role !== 'OWNER') redirect('/admin/reservations')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      locale: true,
      createdAt: true,
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <ProtectedAdminPage>
      <UsersClient users={serialized} currentUserId={session.user.id} />
    </ProtectedAdminPage>
  )
}
