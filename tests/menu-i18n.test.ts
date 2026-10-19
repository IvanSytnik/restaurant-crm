import { describe, expect, it } from 'vitest'
import { pickDescription, pickLabel, pickName, pickTitle } from '@/lib/menu/i18n'

describe('pickName()', () => {
  const full = { nameDE: 'Schnitzel', nameEN: 'Schnitzel (veal)', nameUK: 'Шніцель' }

  it('returns the requested language when present', () => {
    expect(pickName(full, 'de')).toBe('Schnitzel')
    expect(pickName(full, 'en')).toBe('Schnitzel (veal)')
    expect(pickName(full, 'uk')).toBe('Шніцель')
  })

  it('falls back to German when the translation is missing or empty', () => {
    expect(pickName({ nameDE: 'Tafelspitz' }, 'en')).toBe('Tafelspitz')
    expect(pickName({ nameDE: 'Tafelspitz', nameUK: null }, 'uk')).toBe('Tafelspitz')
    expect(pickName({ nameDE: 'Tafelspitz', nameEN: '' }, 'en')).toBe('Tafelspitz')
  })
})

describe('pickDescription()', () => {
  it('falls back to German, and returns null when nothing is set', () => {
    expect(pickDescription({ descriptionDE: 'Mit Preiselbeeren' }, 'uk')).toBe('Mit Preiselbeeren')
    expect(pickDescription({ descriptionDE: 'DE', descriptionEN: 'EN' }, 'en')).toBe('EN')
    expect(pickDescription({}, 'en')).toBeNull()
    expect(pickDescription({ descriptionDE: null }, 'de')).toBeNull()
  })
})

describe('pickLabel() / pickTitle()', () => {
  it('fall back to German', () => {
    expect(pickLabel({ labelDE: 'Klein', labelEN: 'Small' }, 'en')).toBe('Small')
    expect(pickLabel({ labelDE: 'Klein' }, 'uk')).toBe('Klein')
    expect(pickTitle({ titleDE: 'Mittagsmenü', titleUK: 'Бізнес-ланч' }, 'uk')).toBe('Бізнес-ланч')
    expect(pickTitle({ titleDE: 'Mittagsmenü' }, 'en')).toBe('Mittagsmenü')
  })
})
