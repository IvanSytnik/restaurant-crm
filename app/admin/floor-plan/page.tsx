import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { FloorPlanClient } from '@/components/admin/FloorPlanClient'

export const dynamic = 'force-dynamic'

export default function FloorPlanPage() {
  return (
    <ProtectedAdminPage>
      <FloorPlanClient />
    </ProtectedAdminPage>
  )
}
