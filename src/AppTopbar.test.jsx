import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppTopbar } from './AppTopbar'

// Characterization: lock the app top bar exactly as AppInner rendered it.
function renderTopbar(over = {}) {
  const handlers = {
    setDark: vi.fn(),
    setSideOpen: vi.fn(),
    setSimulatorMode: vi.fn(),
    setPwaModalOpen: vi.fn(),
    handleForceUpdate: vi.fn(),
    logout: vi.fn(),
    ...over,
  }
  render(
    <AppTopbar
      dark={false}
      currentNav={null}
      t={(k) => k}
      user={{ full_name: 'Test Admin' }}
      simulatorMode="auto"
      autoDevice="desktop"
      {...handlers}
    />
  )
  return handlers
}

describe('AppTopbar characterization', () => {
  it('shows fallback title and user controls', () => {
    renderTopbar()

    expect(screen.getByText('TextileOps')).toBeInTheDocument()
    expect(screen.getByText('Test Admin')).toBeInTheDocument()
    expect(screen.getByText('ติดตั้งแอป')).toBeInTheDocument()
  })

  it('toggles theme and opens side menu', () => {
    const h = renderTopbar()

    fireEvent.click(screen.getByTitle('เปิดเมนูหลัก'))
    expect(h.setSideOpen).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByTitle('โหมดมืด'))
    expect(h.setDark).toHaveBeenCalled()
  })
})
