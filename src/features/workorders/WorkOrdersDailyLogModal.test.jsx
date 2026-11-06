import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersDailyLogModal } from './WorkOrdersDailyLogModal'

// Characterization: lock the daily-progress modal exactly as WorkOrders rendered it.
const dailyLogJob = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', MC: 'GK1-01' }

function renderModal(over = {}) {
  const handlers = {
    dailyLogModalOpen: true, dailyLogJob, setDailyLogModalOpen: vi.fn(),
    dailyLogDate: '2026-11-06', setDailyLogDate: vi.fn(),
    dailyLogDetails: 'ตรวจสอบเครื่องตามแผน', setDailyLogDetails: vi.fn(),
    dailyLogHours: '', setDailyLogHours: vi.fn(),
    dailyLogStatus: 'IN_PROGRESS', setDailyLogStatus: vi.fn(),
    dailyLogTechs: [], setDailyLogTechs: vi.fn(),
    dailyLogSubmitting: false, cancellingJobSubmitting: false,
    handleSaveDailyLog: vi.fn(), handleDeleteDailyLog: vi.fn(), openCancelJobConfirm: vi.fn(),
    technicians: [], allJobs: [dailyLogJob], canEdit: true, canDelete: true, ...over,
  }
  render(<WorkOrdersDailyLogModal {...handlers} />)
  return handlers
}

describe('WorkOrdersDailyLogModal characterization', () => {
  it('shows the daily title with job id', () => {
    renderModal()

    expect(screen.getByText('อัปเดตความคืบหน้างานประจำวัน • JOB-001')).toBeInTheDocument()
  })

  it('routes the save action', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('💾 บันทึกความคืบหน้า'))
    expect(h.handleSaveDailyLog).toHaveBeenCalled()
  })

  it('routes the cancel-job shortcut', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('ยกเลิกงานนี้'))
    expect(h.openCancelJobConfirm).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ dailyLogModalOpen: false, dailyLogJob: null })

    expect(screen.queryByText(/อัปเดตความคืบหน้างานประจำวัน/)).not.toBeInTheDocument()
  })
})
