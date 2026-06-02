import { getTranslations } from 'next-intl/server'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { GalleryCategoryForm } from '@/components/admin/gallery/GalleryCategoryForm'

export default async function NewGalleryCategoryPage() {
  const t = await getTranslations('gallery.categories')
  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('newCategory')}
        </h1>
        <GalleryCategoryForm mode="create" />
      </div>
    </ProtectedAdminPage>
  )
}
