import { getTranslations } from 'next-intl/server'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { CategoryForm } from '@/components/admin/menu/CategoryForm'

export default async function NewCategoryPage() {
  const t = await getTranslations('menu.categories')
  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('newCategory')}
        </h1>
        <CategoryForm mode="create" />
      </div>
    </ProtectedAdminPage>
  )
}
