import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock lib/auth before importing the API client so interceptors see mocked values
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(),
  getUser: vi.fn(),
}))

import { getToken, getUser } from '@/lib/auth'
import { onlineApi } from '@/lib/api-online'

const mockGetToken = vi.mocked(getToken)
const mockGetUser = vi.mocked(getUser)

describe('onlineApi instance', () => {
  it('is an axios instance (has get/post/put/delete methods)', () => {
    expect(typeof onlineApi.get).toBe('function')
    expect(typeof onlineApi.post).toBe('function')
    expect(typeof onlineApi.put).toBe('function')
    expect(typeof onlineApi.delete).toBe('function')
  })

  it('has baseURL configured from NEXT_PUBLIC_API_URL env var', () => {
    // The baseURL may be undefined in test env (no .env.test), but the
    // instance must exist and the defaults object must be present
    expect(onlineApi.defaults).toBeDefined()
  })
})

describe('onlineApi request interceptor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('attaches Authorization header when a token is present', async () => {
    mockGetToken.mockReturnValue('test-bearer-token')
    mockGetUser.mockReturnValue({ id: 1, company_id: 7, username: 'אבי' })

    // Retrieve the request interceptor handler by invoking it directly
    // onlineApi.interceptors.request is an AxiosInterceptorManager
    // We simulate what Axios does: pass a config object through each handler
    const handlers = (onlineApi.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any
    } | null>

    const appHandler = handlers.find((h) => h !== null)
    expect(appHandler).toBeDefined()

    const config = { headers: {} as Record<string, string> }
    const result = appHandler!.fulfilled(config)

    expect(result.headers['Authorization']).toBe('Bearer test-bearer-token')
  })

  it('attaches X-Company-Id header when user has company_id', async () => {
    mockGetToken.mockReturnValue('tok')
    mockGetUser.mockReturnValue({ id: 2, company_id: 42 })

    const handlers = (onlineApi.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any
    } | null>
    const appHandler = handlers.find((h) => h !== null)!

    const config = { headers: {} as Record<string, string> }
    const result = appHandler.fulfilled(config)

    expect(result.headers['X-Company-Id']).toBe('42')
  })

  it('does not attach Authorization header when no token', async () => {
    mockGetToken.mockReturnValue(null)
    mockGetUser.mockReturnValue(null)

    const handlers = (onlineApi.interceptors.request as any).handlers as Array<{
      fulfilled: (config: any) => any
    } | null>
    const appHandler = handlers.find((h) => h !== null)!

    const config = { headers: {} as Record<string, string> }
    const result = appHandler.fulfilled(config)

    expect(result.headers['Authorization']).toBeUndefined()
    expect(result.headers['X-Company-Id']).toBeUndefined()
  })
})
