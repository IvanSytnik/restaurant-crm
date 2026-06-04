import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProtectedAdminPage } from '@/components/admin/ProtectedAdminPage'
import { SettingsClient } from '@/components/admin/settings/SettingsClient'
import { getAllContacts } from '@/lib/contacts'
import { getBookingSettingsRaw } from '@/lib/settings-booking'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  if (session.user.role !== 'OWNER') redirect('/admin/reservations')

  const [contacts, booking, hoursRaw] = await Promise.all([
    getAllContacts(),
    getBookingSettingsRaw(),
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
  ])

  const hoursMap = new Map(hoursRaw.map((r) => [r.dayOfWeek, r]))
  const workingHours = Array.from({ length: 7 }, (_, day) => {
    const r = hoursMap.get(day)
    return {
      dayOfWeek: day,
      isOpen: r?.isOpen ?? false,
      openTime: r?.openTime ?? '11:00',
      closeTime: r?.closeTime ?? '23:00',
      lastBookingTime: r?.lastBookingTime ?? '21:30',
    }
  })

  return (
    <ProtectedAdminPage>
      <SettingsClient
        initialContacts={contacts}
        initialWorkingHours={workingHours}
        initialBooking={booking}
      />
    </ProtectedAdminPage>
  )
}
