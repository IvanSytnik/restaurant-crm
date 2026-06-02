import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ItemForm } from '@/components/admin/menu/ItemForm'

export default async function NewItemPage() {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, nameDE: true, nameEN: true, nameUK: true },
  })

  if (categories.length === 0) {
    redirect('/admin/menu/categories/new')
  }

  const t = await getTranslations('menu.items')

  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('newItem')}
        </h1>
        <ItemForm mode="create" categories={categories} />
      </div>
    </ProtectedAdminPage>
  )
}
