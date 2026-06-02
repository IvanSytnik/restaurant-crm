import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { GalleryCategoryForm } from '@/components/admin/gallery/GalleryCategoryForm'

export default async function EditGalleryCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await prisma.galleryCategory.findUnique({ where: { id } })
  if (!category) notFound()

  const t = await getTranslations('gallery.categories')

  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('editCategory', { name: category.nameDE })}
        </h1>
        <GalleryCategoryForm mode="edit" initial={category} />
      </div>
    </ProtectedAdminPage>
  )
}
