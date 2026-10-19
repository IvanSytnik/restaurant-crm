import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatViennaDate,
  formatViennaTime,
  viennaDateColumn,
  viennaDayOfWeek,
  viennaDayRange,
  viennaIso,
} from '@/lib/public/vienna-time'
import { checkPublicSlot, viennaWeekdayOf } from '@/lib/booking/slots'

// DST in 2026: forward on Sun 29 March (02:00 → 03:00),
// back on Sun 25 October (03:00 → 02:00).

describe('test environment', () => {
  it('runs with a host timezone that is neither UTC nor Vienna', () => {
    // vitest.config.ts sets TZ=America/New_York (UTC-5 in January)
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(300)
  })
})

describe('viennaIso()', () => {
  it('converts winter and summer wall-clock times', () => {
    expect(viennaIso('2026-01-07', '15:00')).toBe('2026-01-07T14:00:00.000Z')
    expect(viennaIso('2026-06-07', '15:00')).toBe('2026-06-07T13:00:00.000Z')
  })

  it('handles the spring-forward day (last Sunday of March)', () => {
    expect(viennaIso('2026-03-29', '00:00')).toBe('2026-03-28T23:00:00.000Z') // CET
    expect(viennaIso('2026-03-29', '01:59')).toBe('2026-03-29T00:59:00.000Z') // CET
    expect(viennaIso('2026-03-29', '03:00')).toBe('2026-03-29T01:00:00.000Z') // CEST
    expect(viennaIso('2026-03-29', '12:00')).toBe('2026-03-29T10:00:00.000Z')
    // 02:30 does not exist that night; it resolves to 03:30 CEST
    expect(viennaIso('2026-03-29', '02:30')).toBe('2026-03-29T01:30:00.000Z')
  })

  it('handles the fall-back day (last Sunday of October)', () => {
    expect(viennaIso('2026-10-25', '00:00')).toBe('2026-10-24T22:00:00.000Z') // CEST
    expect(viennaIso('2026-10-25', '01:30')).toBe('2026-10-24T23:30:00.000Z') // CEST
    expect(viennaIso('2026-10-25', '03:00')).toBe('2026-10-25T02:00:00.000Z') // CET
    expect(viennaIso('2026-10-25', '18:00')).toBe('2026-10-25T17:00:00.000Z')
  })

  it('round-trips through formatViennaDate / formatViennaTime', () => {
    for (const [d, t] of [
      ['2026-03-29', '11:30'],
      ['2026-10-25', '11:30'],
      ['2026-10-25', '21:45'],
      ['2026-12-31', '23:59'],
    ]) {
      const instant = new Date(viennaIso(d, t))
      expect(formatViennaDate(instant)).toBe(d)
      expect(formatViennaTime(instant)).toBe(t)
    }
  })
})

describe('viennaDayRange()', () => {
  const hours = (r: { start: Date; end: Date }) => (r.end.getTime() - r.start.getTime()) / 3_600_000

  it('is 24 h on a normal day, 23 h and 25 h on DST days', () => {
    expect(hours(viennaDayRange('2026-07-01'))).toBe(24)
    expect(hours(viennaDayRange('2026-03-29'))).toBe(23)
    expect(hours(viennaDayRange('2026-10-25'))).toBe(25)
  })

  it('starts at Vienna midnight', () => {
    expect(viennaDayRange('2026-10-25').start.toISOString()).toBe('2026-10-24T22:00:00.000Z')
    expect(viennaDayRange('2026-10-25').end.toISOString()).toBe('2026-10-25T23:00:00.000Z')
  })
})

describe('calendar helpers', () => {
  it('addDays() crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('viennaDayOfWeek() uses 0 = Sunday', () => {
    expect(viennaDayOfWeek('2026-10-25')).toBe(0)
    expect(viennaDayOfWeek('2026-10-19')).toBe(1)
    expect(viennaDayOfWeek('2026-10-24')).toBe(6)
  })

  it('viennaDateColumn() files late-evening bookings on the Vienna day', () => {
    // 23:30 Vienna on 7 June is 21:30 UTC — still 7 June
    expect(viennaDateColumn(new Date('2026-06-07T21:30:00Z')).toISOString()).toBe('2026-06-07T00:00:00.000Z')
    // 00:30 Vienna on 8 June is 22:30 UTC on 7 June — must be 8 June
    expect(viennaDateColumn(new Date('2026-06-07T22:30:00Z')).toISOString()).toBe('2026-06-08T00:00:00.000Z')
  })
})

describe('checkPublicSlot()', () => {
  const hours = { isOpen: true, openTime: '11:30', lastBookingTime: '18:45' }
  const slot = (d: string, t: string) => new Date(viennaIso(d, t))

  it('accepts slots on the 15-minute grid between open and last booking', () => {
    expect(checkPublicSlot(slot('2026-07-01', '11:30'), hours)).toEqual({ ok: true })
    expect(checkPublicSlot(slot('2026-07-01', '12:15'), hours)).toEqual({ ok: true })
    expect(checkPublicSlot(slot('2026-07-01', '18:45'), hours)).toEqual({ ok: true })
  })

  it('rejects times outside opening hours', () => {
    expect(checkPublicSlot(slot('2026-07-01', '11:15'), hours)).toEqual({ ok: false, reason: 'OUTSIDE_HOURS' })
    expect(checkPublicSlot(slot('2026-07-01', '19:00'), hours)).toEqual({ ok: false, reason: 'OUTSIDE_HOURS' })
    expect(checkPublicSlot(slot('2026-07-01', '03:00'), hours)).toEqual({ ok: false, reason: 'OUTSIDE_HOURS' })
  })

  it('rejects off-grid times and seconds', () => {
    expect(checkPublicSlot(slot('2026-07-01', '12:07'), hours)).toEqual({ ok: false, reason: 'OFF_GRID' })
    const withSeconds = new Date(slot('2026-07-01', '12:15').getTime() + 30_000)
    expect(checkPublicSlot(withSeconds, hours)).toEqual({ ok: false, reason: 'OFF_GRID' })
  })

  it('rejects closed days and missing working hours', () => {
    expect(checkPublicSlot(slot('2026-07-01', '12:00'), { ...hours, isOpen: false })).toEqual({ ok: false, reason: 'CLOSED' })
    expect(checkPublicSlot(slot('2026-07-01', '12:00'), null)).toEqual({ ok: false, reason: 'CLOSED' })
  })

  it('evaluates DST days in local time', () => {
    expect(checkPublicSlot(slot('2026-03-29', '11:30'), hours)).toEqual({ ok: true })
    expect(checkPublicSlot(slot('2026-10-25', '18:45'), hours)).toEqual({ ok: true })
    expect(viennaWeekdayOf(slot('2026-10-25', '18:45'))).toBe(0)
  })
})
