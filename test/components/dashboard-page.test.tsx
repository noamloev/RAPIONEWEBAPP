import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import React from 'react'
import { renderWithProviders } from '@/test/helpers/render-with-providers'

// Mock heavy shell components — they do their own API calls
vi.mock('@/components/app-sidebar', () => ({
  AppSidebar: () => <nav data-testid="sidebar" />,
}))

vi.mock('@/components/app-header', () => ({
  AppHeader: ({ title }: { title: string }) => <header data-testid="header">{title}</header>,
}))

// Mock Next.js navigation (required by AppSidebar even though mocked)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}))

import DashboardPage from '@/app/page'

describe('DashboardPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<DashboardPage />)
  })

  it('renders the page title in the header', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByTestId('header')).toHaveTextContent('Dashboard')
  })

  it('renders all four stat cards', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Revenue Today')).toBeInTheDocument()
    expect(screen.getByText('Sales Count')).toBeInTheDocument()
    expect(screen.getByText('Flags')).toBeInTheDocument()
    expect(screen.getByText('Agent Status')).toBeInTheDocument()
  })

  it('renders the operations overview section', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Operations at a glance')).toBeInTheDocument()
  })

  it('renders the workspace style section', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Luxury rose system')).toBeInTheDocument()
  })

  it('renders inventory health, report flow, and audit queue cards', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Inventory Health')).toBeInTheDocument()
    expect(screen.getByText('Report Flow')).toBeInTheDocument()
    expect(screen.getByText('Audit Queue')).toBeInTheDocument()
  })
})
