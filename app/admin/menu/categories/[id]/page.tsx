import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { CategoryForm } from '@/components/admin/menu/CategoryForm'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await prisma.menuCategory.findUnique({ where: { id } })
  if (!category) notFound()

  const t = await getTranslations('menu.categories')

  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('editCategory', { name: category.nameDE })}
        </h1>
        <CategoryForm mode="edit" initial={category} />
      </div>
    </ProtectedAdminPage>
  )
}
