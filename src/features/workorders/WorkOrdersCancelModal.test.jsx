import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersCancelModal } from './WorkOrdersCancelModal'

// Characterization: lock the cancel-confirm modal exactly as WorkOrders rendered it.
const dailyLogJob = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS' }

function renderModal(over = {}) {
  const handlers = {
    cancelJobModalOpen: true, dailyLogJob, cancelJobReason: 'งานซ้ำซ้อน', setCancelJobReason: vi.fn(),
    cancellingJobSubmitting: false, setCancelJobModalOpen: vi.fn(), handleConfirmCancelJob: vi.fn(), ...over,
  }
  render(<WorkOrdersCancelModal {...handlers} />)
  return handlers
}

describe('WorkOrdersCancelModal characterization', () => {
  it('shows the cancel title with job id', () => {
    renderModal()

    expect(screen.getByText('⚠️ ยืนยันการยกเลิกใบสั่งงาน')).toBeInTheDocument()
    expect(screen.getByText('JOB-001')).toBeInTheDocument()
  })

  it('routes the confirm action', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('ยืนยันยกเลิกงานนี้'))
    expect(h.handleConfirmCancelJob).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ cancelJobModalOpen: false, dailyLogJob: null })

    expect(screen.queryByText('⚠️ ยืนยันการยกเลิกใบสั่งงาน')).not.toBeInTheDocument()
  })
})
