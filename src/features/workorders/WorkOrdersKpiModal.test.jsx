import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersKpiModal } from './WorkOrdersKpiModal'

// Characterization: lock the quick KPI modal exactly as WorkOrders rendered it.
function renderModal(over = {}) {
  const handlers = {
    kpiModalOpen: true, draftKpi: { REPAIR: 1, DESIGN: 3, PM: 2, SETUP: 1 },
    setDraftKpi: vi.fn(), setKpiModalOpen: vi.fn(), handleSaveKpiSettings: vi.fn(), ...over,
  }
  render(<WorkOrdersKpiModal {...handlers} />)
  return handlers
}

describe('WorkOrdersKpiModal characterization', () => {
  it('shows the KPI title', () => {
    renderModal()

    expect(screen.getByText('ปรับแต่งเป้าหมาย KPI SLA แต่ละประเภทงาน')).toBeInTheDocument()
  })

  it('edits the repair target and saves', () => {
    const h = renderModal()

    fireEvent.change(screen.getAllByDisplayValue('1')[0], { target: { value: '2' } })
    expect(h.setDraftKpi).toHaveBeenCalled()
    fireEvent.click(screen.getByText('บันทึกเป้าหมาย'))
    expect(h.handleSaveKpiSettings).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ kpiModalOpen: false })

    expect(screen.queryByText('ปรับแต่งเป้าหมาย KPI SLA แต่ละประเภทงาน')).not.toBeInTheDocument()
  })

  it('closes through the modal X button', () => {
    const h = renderModal()

    fireEvent.click(screen.getByTitle('ปิดหน้าต่าง'))
    expect(h.setKpiModalOpen).toHaveBeenCalledWith(false)
  })
})
