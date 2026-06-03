import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { UserForm } from '@/components/admin/users/UserForm'

export const dynamic = 'force-dynamic'

export default async function NewUserPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  if (session.user.role !== 'OWNER') redirect('/admin/reservations')

  return (
    <ProtectedAdminPage>
      <UserForm mode="create" />
    </ProtectedAdminPage>
  )
}
