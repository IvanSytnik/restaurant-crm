import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { CategoriesClient } from '@/components/admin/menu/CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { items: true } } },
  })

  return (
    <ProtectedAdminPage>
      <CategoriesClient initialCategories={categories} />
    </ProtectedAdminPage>
  )
}
