export interface DurationConfig {
  duration_1_2: number
  duration_3_4: number
  duration_5_plus: number
  buffer_minutes: number
}

const DEFAULT_CONFIG: DurationConfig = {
  duration_1_2: 60,
  duration_3_4: 90,
  duration_5_plus: 120,
  buffer_minutes: 15,
}

export function getGuestDuration(
  guestCount: number,
  config: Partial<DurationConfig> = {}
): number {
  const c = { ...DEFAULT_CONFIG, ...config }
  if (guestCount <= 2) return c.duration_1_2
  if (guestCount <= 4) return c.duration_3_4
  return c.duration_5_plus
}

export function getTableOccupiedDuration(
  guestCount: number,
  config: Partial<DurationConfig> = {}
): number {
  const c = { ...DEFAULT_CONFIG, ...config }
  return getGuestDuration(guestCount, c) + c.buffer_minutes
}

export function calculateBookingTimes(
  startTime: Date,
  guestCount: number,
  config: Partial<DurationConfig> = {}
): { endTime: Date; tableFreedAt: Date } {
  const guestMinutes = getGuestDuration(guestCount, config)
  const occupiedMinutes = getTableOccupiedDuration(guestCount, config)
  const endTime = new Date(startTime.getTime() + guestMinutes * 60_000)
  const tableFreedAt = new Date(startTime.getTime() + occupiedMinutes * 60_000)
  return { endTime, tableFreedAt }
}
