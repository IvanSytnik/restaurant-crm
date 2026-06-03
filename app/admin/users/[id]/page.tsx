import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { UserForm } from '@/components/admin/users/UserForm'

export const dynamic = 'force-dynamic'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  if (session.user.role !== 'OWNER') redirect('/admin/reservations')

  const user = await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  if (!user) notFound()

  return (
    <ProtectedAdminPage>
      <UserForm
        mode="edit"
        initial={{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        }}
        isSelf={session.user.id === user.id}
      />
    </ProtectedAdminPage>
  )
}
