import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { TablesClient } from '@/components/admin/TablesClient'

export const dynamic = 'force-dynamic'

export default async function TablesPage() {
  const tables = await prisma.table.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { reservations: true } },
    },
  })

  return (
    <ProtectedAdminPage>
      <TablesClient initialTables={tables} />
    </ProtectedAdminPage>
  )
}
