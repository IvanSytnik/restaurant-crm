import { getTranslations } from 'next-intl/server'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { TableForm } from '@/components/admin/TableForm'

export default async function NewTablePage() {
  const t = await getTranslations('tables.form')
  return (
    <ProtectedAdminPage>
      <div className="max-w-xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('create')}
        </h1>
        <TableForm mode="create" />
      </div>
    </ProtectedAdminPage>
  )
}
