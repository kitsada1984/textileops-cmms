import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersInterruptionModal } from './WorkOrdersInterruptionModal'

// Characterization: lock the interruption modal exactly as WorkOrders rendered it.
const interruptionJob = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', MC: 'MC-01' }

function renderModal(over = {}) {
  const handlers = {
    interruptionModalOpen: true,
    interruptionJob,
    setInterruptionModalOpen: vi.fn(),
    interruptionTaskName: 'ไปขึ้นด้าย',
    setInterruptionTaskName: vi.fn(),
    interruptionManualMins: '',
    setInterruptionManualMins: vi.fn(),
    interruptionManualNotes: '',
    setInterruptionManualNotes: vi.fn(),
    showManualAdd: false,
    setShowManualAdd: vi.fn(),
    handleAddManualInterruption: vi.fn(),
    handleDeleteInterruption: vi.fn(),
    handleStartInterruption: vi.fn(),
    handleStopInterruption: vi.fn(),
    getJobInterruptions: () => [],
    QUICK_INTERRUPTION_PRESETS: [{ value: 'รอวัตถุดิบ', label: 'รอวัตถุดิบ' }],
    allJobs: [],
    onOpenCreateWorkOrder: vi.fn(),
    ...over,
  }
  render(<WorkOrdersInterruptionModal {...handlers} />)
  return handlers
}

describe('WorkOrdersInterruptionModal characterization', () => {
  it('shows the interruption title', () => {
    renderModal()
    expect(screen.getByText('⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)')).toBeInTheDocument()
  })

  it('routes the live-start action in presets tab', () => {
    const h = renderModal()
    fireEvent.click(screen.getByText('⏸️ เริ่มจับเวลางานแทรกทันที (Auto Timestamp)'))
    expect(h.handleStartInterruption).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ interruptionModalOpen: false, interruptionJob: null })
    expect(screen.queryByText('⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)')).not.toBeInTheDocument()
  })

  it('closes through the modal X button', () => {
    const h = renderModal()
    fireEvent.click(screen.getByTitle('ปิดหน้าต่าง'))
    expect(h.setInterruptionModalOpen).toHaveBeenCalledWith(false)
  })

  it('switches to create new work order tab and triggers onOpenCreateWorkOrder & timer start', () => {
    const h = renderModal()

    // Switch to create_new tab
    const createTabBtn = screen.getByRole('button', { name: /เปิดใบสั่งงานใหม่/i })
    fireEvent.click(createTabBtn)

    expect(screen.getByText('เปิดใบสั่งงานใหม่สำหรับงานแทรกนี้')).toBeInTheDocument()

    // Fill in target machine and details
    const mcInput = screen.getByPlaceholderText(/เช่น DP-341M/i)
    const detailInput = screen.getByPlaceholderText(/เช่น เส้นด้ายติดขัด/i)

    fireEvent.change(mcInput, { target: { value: 'MC-99' } })
    fireEvent.change(detailInput, { target: { value: 'ลูกปืนแตก' } })

    // Click 'เริ่มจับเวลางานแทรก & เปิดใบงานใหม่'
    const submitBtn = screen.getByRole('button', { name: /เริ่มจับเวลางานแทรก & เปิดใบงานใหม่/i })
    fireEvent.click(submitBtn)

    expect(h.handleStartInterruption).toHaveBeenCalledWith('[งานแทรกเปิดใบงานใหม่] เครื่อง MC-99: ลูกปืนแตก')
    expect(h.onOpenCreateWorkOrder).toHaveBeenCalledWith({
      mc: 'MC-99',
      comment: 'งานแทรกระหว่างทำใบงาน JOB-001 - ลูกปืนแตก',
    })
  })

  it('supports opening create work order form without starting timer', () => {
    const h = renderModal()

    // Switch to create_new tab
    fireEvent.click(screen.getByRole('button', { name: /เปิดใบสั่งงานใหม่/i }))

    const openOnlyBtn = screen.getByRole('button', { name: /เปิดฟอร์มสร้างใบงานโดยไม่จับเวลา/i })
    fireEvent.click(openOnlyBtn)

    expect(h.handleStartInterruption).not.toHaveBeenCalled()
    expect(h.onOpenCreateWorkOrder).toHaveBeenCalledWith({
      mc: '',
      comment: 'งานแทรกระหว่างทำใบงาน JOB-001',
    })
  })

  it('displays pending machine tasks from other jobs and allows one-click immediate timer start', () => {
    const sampleJobs = [
      { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', MC: 'MC-01' }, // current job (excluded)
      { id: 'job-2', Job_ID: 'JOB-002', Status: 'IN_PROGRESS', MC: 'MC-02', ProblemCause: 'เข็มหัก', JobType: 'REPAIR' },
      { id: 'job-3', Job_ID: 'JOB-003', Status: 'WAITING', MC: 'MC-03', ProblemCause: 'PM ประจำเดือน', JobType: 'PM' },
    ]

    const h = renderModal({ allJobs: sampleJobs })

    // When pending tasks exist, it auto-defaults to pending tab
    expect(screen.getByText(/เลือกจากเครื่องที่มีงานค้างในระบบทุกประเภท/i)).toBeInTheDocument()
    expect(screen.getByText('MC-02')).toBeInTheDocument()
    expect(screen.getByText('MC-03')).toBeInTheDocument()

    // Click 'เริ่มจับเวลาทันที' on MC-02 task
    const startImmediateBtns = screen.getAllByRole('button', { name: /เริ่มจับเวลาทันที/i })
    expect(startImmediateBtns.length).toBeGreaterThan(0)
    fireEvent.click(startImmediateBtns[0])

    expect(h.handleStartInterruption).toHaveBeenCalledWith('[งานแทรก] MC-02: ใบงาน JOB-002 (เข็มหัก)')
  })

  it('allows selecting a pending task to populate task name and review in presets tab', () => {
    const sampleJobs = [
      { id: 'job-2', Job_ID: 'JOB-002', Status: 'IN_PROGRESS', MC: 'MC-02', ProblemCause: 'เข็มหัก', JobType: 'REPAIR' },
    ]

    const h = renderModal({ allJobs: sampleJobs })

    // Click 'เลือกชื่อ'
    const selectBtn = screen.getByRole('button', { name: /เลือกชื่อ/i })
    fireEvent.click(selectBtn)

    expect(h.setInterruptionTaskName).toHaveBeenCalledWith('[งานแทรก] MC-02: ใบงาน JOB-002 (เข็มหัก)')
    // It should have switched to the presets tab where custom note / manual entry is available
    expect(screen.getByText('ระบุชื่องานแทรก / ข้อความด่วน (Start Interruption)')).toBeInTheDocument()
  })
})
