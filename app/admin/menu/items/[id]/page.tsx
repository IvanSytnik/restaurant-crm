import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ItemForm } from '@/components/admin/menu/ItemForm'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [item, categories] = await Promise.all([
    prisma.menuItem.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: 'asc' } } },
    }),
    prisma.menuCategory.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, nameDE: true, nameEN: true, nameUK: true },
    }),
  ])

  if (!item) notFound()

  const t = await getTranslations('menu.items')

  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('editItem', { name: item.nameDE })}
        </h1>
        <ItemForm
          mode="edit"
          categories={categories}
          initial={JSON.parse(JSON.stringify(item))}
        />
      </div>
    </ProtectedAdminPage>
  )
}
