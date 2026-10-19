import { prisma } from '@/lib/prisma'
import { ReservationsClient } from '@/components/admin/ReservationsClient'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { ReservationStatus } from '@prisma/client'
import { viennaDayRange, viennaToday } from '@/lib/public/vienna-time'

export const dynamic = 'force-dynamic'

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>
}) {
  const params = await searchParams
  // The list shows one Vienna calendar day, whatever the server's timezone.
  const isValidDate = (d?: string): d is string =>
    !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`))
  const date = isValidDate(params.date) ? params.date : viennaToday()
  const { start: dayStart, end: dayEnd } = viennaDayRange(date)
  // Ignore unknown status values instead of passing them to Prisma.
  const status = Object.values(ReservationStatus).find((s) => s === params.status)

  const reservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: dayStart, lt: dayEnd },
      ...(status && { status }),
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
