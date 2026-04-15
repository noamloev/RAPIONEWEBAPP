import { describe, it, expect } from 'vitest'
import { translations, translate, getDir } from '@/lib/i18n'

// ─── Structural: all EN keys must also exist in HE ───────────────────────────

describe('i18n key parity', () => {
  const enKeys = Object.keys(translations.en)
  const heKeys = new Set(Object.keys(translations.he))

  it('has at least one en key', () => {
    expect(enKeys.length).toBeGreaterThan(0)
  })

  it('every en key also exists in he', () => {
    const missing = enKeys.filter((k) => !heKeys.has(k))
    expect(missing).toEqual([])
  })

  it('has matching key counts in en and he', () => {
    expect(enKeys.length).toBe(Object.keys(translations.he).length)
  })
})

// ─── translate() function ────────────────────────────────────────────────────

describe('translate()', () => {
  it('returns the English string for a known key', () => {
    expect(translate('en', 'common.save')).toBe('Save')
  })

  it('returns the Hebrew string for a known key', () => {
    expect(translate('he', 'common.save')).toBe('שמור')
  })

  it('returns the key itself for a missing key (fallback)', () => {
    const missing = 'totally.unknown.key'
    expect(translate('en', missing)).toBe(missing)
    expect(translate('he', missing)).toBe(missing)
  })

  it('translate does not return undefined for missing keys', () => {
    expect(translate('en', 'no.such.key')).not.toBeUndefined()
    expect(translate('he', 'no.such.key')).not.toBeUndefined()
  })
})

// ─── Common keys spot-check ──────────────────────────────────────────────────

describe('common keys', () => {
  const commonKeys = [
    'common.save',
    'common.cancel',
    'common.refresh',
    'common.loading',
    'common.search',
    'common.settings',
    'common.language',
    'common.english',
    'common.hebrew',
  ]

  commonKeys.forEach((key) => {
    it(`en key "${key}" is a non-empty string`, () => {
      expect(typeof translations.en[key]).toBe('string')
      expect(translations.en[key].length).toBeGreaterThan(0)
    })

    it(`he key "${key}" is a non-empty string`, () => {
      expect(typeof translations.he[key]).toBe('string')
      expect(translations.he[key].length).toBeGreaterThan(0)
    })
  })
})

// ─── Nav keys spot-check ─────────────────────────────────────────────────────

describe('nav keys', () => {
  const navKeys = [
    'nav.dashboard',
    'nav.clients',
    'nav.products',
    'nav.inventory',
    'nav.daily_report',
    'nav.follow_up',
    'nav.product_statistics',
    'nav.worker_statistics',
    'nav.settings',
    'nav.transfers',
  ]

  navKeys.forEach((key) => {
    it(`nav key "${key}" exists in both languages`, () => {
      expect(translations.en[key]).toBeTruthy()
      expect(translations.he[key]).toBeTruthy()
    })
  })
})

// ─── Page-specific keys spot-check ───────────────────────────────────────────

describe('pages.dashboard keys', () => {
  it('title is "Dashboard" in English', () => {
    expect(translations.en['pages.dashboard.title']).toBe('Dashboard')
  })

  it('title is correct Hebrew string', () => {
    expect(translations.he['pages.dashboard.title']).toBe('דשבורד')
  })
})

describe('pages.inventory keys', () => {
  it('title exists in both languages', () => {
    expect(translations.en['pages.inventory.title']).toBeTruthy()
    expect(translations.he['pages.inventory.title']).toBeTruthy()
  })
})

describe('pages.transfers keys', () => {
  it('title exists in both languages', () => {
    expect(translations.en['pages.transfers.title']).toBeTruthy()
    expect(translations.he['pages.transfers.title']).toBeTruthy()
  })
})

describe('pages.products keys', () => {
  it('title exists in both languages', () => {
    expect(translations.en['pages.products.title']).toBeTruthy()
    expect(translations.he['pages.products.title']).toBeTruthy()
  })
})

// ─── getDir() ─────────────────────────────────────────────────────────────────

describe('getDir()', () => {
  it('returns "rtl" for Hebrew', () => {
    expect(getDir('he')).toBe('rtl')
  })

  it('returns "ltr" for English', () => {
    expect(getDir('en')).toBe('ltr')
  })
})
