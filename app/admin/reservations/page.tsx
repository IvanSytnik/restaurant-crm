import { prisma } from '@/lib/prisma'
import { ReservationsClient } from '@/components/admin/ReservationsClient'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import type { ReservationStatus } from '@prisma/client'
import { viennaDayRange, viennaToday } from '@/lib/public/vienna-time'

export const dynamic = 'force-dynamic'

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>
}) {
  const params = await searchParams
  // The list shows one Vienna calendar day, whatever the server's timezone.
  const date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : viennaToday()
  const { start: dayStart, end: dayEnd } = viennaDayRange(date)

  const reservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: dayStart, lt: dayEnd },
      ...(params.status && { status: params.status as ReservationStatus }),
    },
    include: { table: true },
    orderBy: { startTime: 'asc' },
  })

  return (
    <ProtectedAdminPage>
      <ReservationsClient initialReservations={reservations} initialDate={date} />
    </ProtectedAdminPage>
  )
}
