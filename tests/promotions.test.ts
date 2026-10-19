import { describe, expect, it } from 'vitest'
import { getPromotionStatus, isPromotionLiveNow, slugify } from '@/lib/promotions'

// Lunch offer, Mon–Fri 12:00–15:00, 19–23 October 2026 (dates as stored by
// Prisma for @db.Date: UTC midnight of the calendar day).
const lunch = {
  isActive: true,
  isArchived: false,
  startDate: new Date('2026-10-19T00:00:00.000Z'),
  endDate: new Date('2026-10-23T00:00:00.000Z'),
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '12:00',
  endTime: '15:00',
}

// Instants given in UTC; Vienna is UTC+2 until 25 Oct 2026, UTC+1 after.
const utc = (iso: string) => new Date(iso)

describe('getPromotionStatus()', () => {
  it('archived and inactive win over dates', () => {
    expect(getPromotionStatus({ ...lunch, isArchived: true }, utc('2026-10-20T10:00:00Z'))).toBe('ARCHIVED')
    expect(getPromotionStatus({ ...lunch, isActive: false }, utc('2026-10-20T10:00:00Z'))).toBe('INACTIVE')
  })

  it('switches to ACTIVE at Vienna midnight of the start date, not UTC midnight', () => {
    expect(getPromotionStatus(lunch, utc('2026-10-18T21:59:00Z'))).toBe('SCHEDULED') // 23:59 Vienna
    expect(getPromotionStatus(lunch, utc('2026-10-18T22:00:00Z'))).toBe('ACTIVE') // 00:00 Vienna
  })

  it('includes the whole end date in Vienna time', () => {
    expect(getPromotionStatus(lunch, utc('2026-10-23T21:59:00Z'))).toBe('ACTIVE') // 23:59 Vienna
    expect(getPromotionStatus(lunch, utc('2026-10-23T22:00:00Z'))).toBe('EXPIRED') // next day
  })

  it('accepts JSON-serialized dates (client components)', () => {
    const serialized = { ...lunch, startDate: '2026-10-19T00:00:00.000Z', endDate: '2026-10-23T00:00:00.000Z' }
    expect(getPromotionStatus(serialized, utc('2026-10-20T10:00:00Z'))).toBe('ACTIVE')
  })

  it('treats a one-day promotion as active for that whole day', () => {
    const oneDay = { ...lunch, endDate: lunch.startDate }
    expect(getPromotionStatus(oneDay, utc('2026-10-19T20:00:00Z'))).toBe('ACTIVE')
  })
})

describe('isPromotionLiveNow()', () => {
  it('is live on a listed weekday inside the time window', () => {
    expect(isPromotionLiveNow(lunch, utc('2026-10-20T10:30:00Z'))).toBe(true) // Tue 12:30 Vienna
  })

  it('is not live outside the time window; end time is exclusive', () => {
    expect(isPromotionLiveNow(lunch, utc('2026-10-20T09:59:00Z'))).toBe(false) // 11:59
    expect(isPromotionLiveNow(lunch, utc('2026-10-20T13:00:00Z'))).toBe(false) // 15:00
  })

  it('is not live on a weekday that is not listed', () => {
    const withWeekend = { ...lunch, endDate: new Date('2026-10-25T00:00:00.000Z') }
    expect(isPromotionLiveNow(withWeekend, utc('2026-10-24T10:30:00Z'))).toBe(false) // Saturday
  })

  it('uses the Vienna weekday, not the UTC one', () => {
    // 2026-10-19 23:30 UTC is already Tuesday 01:30 in Vienna
    const allDayTuesday = { ...lunch, daysOfWeek: [2], startTime: null, endTime: null }
    expect(isPromotionLiveNow(allDayTuesday, utc('2026-10-19T23:30:00Z'))).toBe(true)
    expect(isPromotionLiveNow(allDayTuesday, utc('2026-10-19T21:30:00Z'))).toBe(false) // Mon 23:30
  })

  it('without weekdays or hours, is live whenever the dates are active', () => {
    const always = { ...lunch, daysOfWeek: [], startTime: null, endTime: null }
    expect(isPromotionLiveNow(always, utc('2026-10-22T20:00:00Z'))).toBe(true)
  })

  it('is never live when not ACTIVE by date', () => {
    expect(isPromotionLiveNow(lunch, utc('2026-10-26T10:30:00Z'))).toBe(false)
  })
})

describe('slugify()', () => {
  it('transliterates German umlauts and ß', () => {
    expect(slugify('Grüße aus Österreich')).toBe('gruesse-aus-oesterreich')
    expect(slugify('Käsespätzle & Bier')).toBe('kaesespaetzle-bier')
  })

  it('transliterates Ukrainian Cyrillic', () => {
    expect(slugify('Бізнес-ланч')).toBe('biznes-lanch')
    expect(slugify('Знижка на борщ')).toBe('znyzhka-na-borshch')
    expect(slugify('Їжа і ґанок')).toBe('izha-i-ganok')
  })

  it('collapses separators, trims dashes and caps length at 60', () => {
    expect(slugify('  --Hello,   World!--  ')).toBe('hello-world')
    expect(slugify('a'.repeat(80))).toHaveLength(60)
  })
})
