import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { GalleryClient } from '@/components/admin/gallery/GalleryClient'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const categories = await prisma.galleryCategory.findMany({
    orderBy: { position: 'asc' },
    include: {
      images: { orderBy: { position: 'asc' } },
    },
  })

  return (
    <ProtectedAdminPage>
      <GalleryClient initialCategories={JSON.parse(JSON.stringify(categories))} />
    </ProtectedAdminPage>
  )
}
