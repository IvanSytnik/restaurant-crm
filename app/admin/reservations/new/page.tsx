import { getTranslations } from 'next-intl/server'
import { NewReservationForm } from '@/components/admin/NewReservationForm'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'

export default async function NewReservationPage() {
  const t = await getTranslations('reservations.form')
  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('title')}
        </h1>
        <NewReservationForm />
      </div>
    </ProtectedAdminPage>
  )
}
