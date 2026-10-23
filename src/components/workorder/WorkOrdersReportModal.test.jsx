import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WorkOrdersReportModal from './WorkOrdersReportModal'

describe('WorkOrdersReportModal Component', () => {
  const originalPrint = window.print

  beforeEach(() => {
    window.print = vi.fn()
  })

  afterEach(() => {
    window.print = originalPrint
    vi.restoreAllMocks()
  })

  const mockItems = [
    {
      id: 'wo-1',
      Job_ID: 'JOB-20261022-001',
      MC: 'MC-01',
      KI: 'KI-9012',
      Design: 'ผ้าลายริ้ว',
      JobType: 'REPAIR',
      Status: 'IN_PROGRESS',
      Comment: 'มอเตอร์ความร้อนสูง',
      Technicians: 'นายสมชาย, นายสมศักดิ์',
      StartDate: '2026-10-22',
      StartTime: '08:30',
      WorkingDurationText: '2.5 ชม.',
      CreatedBy: 'line_user1',
    },
    {
      id: 'wo-2',
      Job_ID: 'JOB-20261022-002',
      MC: 'MC-04',
      KI: 'KI-9015',
      Design: 'ผ้าเรียบ 30s',
      JobType: 'DESIGN',
      Status: 'COMPLETED',
      Comment: 'เปลี่ยนลูกเบี้ยวและขึ้นแบบใหม่',
      Technicians: 'นายสุรชัย',
      StartDate: '2026-10-21',
      StartTime: '09:00',
      WorkingDurationText: '14 ชม.',
      CreatedBy: 'line_user2',
    },
    {
      id: 'wo-3',
      Job_ID: 'JOB-20261023-001',
      MC: 'MC-08',
      JobType: 'PM',
      Status: 'WAITING_PARTS',
      Comment: 'รอสายพานส่งด้าย',
      Technicians: 'ช่างโอ๋',
      StartDate: '2026-10-23',
      StartTime: '10:00',
      CreatedBy: 'admin',
    },
  ]

  const mockFilterContext = {
    typeFilters: ['REPAIR', 'DESIGN'],
    statusFilters: ['IN_PROGRESS'],
    search: 'MC-01',
    showDeleted: false,
  }

  const mockKpiTargets = {
    REPAIR: 1.0,
    DESIGN: 3.0,
    PM: 2.0,
  }

  it('renders nothing when open is false', () => {
    const { container } = render(
      <WorkOrdersReportModal
        open={false}
        onClose={vi.fn()}
        items={mockItems}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders report header, KPI summary, and items when open is true', () => {
    render(
      <WorkOrdersReportModal
        open={true}
        onClose={vi.fn()}
        items={mockItems}
        filterContext={mockFilterContext}
        kpiTargets={mockKpiTargets}
        currentUserName="นายทดสอบ รายงาน"
      />
    )

    // Check title and company header
    expect(screen.getByText(/รายงานสรุปใบสั่งงานซ่อมบำรุง/i)).toBeInTheDocument()
    expect(screen.getByText(/Gomma Knits Co\., Ltd\./i)).toBeInTheDocument()
    expect(screen.getByText(/3 รายการ/i)).toBeInTheDocument()

    // Check Filter Badges
    expect(screen.getByText(/ค้นหา: "MC-01"/i)).toBeInTheDocument()
    expect(screen.getByText(/ประเภท: แก้ไข, ปรับแบบ/i)).toBeInTheDocument()
    expect(screen.getByText(/สถานะ: กำลังทำ/i)).toBeInTheDocument()

    // Check Work Order rows
    expect(screen.getByText('JOB-20261022-001')).toBeInTheDocument()
    expect(screen.getByText('JOB-20261022-002')).toBeInTheDocument()
    expect(screen.getByText('JOB-20261023-001')).toBeInTheDocument()
    expect(screen.getByText('MC-01')).toBeInTheDocument()
    expect(screen.getByText('MC-04')).toBeInTheDocument()
    expect(screen.getByText('MC-08')).toBeInTheDocument()
  })

  it('triggers window.print when clicking print button', () => {
    render(
      <WorkOrdersReportModal
        open={true}
        onClose={vi.fn()}
        items={mockItems}
        filterContext={mockFilterContext}
      />
    )

    const printBtn = screen.getByRole('button', { name: /พิมพ์รายงาน \(Print A4\)/i })
    fireEvent.click(printBtn)
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('allows toggling between landscape and portrait orientations', () => {
    render(
      <WorkOrdersReportModal
        open={true}
        onClose={vi.fn()}
        items={mockItems}
        filterContext={mockFilterContext}
      />
    )

    const portraitBtn = screen.getByRole('button', { name: /แนวตั้ง \(Portrait\)/i })
    fireEvent.click(portraitBtn)
    expect(screen.getByText(/A4 แนวตั้ง/i)).toBeInTheDocument()

    const landscapeBtn = screen.getByRole('button', { name: /แนวนอน \(Landscape\)/i })
    fireEvent.click(landscapeBtn)
    expect(screen.getByText(/A4 แนวนอน/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <WorkOrdersReportModal
        open={true}
        onClose={handleClose}
        items={mockItems}
        filterContext={mockFilterContext}
      />
    )

    const closeBtn = screen.getByTitle('ปิดหน้าต่าง')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
