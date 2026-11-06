import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersEditModal } from './WorkOrdersEditModal'

// Characterization: lock the edit-job modal exactly as WorkOrders rendered it.
const editJob = { Job_ID: 'JOB-001', MC: 'GK1-01', KI: 'KI-1', Status: 'IN_PROGRESS', JobType: 'REPAIR' }

function renderModal(over = {}) {
  const handlers = {
    editModalOpen: true, editJob, editTechs: [], editSubmitting: false,
    setEditJob: vi.fn(), setEditModalOpen: vi.fn(), handleEditJob: vi.fn(),
    toggleEditTechSelection: vi.fn(), technicians: [], inUseMachines: [], matchedEditActiveMachine: null, ...over,
  }
  render(<WorkOrdersEditModal {...handlers} />)
  return handlers
}

describe('WorkOrdersEditModal characterization', () => {
  it('shows the edit title with job id', () => {
    renderModal()

    expect(screen.getByText('แก้ไขใบสั่งงาน JOB-001')).toBeInTheDocument()
  })

  it('edits the MC field', () => {
    const h = renderModal()
    const mc = screen.getByDisplayValue('GK1-01')

    fireEvent.change(mc, { target: { value: 'GK1-02' } })
    expect(h.setEditJob).toHaveBeenCalled()
  })

  it('routes the save action', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('บันทึกการแก้ไข'))
    expect(h.handleEditJob).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ editModalOpen: false, editJob: null })

    expect(screen.queryByText(/แก้ไขใบสั่งงาน/)).not.toBeInTheDocument()
  })
})
