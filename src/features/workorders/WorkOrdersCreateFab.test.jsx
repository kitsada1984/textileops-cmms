import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersCreateFab } from './WorkOrdersCreateFab'

// Characterization: lock the mobile FAB exactly as WorkOrders rendered it.
function renderFab(over = {}) {
  const handlers = { currentTab: 'records', canAdd: true, setCreateModalOpen: vi.fn(), ...over }
  render(<WorkOrdersCreateFab {...handlers} />)
  return handlers
}

describe('WorkOrdersCreateFab characterization', () => {
  it('shows the FAB on the records tab', () => {
    renderFab()

    expect(screen.getByTitle('เปิดใบสั่งงาน')).toBeInTheDocument()
  })

  it('routes the FAB to the create modal', () => {
    const h = renderFab()

    fireEvent.click(screen.getByTitle('เปิดใบสั่งงาน'))
    expect(h.setCreateModalOpen).toHaveBeenCalledWith(true)
  })

  it('hides the FAB off the records tab or without permission', () => {
    const { unmount } = render(<WorkOrdersCreateFab currentTab="dashboard" canAdd setCreateModalOpen={vi.fn()} />)
    expect(screen.queryByTitle('เปิดใบสั่งงาน')).not.toBeInTheDocument()
    unmount()
    renderFab({ canAdd: false })
    expect(screen.queryByTitle('เปิดใบสั่งงาน')).not.toBeInTheDocument()
  })
})
