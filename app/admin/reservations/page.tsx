import { prisma } from '@/lib/prisma'
import { ReservationsClient } from '@/components/admin/ReservationsClient'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import type { ReservationStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const date = params.date || todayStr

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const reservations = await prisma.reservation.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
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
