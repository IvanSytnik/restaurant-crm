import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { TableForm } from '@/components/admin/TableForm'

export default async function EditTablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const table = await prisma.table.findUnique({ where: { id } })
  if (!table) notFound()

  const t = await getTranslations('tables.form')

  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('edit', { name: table.name })}
        </h1>
        <TableForm mode="edit" initial={table} />
      </div>
    </ProtectedAdminPage>
  )
}
