import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { PromotionsClient } from '@/components/admin/promotions/PromotionsClient'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const showArchived = params.view === 'archived'

  const promotions = await prisma.promotion.findMany({
    where: showArchived ? { isArchived: true } : { isArchived: false },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <ProtectedAdminPage>
      <PromotionsClient
        initialPromotions={JSON.parse(JSON.stringify(promotions))}
        showArchived={showArchived}
      />
    </ProtectedAdminPage>
  )
}
