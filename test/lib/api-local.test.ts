import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
}))

import { getToken } from '@/lib/auth'
import { localApi } from '@/lib/api-local'

const mockGetToken = vi.mocked(getToken)

describe('localApi instance', () => {
  it('is an axios instance with expected HTTP methods', () => {
    expect(typeof localApi.get).toBe('function')
    expect(typeof localApi.post).toBe('function')
  })

  it('has a 15-minute timeout (900000 ms)', () => {
    expect(localApi.defaults.timeout).toBe(1000 * 60 * 15)
  })

  it('defaults to http://127.0.0.1:8000 when env var is unset', () => {
    // In test environment NEXT_PUBLIC_LOCAL_API_URL is not set
    expect(localApi.defaults.baseURL).toBe('http://127.0.0.1:8000')
  })
})

describe('localApi request interceptor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('attaches Authorization header when token is present', () => {
    mockGetToken.mockReturnValue('local-token-xyz')

    const handlers = (localApi.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any
    } | null>
    const appHandler = handlers.find((h) => h !== null)!

    const config = { headers: {} as Record<string, string> }
    const result = appHandler.fulfilled(config)

    expect(result.headers['Authorization']).toBe('Bearer local-token-xyz')
  })

  it('does not attach Authorization header when no token', () => {
    mockGetToken.mockReturnValue(null)

    const handlers = (localApi.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any
    } | null>
    const appHandler = handlers.find((h) => h !== null)!

    const config = { headers: {} as Record<string, string> }
    const result = appHandler.fulfilled(config)

    expect(result.headers['Authorization']).toBeUndefined()
  })
})
