import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersCompleteModal } from './WorkOrdersCompleteModal'

// Characterization: lock the complete-job modal exactly as WorkOrders rendered it.
const compJob = { Job_ID: 'JOB-001', MC: 'GK1-01', KI: 'KI-1', StartDate: '2026-11-01', StartTime: '08:00' }

function renderModal(over = {}) {
  const handlers = {
    completeModalOpen: true, compJob, compCalcDuration: '8 ชม.', compEndDate: '2026-11-01', compEndTime: '16:00',
    compSubmitting: false, setCompEndDate: vi.fn(), setCompEndTime: vi.fn(),
    setCompleteModalOpen: vi.fn(), handleCompleteJob: vi.fn(), openInterruptionModal: vi.fn(), ...over,
  }
  render(<WorkOrdersCompleteModal {...handlers} />)
  return handlers
}

describe('WorkOrdersCompleteModal characterization', () => {
  it('shows the job summary', () => {
    renderModal()

    expect(screen.getByText('บันทึกจบงานซ่อม (Complete Job)')).toBeInTheDocument()
    expect(screen.getByText('JOB-001')).toBeInTheDocument()
  })

  it('routes the confirm action', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('ยืนยันจบงาน'))
    expect(h.handleCompleteJob).toHaveBeenCalled()
  })

  it('locks the end date for non-admin and frees it for admin', () => {
    const { rerender } = render(
      <WorkOrdersCompleteModal
        completeModalOpen compJob={compJob} compCalcDuration="8 ชม."
        compEndDate="2026-11-01" compEndTime="16:00" compSubmitting={false}
        setCompEndDate={vi.fn()} setCompEndTime={vi.fn()} setCompleteModalOpen={vi.fn()}
        handleCompleteJob={vi.fn()} openInterruptionModal={vi.fn()} canEditDate={false}
      />
    )
    expect(screen.getByDisplayValue('2026-11-01')).toBeDisabled()

    rerender(
      <WorkOrdersCompleteModal
        completeModalOpen compJob={compJob} compCalcDuration="8 ชม."
        compEndDate="2026-11-01" compEndTime="16:00" compSubmitting={false}
        setCompEndDate={vi.fn()} setCompEndTime={vi.fn()} setCompleteModalOpen={vi.fn()}
        handleCompleteJob={vi.fn()} openInterruptionModal={vi.fn()} canEditDate
      />
    )
    expect(screen.getByDisplayValue('2026-11-01')).not.toBeDisabled()
  })

  it('routes the interruption shortcut with the job', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('+ จัดการงานแทรก / เวลาที่เสียไป'))
    expect(h.openInterruptionModal).toHaveBeenCalledWith(compJob)
  })
  it('renders nothing when closed', () => {
    renderModal({ completeModalOpen: false, compJob: null })

    expect(screen.queryByText('บันทึกจบงานซ่อม (Complete Job)')).not.toBeInTheDocument()
  })

  it('closes through the modal X button', () => {
    const h = renderModal()

    fireEvent.click(screen.getByTitle('ปิดหน้าต่าง'))
    expect(h.setCompleteModalOpen).toHaveBeenCalledWith(false)
  })
})
