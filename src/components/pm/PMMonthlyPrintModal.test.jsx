import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import PMMonthlyPrintModal from './PMMonthlyPrintModal'

const MOCK_ITEMS = [
  {
    id: 'PMSCH-202611-01',
    mc: 'DP-341M',
    ki: '74753',
    location: 'GK4',
    type: 'Double',
    plannedStartDate: '2026-11-02',
    plannedEndDate: '2026-11-04',
    workingDays: 3,
    actualStartDate: '2026-11-02',
    actualEndDate: '2026-11-03',
    actualTech: 'ช่างสมชาย',
    status: 'COMPLETED',
    workOrderId: 'JOB-20261102-001',
    notes: 'เสร็จเรียบร้อย',
    isUnplanned: false,
  },
  {
    id: 'PMSCH-202611-UNPLANNED-JOB-002',
    mc: 'DA-301M',
    ki: '63469',
    location: 'GK3',
    type: 'Double',
    plannedStartDate: '',
    plannedEndDate: '',
    workingDays: 0,
    actualStartDate: '2026-11-05',
    actualEndDate: '',
    actualTech: 'ช่างวิชัย',
    status: 'IN_PROGRESS',
    workOrderId: 'JOB-20261105-002',
    notes: 'งานเร่งด่วน',
    isUnplanned: true,
  },
]

const MOCK_STATS = {
  total: 2,
  completed: 1,
  inProgress: 1,
  scheduled: 0,
  delayed: 0,
}

describe('PMMonthlyPrintModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when open is false', () => {
    const { container } = render(
      <PMMonthlyPrintModal
        open={false}
        onClose={vi.fn()}
        year={2026}
        month={11}
        items={MOCK_ITEMS}
        stats={MOCK_STATS}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders complete A4 document structure with Gantt Timeline by default and supports switching to List Table', () => {
    render(
      <PMMonthlyPrintModal
        open={true}
        onClose={vi.fn()}
        year={2026}
        month={11}
        items={MOCK_ITEMS}
        stats={MOCK_STATS}
        daysPerMachine={3}
        locationFilter="ALL"
        currentUserName="Admin Supervisor"
      />
    )

    // Top action bar
    expect(screen.getByText(/พรีวิวแผนงานบำรุงรักษาเชิงป้องกันประจำเดือน/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /พิมพ์เอกสาร/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ดาวน์โหลด PDF/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /แถบเวลา \(Timeline\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ตารางรายการ/ })).toBeInTheDocument()

    // Company Header & Title
    expect(screen.getByText(/บริษัท แกมม่า นิตติ้ง จำกัด/)).toBeInTheDocument()
    expect(screen.getByText(/แผนงานบำรุงรักษาเชิงป้องกันประจำเดือน \(Monthly Preventive Maintenance Schedule\)/)).toBeInTheDocument()
    expect(screen.getByText(/รหัสเอกสาร:/)).toBeInTheDocument()
    expect(screen.getByText('PM-SCH-202611')).toBeInTheDocument()
    expect(screen.getAllByText(/พฤศจิกายน 2569/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Admin Supervisor/)).toBeInTheDocument()

    // Scope & Criteria
    expect(screen.getByText(/3 วันทำการ\/เครื่อง \(ไม่นับวันอาทิตย์\)/)).toBeInTheDocument()
    expect(screen.getByText(/ทุกโซน \/ โรงทอทั้งหมด/)).toBeInTheDocument()

    // KPI Summary Cards are removed from printable document as requested
    expect(screen.queryByText('เครื่องทั้งหมดในแผน')).not.toBeInTheDocument()
    expect(screen.queryByText('เสร็จสมบูรณ์')).not.toBeInTheDocument()
    expect(screen.queryByText('กำลังดำเนินการ')).not.toBeInTheDocument()
    expect(screen.queryByText('ตามแผน / รอดำเนินการ')).not.toBeInTheDocument()

    // Color Legend
    expect(screen.getByText('สัญลักษณ์แถบสี:')).toBeInTheDocument()
    expect(screen.getByText(/แถบแผนงาน \(3 วัน\)/)).toBeInTheDocument()
    expect(screen.getByText('ทำจริง: เสร็จสิ้น (Completed)')).toBeInTheDocument()
    expect(screen.getByText('ทำจริง: กำลังทำ (In Progress)')).toBeInTheDocument()
    expect(screen.getByText('วันอาทิตย์ (วันหยุด ไม่นับวันทำงาน)')).toBeInTheDocument()

    // Timeline Gantt Grid: Calendar day numbers (01 to 30 for November)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()

    // Machine Names & Status in Timeline
    expect(screen.getByText('DP-341M')).toBeInTheDocument()
    expect(screen.getByText('DA-301M')).toBeInTheDocument()
    expect(screen.getAllByText('นอกแผน').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('เสร็จสิ้น')).toBeInTheDocument()
    expect(screen.getByText('กำลังทำ')).toBeInTheDocument()

    // Timeline Bars
    expect(screen.getByText(/แผน: DP-341M/)).toBeInTheDocument()
    expect(screen.getByText(/จริง: ช่างสมชาย/)).toBeInTheDocument()
    expect(screen.getByText(/จริง: ช่างวิชัย/)).toBeInTheDocument()

    // Switch to List Table View
    const listBtn = screen.getByRole('button', { name: /ตารางรายการ/ })
    fireEvent.click(listBtn)

    // Table view specific columns and values
    expect(screen.getByText('74753')).toBeInTheDocument()
    expect(screen.getByText('GK4')).toBeInTheDocument()
    expect(screen.getByText('JOB-20261102-001')).toBeInTheDocument()
    expect(screen.getByText('เสร็จเรียบร้อย')).toBeInTheDocument()

    // Switch back to Timeline View
    const timelineBtn = screen.getByRole('button', { name: /แถบเวลา \(Timeline\)/ })
    fireEvent.click(timelineBtn)
    expect(screen.getByText(/แผน: DP-341M/)).toBeInTheDocument()

    // Sign-off section
    expect(screen.getByText('ผู้จัดทำแผน (Prepared By)')).toBeInTheDocument()
    expect(screen.getByText('ผู้ตรวจสอบ (Inspected By)')).toBeInTheDocument()
    expect(screen.getByText('ผู้อนุมัติ (Approved By)')).toBeInTheDocument()
  })

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <PMMonthlyPrintModal
        open={true}
        onClose={vi.fn()}
        year={2026}
        month={11}
        items={MOCK_ITEMS}
        stats={MOCK_STATS}
      />
    )

    const printBtn = screen.getByRole('button', { name: /พิมพ์เอกสาร/ })
    fireEvent.click(printBtn)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()

    render(
      <PMMonthlyPrintModal
        open={true}
        onClose={handleClose}
        year={2026}
        month={11}
        items={MOCK_ITEMS}
        stats={MOCK_STATS}
      />
    )

    const closeBtn = screen.getByTitle(/ปิดหน้าต่าง/)
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
