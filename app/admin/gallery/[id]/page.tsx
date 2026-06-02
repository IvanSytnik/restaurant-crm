import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ImageForm } from '@/components/admin/gallery/ImageForm'

export default async function EditGalleryImagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [image, categories] = await Promise.all([
    prisma.galleryImage.findUnique({ where: { id } }),
    prisma.galleryCategory.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, nameDE: true, nameEN: true, nameUK: true },
    }),
  ])

  if (!image) notFound()

  const t = await getTranslations('gallery.images')

  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('editImage')}
        </h1>
        <ImageForm mode="edit" categories={categories} initial={JSON.parse(JSON.stringify(image))} />
      </div>
    </ProtectedAdminPage>
  )
}
