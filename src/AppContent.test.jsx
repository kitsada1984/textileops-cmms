import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppContent } from './AppContent'

// Characterization: lock the device-adaptive container frames.
describe('AppContent characterization', () => {
  it('renders children in the mobile frame', () => {
    const { container } = render(
      <AppContent device="mobile" simulatorMode="mobile">
        <span>page-body</span>
      </AppContent>
    )

    expect(screen.getByText('page-body')).toBeInTheDocument()
    expect(container.querySelector('.is-mobile-view')).not.toBeNull()
  })

  it('renders children in the desktop frame', () => {
    render(
      <AppContent device="desktop" simulatorMode="auto">
        <span>page-body</span>
      </AppContent>
    )

    expect(screen.getByText('page-body')).toBeInTheDocument()
  })
})
