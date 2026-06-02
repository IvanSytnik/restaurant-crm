import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { PromotionForm } from '@/components/admin/promotions/PromotionForm'

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const promotion = await prisma.promotion.findUnique({ where: { id } })
  if (!promotion) notFound()

  const t = await getTranslations('promotions')

  return (
    <ProtectedAdminPage>
      <div className="max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
          {t('editPromotion', { title: promotion.titleDE })}
        </h1>
        <PromotionForm mode="edit" initial={JSON.parse(JSON.stringify(promotion))} />
      </div>
    </ProtectedAdminPage>
  )
}
