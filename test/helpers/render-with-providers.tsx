/**
 * Utility for rendering page components in tests.
 * Wraps children in LanguageProvider so `useLanguage()` works.
 * Heavy sub-components (AppHeader, AppSidebar) should be mocked at module
 * level in each test file using vi.mock().
 */
import React from 'react'
import { render, RenderResult } from '@testing-library/react'
import { LanguageProvider } from '@/components/language-provider'

export function renderWithProviders(ui: React.ReactElement): RenderResult {
  return render(<LanguageProvider initialLanguage="en">{ui}</LanguageProvider>)
}
