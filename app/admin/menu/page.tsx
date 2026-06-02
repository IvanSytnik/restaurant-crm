import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { MenuClient } from '@/components/admin/menu/MenuClient'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { position: 'asc' },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: { variants: { orderBy: { position: 'asc' } } },
      },
    },
  })

  return (
    <ProtectedAdminPage>
      <MenuClient initialCategories={JSON.parse(JSON.stringify(categories))} />
    </ProtectedAdminPage>
  )
}
