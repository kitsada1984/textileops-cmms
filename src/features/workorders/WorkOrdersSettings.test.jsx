import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersSettings } from './WorkOrdersSettings'

// Characterization: lock the settings tab exactly as WorkOrders rendered it.
function renderTab(over = {}) {
  const handlers = {
    draftKpi: { REPAIR: 1, DESIGN: 3, PM: 2, SETUP: 1 },
    setDraftKpi: vi.fn(), handleSaveKpiSettings: vi.fn(), user: { username: 'admin' }, ...over,
  }
  render(<WorkOrdersSettings {...handlers} />)
  return handlers
}

describe('WorkOrdersSettings characterization', () => {
  it('shows the KPI target card', () => {
    renderTab()

    expect(screen.getByText('ตั้งค่าเป้าหมาย KPI (SLA Target Days)')).toBeInTheDocument()
  })

  it('edits the repair target', () => {
    const h = renderTab()
    const inputs = screen.getAllByRole('spinbutton')

    fireEvent.change(inputs[0], { target: { value: '2' } })
    expect(h.setDraftKpi).toHaveBeenCalled()
  })

  it('routes the save action', () => {
    const h = renderTab()

    fireEvent.click(screen.getByText('บันทึกเป้าหมาย KPI ทั้งหมด'))
    expect(h.handleSaveKpiSettings).toHaveBeenCalled()
  })
})
