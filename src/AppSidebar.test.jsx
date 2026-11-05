import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { AppSidebar } from './AppSidebar'

// Characterization: lock the app sidebar exactly as AppInner rendered it.
const admin = { role: 'admin', full_name: 'Test Admin', username: 'admin' }

function renderSidebar(over = {}) {
  const handlers = {
    setSideOpen: vi.fn(),
    setPwaModalOpen: vi.fn(),
    logout: vi.fn(),
    ...over,
  }
  render(
    <MemoryRouter>
      <AppSidebar
        dark={false}
        sideOpen
        user={admin}
        t={(k) => k}
        sidebarBg="#ffffff"
        {...handlers}
      />
    </MemoryRouter>
  )
  return handlers
}

describe('AppSidebar characterization', () => {
  it('shows nav sections with dashboard link', () => {
    renderSidebar()

    expect(screen.getByText('nav_sec_overview')).toBeInTheDocument()
    expect(screen.getByText('nav_dashboard')).toBeInTheDocument()
  })

  it('shows user footer with logout', () => {
    const h = renderSidebar()

    expect(screen.getByText('Test Admin')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Logout'))
    expect(h.logout).toHaveBeenCalled()
  })

  it('opens the PWA install modal from the sidebar button', () => {
    const h = renderSidebar()

    fireEvent.click(screen.getByText('ติดตั้งแอปบนมือถือ'))
    expect(h.setPwaModalOpen).toHaveBeenCalledWith(true)
  })
})
