import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/login',
}))

// Mock API and auth
vi.mock('@/lib/api-online', () => ({
  onlineApi: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { handlers: [] } },
    defaults: {},
  },
}))

vi.mock('@/lib/auth', () => ({
  saveAuth: vi.fn(),
  clearAuth: vi.fn(),
  getToken: vi.fn(() => null),
  getUser: vi.fn(() => null),
  TOKEN_KEY: 'rapidone_token',
  USER_KEY: 'rapidone_user',
}))

import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the Sign In heading', () => {
    render(<LoginPage />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders username and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('renders the sign-in button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows error message when API returns an error', async () => {
    const { onlineApi } = await import('@/lib/api-online')
    vi.mocked(onlineApi.post).mockRejectedValueOnce({
      response: { data: { detail: 'Invalid credentials' } },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'baduser' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'badpass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('calls onlineApi.post with correct path on submit', async () => {
    const { onlineApi } = await import('@/lib/api-online')
    vi.mocked(onlineApi.post).mockResolvedValueOnce({
      data: {
        access_token: 'tok',
        user: { id: 1, username: 'מנהל', company_id: 1 },
      },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(onlineApi.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'secret',
      })
    })
  })
})
