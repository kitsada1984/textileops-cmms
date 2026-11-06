import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersInterruptionModal } from './WorkOrdersInterruptionModal'

// Characterization: lock the interruption modal exactly as WorkOrders rendered it.
const interruptionJob = {
  id: 'job-1',
  Job_ID: 'JOB-001',
  Status: 'IN_PROGRESS',
  MC: 'MC-01',
  Technicians: 'ช่างสมชาย, ช่างวิชัย',
}

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
    technicians: [{ Name: 'ช่างสมชาย' }, { Name: 'ช่างวิชัย' }, { Name: 'ช่างทดสอบ' }],
    onOpenCreateWorkOrder: vi.fn(),
    ...over,
  }
  render(<WorkOrdersInterruptionModal {...handlers} />)
  return handlers
}

describe('WorkOrdersInterruptionModal characterization & technician pulling', () => {
  it('shows the interruption title and assigned technicians', () => {
    renderModal()
    expect(screen.getByText('⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)')).toBeInTheDocument()
    expect(screen.getAllByText('ช่างสมชาย, ช่างวิชัย').length).toBeGreaterThan(0)
  })

  it('routes the live-start action in presets tab with selected technicians and noTechRemaining flag', () => {
    const h = renderModal()
    fireEvent.click(screen.getByText('⏸️ เริ่มจับเวลางานแทรกทันที (Auto Timestamp)'))
    expect(h.handleStartInterruption).toHaveBeenCalledWith(
      'ไปขึ้นด้าย',
      expect.objectContaining({
        selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
        noTechRemaining: true,
      })
    )
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

    expect(h.handleStartInterruption).toHaveBeenCalledWith(
      expect.stringContaining('[งานแทรกเปิดใบงานใหม่] เครื่อง MC-99: ลูกปืนแตก'),
      expect.objectContaining({
        selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
        noTechRemaining: true,
      })
    )
    expect(h.onOpenCreateWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        mc: 'MC-99',
        comment: expect.stringContaining('งานแทรกระหว่างทำใบงาน JOB-001'),
        selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
      })
    )
  })

  it('supports opening create work order form without starting timer', () => {
    const h = renderModal()

    // Switch to create_new tab
    fireEvent.click(screen.getByRole('button', { name: /เปิดใบสั่งงานใหม่/i }))

    const openOnlyBtn = screen.getByRole('button', { name: /เปิดฟอร์มสร้างใบงานโดยไม่จับเวลา/i })
    fireEvent.click(openOnlyBtn)

    expect(h.handleStartInterruption).not.toHaveBeenCalled()
    expect(h.onOpenCreateWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        mc: '',
        comment: 'งานแทรกระหว่างทำใบงาน JOB-001',
        selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
      })
    )
  })

  it('displays pending machine tasks from other jobs and allows one-click immediate timer start', () => {
    const sampleJobs = [
      { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', MC: 'MC-01', Technicians: 'ช่างสมชาย' }, // current job (excluded)
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

    expect(h.handleStartInterruption).toHaveBeenCalledWith(
      '[งานแทรก] MC-02: ใบงาน JOB-002 (เข็มหัก)',
      expect.objectContaining({
        selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
        noTechRemaining: true,
      })
    )
  })

  it('renders active running interruption with details, technician list, and resume button', () => {
    const activeInt = {
      id: 'INT-ACTIVE-1',
      task_name: 'ไปช่วยงานด่วนเครื่อง 102',
      technicians: ['ช่างสมชาย', 'ช่างวิชัย'],
      no_tech_remaining: true,
      start_time: new Date(Date.now() - 30 * 60000).toISOString(),
      is_active: true,
    }

    const h = renderModal({
      getJobInterruptions: () => [activeInt],
    })

    // Active interruption banner
    expect(screen.getByText(/กำลังทำงานแทรก: “ไปช่วยงานด่วนเครื่อง 102”/i)).toBeInTheDocument()
    expect(screen.getAllByText('ช่างสมชาย, ช่างวิชัย').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/ไม่มีช่างอยู่ \(หยุดนับเวลาทำงานสุทธิ\)/i)).toBeInTheDocument()
    expect(screen.getByText(/สถานะ: ช่างยังไม่กลับมา/i)).toBeInTheDocument()

    // Resume button
    const resumeBtn = screen.getByRole('button', { name: /ช่างกลับมาทำงานใหม่ \/ สิ้นสุดงานแทรก/i })
    fireEvent.click(resumeBtn)
    expect(h.handleStopInterruption).toHaveBeenCalledWith('INT-ACTIVE-1')
  })
})
