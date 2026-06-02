import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { GalleryCategoriesClient } from '@/components/admin/gallery/GalleryCategoriesClient'

export const dynamic = 'force-dynamic'

export default async function GalleryCategoriesPage() {
  const categories = await prisma.galleryCategory.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { images: true } } },
  })

  return (
    <ProtectedAdminPage>
      <GalleryCategoriesClient initialCategories={categories} />
    </ProtectedAdminPage>
  )
}
