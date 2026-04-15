import { describe, it, expect, beforeEach } from 'vitest'
import { saveAuth, clearAuth, getToken, getUser, TOKEN_KEY, USER_KEY } from '@/lib/auth'

// jsdom provides localStorage in the test environment

beforeEach(() => {
  localStorage.clear()
})

describe('saveAuth', () => {
  it('stores the token in localStorage', () => {
    saveAuth('my-token-123', { id: 1, username: 'אבי', company_id: 42 })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('my-token-123')
  })

  it('stores the user as JSON in localStorage', () => {
    const user = { id: 7, username: 'דנה', full_name: 'דנה כהן', role: 'admin', company_id: 5 }
    saveAuth('tok', user)
    const stored = JSON.parse(localStorage.getItem(USER_KEY) as string)
    expect(stored).toEqual(user)
  })

  it('stores an empty object when user is null', () => {
    saveAuth('tok', null)
    const stored = JSON.parse(localStorage.getItem(USER_KEY) as string)
    expect(stored).toEqual({})
  })
})

describe('clearAuth', () => {
  it('removes both token and user from localStorage', () => {
    saveAuth('tok', { id: 1, company_id: 1 })
    clearAuth()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })
})

describe('getToken', () => {
  it('returns null when nothing is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('returns the stored token', () => {
    saveAuth('abc-token', { id: 1, company_id: 1 })
    expect(getToken()).toBe('abc-token')
  })

  it('returns null after clearAuth', () => {
    saveAuth('abc-token', { id: 1, company_id: 1 })
    clearAuth()
    expect(getToken()).toBeNull()
  })
})

describe('getUser', () => {
  it('returns null when nothing is stored', () => {
    expect(getUser()).toBeNull()
  })

  it('returns the parsed user object', () => {
    const user = { id: 3, username: 'מנהל', full_name: 'ישראל ישראלי', role: 'manager', company_id: 10 }
    saveAuth('t', user)
    expect(getUser()).toEqual(user)
  })

  it('returns null when USER_KEY holds invalid JSON', () => {
    localStorage.setItem(USER_KEY, 'not-json{{')
    expect(getUser()).toBeNull()
  })

  it('returns null after clearAuth', () => {
    saveAuth('t', { id: 1, company_id: 1 })
    clearAuth()
    expect(getUser()).toBeNull()
  })
})
