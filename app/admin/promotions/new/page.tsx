import { getTranslations } from 'next-intl/server'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { PromotionForm } from '@/components/admin/promotions/PromotionForm'

export default async function NewPromotionPage() {
  const t = await getTranslations('promotions')
  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('newPromotion')}
        </h1>
        <PromotionForm mode="create" />
      </div>
    </ProtectedAdminPage>
  )
}
