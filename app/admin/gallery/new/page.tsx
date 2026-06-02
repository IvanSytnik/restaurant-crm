import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ImageForm } from '@/components/admin/gallery/ImageForm'

export default async function NewGalleryImagePage() {
  const categories = await prisma.galleryCategory.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, nameDE: true, nameEN: true, nameUK: true },
  })

  if (categories.length === 0) {
    redirect('/admin/gallery/categories/new')
  }

  const t = await getTranslations('gallery.images')

  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('newImage')}
        </h1>
        <ImageForm mode="create" categories={categories} />
      </div>
    </ProtectedAdminPage>
  )
}
