import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersCreateModal } from './WorkOrdersCreateModal'

// Characterization: lock the create-work-order modal exactly as WorkOrders rendered it.
function renderModal(over = {}) {
  const handlers = {
    createModalOpen: true, setCreateModalOpen: vi.fn(), handleStartJob: vi.fn(), submittingStart: false,
    mc: 'GK1-01', setMc: vi.fn(), ki: '', setKi: vi.fn(), design: '', setDesign: vi.fn(),
    jobType: 'REPAIR', setJobType: vi.fn(), status: 'IN_PROGRESS', setStatus: vi.fn(),
    problemCause: '', setProblemCause: vi.fn(), rollNo: '', setRollNo: vi.fn(),
    comment: '', setComment: vi.fn(), selectedTechs: [], toggleTechSelection: vi.fn(),
    technicians: [], inUseMachines: [], matchedActiveMachine: null, user: { username: 'admin' }, ...over,
  }
  render(<WorkOrdersCreateModal {...handlers} />)
  return handlers
}

describe('WorkOrdersCreateModal characterization', () => {
  it('shows the reporter', () => {
    renderModal()

    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('routes the confirm submit', () => {
    const h = renderModal()
    const btn = screen.getByText('ยืนยันเปิดใบสั่งงาน (เริ่มงาน)').closest('button')

    fireEvent.submit(btn.closest('form'))
    expect(h.handleStartJob).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ createModalOpen: false })

    expect(screen.queryByText('ยืนยันเปิดใบสั่งงาน (เริ่มงาน)')).not.toBeInTheDocument()
  })
})
