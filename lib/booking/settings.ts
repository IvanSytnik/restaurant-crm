import { getBookingSettingsRaw, type BookingKey } from '@/lib/settings-booking'

export type BookingSettings = Record<BookingKey, number>

/**
 * Booking tunables (durations, buffer, horizon, guest range) with defaults
 * from lib/settings-booking.ts applied for missing or non-numeric rows.
 */
export async function getBookingSettings(): Promise<BookingSettings> {
  return getBookingSettingsRaw()
}
