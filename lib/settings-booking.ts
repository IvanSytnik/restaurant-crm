import { prisma } from '@/lib/prisma'

/**
 * Booking settings stored as integer values in the Setting model.
 * Single source of the keys, defaults and limits — lib/booking/settings.ts
 * reads through getBookingSettingsRaw().
 */

/** Largest party any endpoint accepts; also the maximum table capacity. */
export const MAX_PARTY_SIZE = 20

export const BOOKING_KEYS = [
  'duration_1_2',
  'duration_3_4',
  'duration_5_plus',
  'buffer_minutes',
  'booking_horizon',
  'min_guests',
  'max_guests',
] as const

export type BookingKey = (typeof BOOKING_KEYS)[number]

export const BOOKING_DEFAULTS: Record<BookingKey, number> = {
  duration_1_2: 60,
  duration_3_4: 90,
  duration_5_plus: 120,
  buffer_minutes: 15,
  booking_horizon: 60,
  min_guests: 1,
  max_guests: 4,
}

export const BOOKING_LIMITS: Record<BookingKey, { min: number; max: number }> = {
  duration_1_2: { min: 15, max: 480 },
  duration_3_4: { min: 15, max: 480 },
  duration_5_plus: { min: 15, max: 480 },
  buffer_minutes: { min: 0, max: 120 },
  booking_horizon: { min: 1, max: 365 },
  min_guests: { min: 1, max: MAX_PARTY_SIZE },
  max_guests: { min: 1, max: MAX_PARTY_SIZE },
}

export async function getBookingSettingsRaw(): Promise<Record<BookingKey, number>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...BOOKING_KEYS] } },
  })
  const map: Record<string, number> = {}
  for (const row of rows) {
    const n = parseInt(row.value, 10)
    if (!Number.isNaN(n)) map[row.key] = n
  }
  const result = { ...BOOKING_DEFAULTS } as Record<BookingKey, number>
  for (const k of BOOKING_KEYS) {
    if (typeof map[k] === 'number') result[k] = map[k]
  }
  return result
}
