import { prisma } from '@/lib/prisma'

export interface BookingSettings {
  duration_1_2: number
  duration_3_4: number
  duration_5_plus: number
  buffer_minutes: number
  booking_horizon: number
  min_guests: number
  max_guests: number
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'duration_1_2',
          'duration_3_4',
          'duration_5_plus',
          'buffer_minutes',
          'booking_horizon',
          'min_guests',
          'max_guests',
        ],
      },
    },
  })

  const map = Object.fromEntries(rows.map((r) => [r.key, parseInt(r.value)]))

  return {
    duration_1_2: map['duration_1_2'] ?? 60,
    duration_3_4: map['duration_3_4'] ?? 90,
    duration_5_plus: map['duration_5_plus'] ?? 120,
    buffer_minutes: map['buffer_minutes'] ?? 15,
    booking_horizon: map['booking_horizon'] ?? 60,
    min_guests: map['min_guests'] ?? 1,
    max_guests: map['max_guests'] ?? 4,
  }
}
