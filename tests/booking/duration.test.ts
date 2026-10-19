import { describe, expect, it } from 'vitest'
import { getGuestDuration, getTableOccupiedDuration } from '@/lib/booking/duration'

describe('getGuestDuration()', () => {
  it('uses the defaults by party size', () => {
    expect(getGuestDuration(1)).toBe(60)
    expect(getGuestDuration(2)).toBe(60)
    expect(getGuestDuration(3)).toBe(90)
    expect(getGuestDuration(4)).toBe(90)
    expect(getGuestDuration(5)).toBe(120)
    expect(getGuestDuration(12)).toBe(120)
  })

  it('applies configured durations', () => {
    const cfg = { duration_1_2: 45, duration_3_4: 75, duration_5_plus: 150 }
    expect(getGuestDuration(2, cfg)).toBe(45)
    expect(getGuestDuration(4, cfg)).toBe(75)
    expect(getGuestDuration(8, cfg)).toBe(150)
  })
})

describe('getTableOccupiedDuration()', () => {
  it('adds the cleaning buffer (15 min by default)', () => {
    expect(getTableOccupiedDuration(2)).toBe(75)
    expect(getTableOccupiedDuration(4)).toBe(105)
    expect(getTableOccupiedDuration(6)).toBe(135)
  })

  it('uses a configured buffer, including zero', () => {
    expect(getTableOccupiedDuration(2, { buffer_minutes: 30 })).toBe(90)
    expect(getTableOccupiedDuration(2, { buffer_minutes: 0 })).toBe(60)
  })
})
