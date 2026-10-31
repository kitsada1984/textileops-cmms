import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PMMonthlyScheduleView, {
  getMonthlyWorkingDays,
  buildThreeDayBlocks,
  autoGenerateMonthlySchedule,
  calculateMonthlyStats,
  getItemDayRange,
  getStatusMeta,
  THAI_MONTHS,
  SHORT_THAI_MONTHS,
} from './PMMonthlyScheduleView'

// Mock AppConfigAPI
vi.mock('../../api/entities', () => ({
  AppConfigAPI: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ ok: true }),
    update: vi.fn().mockResolvedValue({ ok: true }),
  },
}))

// Mock useToast
vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('PMMonthlyScheduleView - 3 Days/Machine Schedule Algorithm & Math', () => {
  it('getMonthlyWorkingDays correctly excludes Sundays (Day 0) for any month', () => {
    // October 2026: 31 days, Sundays are Oct 4, 11, 18, 25 (4 Sundays)
    const octWorkingDays = getMonthlyWorkingDays(2026, 10)
    expect(octWorkingDays).toHaveLength(27) // 31 - 4 = 27

    // Verify no Sunday (dayOfWeek === 0) is included
    const hasSunday = octWorkingDays.some(d => d.dayOfWeek === 0)
    expect(hasSunday).toBe(false)

    // Check first day is Oct 1, 2026 (Thursday)
    expect(octWorkingDays[0].dateStr).toBe('2026-10-01')
    expect(octWorkingDays[0].dayOfWeek).toBe(4) // Thursday
  })

  it('buildThreeDayBlocks groups working days into consecutive 3-working-day blocks', () => {
    const octWorkingDays = getMonthlyWorkingDays(2026, 10) // 27 working days
    const blocks = buildThreeDayBlocks(octWorkingDays)

    // 27 working days / 3 days per machine = exactly 9 blocks
    expect(blocks).toHaveLength(9)

    // Block 1: Oct 1 (Thu), Oct 2 (Fri), Oct 3 (Sat)
    expect(blocks[0].startDate).toBe('2026-10-01')
    expect(blocks[0].endDate).toBe('2026-10-03')
    expect(blocks[0].workingDaysCount).toBe(3)

    // Block 2 skips Sunday Oct 4: Oct 5 (Mon), Oct 6 (Tue), Oct 7 (Wed)
    expect(blocks[1].startDate).toBe('2026-10-05')
    expect(blocks[1].endDate).toBe('2026-10-07')
    expect(blocks[1].workingDaysCount).toBe(3)
  })

  it('getItemDayRange calculates startDay, endDay and span for timeline grid', () => {
    const item = {
      plannedStartDate: '2026-10-01',
      plannedEndDate: '2026-10-03',
    }
    const range = getItemDayRange(item, 2026, 10, 31)
    expect(range).not.toBeNull()
    expect(range.startDay).toBe(1)
    expect(range.endDay).toBe(3)
    expect(range.span).toBe(3)

    const middleItem = {
      plannedStartDate: '2026-10-15',
      plannedEndDate: '2026-10-17',
    }
    const middleRange = getItemDayRange(middleItem, 2026, 10, 31)
    expect(middleRange.startDay).toBe(15)
    expect(middleRange.endDay).toBe(17)
    expect(middleRange.span).toBe(3)
  })

  it('autoGenerateMonthlySchedule extracts real active machine codes correctly', () => {
    // Current machines from in-use cylinders
    const mockInUseMachines = [
      { mc: 'DB-3014M', ki: '81798', location: 'GMK1', type: 'Double' },
      { mc: 'MC-02', ki: '81144', location: 'GMK1', type: 'Single' },
      { mc: 'MC-10', ki: '55201', location: 'GMK3', type: 'Double' },
    ]

    const schedule = autoGenerateMonthlySchedule(2026, 10, mockInUseMachines)
    expect(schedule).toHaveLength(9)

    expect(schedule[0].mc).toBe('DB-3014M')
    expect(schedule[0].ki).toBe('81798')
    expect(schedule[0].plannedStartDate).toBe('2026-10-01')
    expect(schedule[0].plannedEndDate).toBe('2026-10-03')
    expect(schedule[0].status).toBe('SCHEDULED')
    expect(schedule[0].workingDays).toBe(3)

    expect(schedule[1].mc).toBe('MC-02')
    expect(schedule[1].ki).toBe('81144')
    expect(schedule[1].plannedStartDate).toBe('2026-10-05')
    expect(schedule[1].plannedEndDate).toBe('2026-10-07')

    expect(schedule[2].mc).toBe('MC-10')
    expect(schedule[3].mc).toBe('DB-3014M') // wraps around
  })

  it('calculateMonthlyStats calculates completion rate and SLA on-time metrics', () => {
    const mockItems = [
      { id: '1', status: 'COMPLETED', isOnTime: true, plannedEndDate: '2026-10-03' },
      { id: '2', status: 'COMPLETED', isOnTime: true, plannedEndDate: '2026-10-07' },
      { id: '3', status: 'COMPLETED', isOnTime: false, plannedEndDate: '2026-10-10' }, // Overdue
      { id: '4', status: 'IN_PROGRESS', plannedEndDate: '2026-10-14' },
      { id: '5', status: 'SCHEDULED', plannedEndDate: '2026-10-17' },
      { id: '6', status: 'POSTPONED', plannedEndDate: '2026-10-21' },
    ]

    const stats = calculateMonthlyStats(mockItems)
    expect(stats.total).toBe(6)
    expect(stats.completed).toBe(3)
    expect(stats.inProgress).toBe(1)
    expect(stats.postponed).toBe(1)
    expect(stats.completionRate).toBe(50) // 3/6 = 50%
    expect(stats.onTimeCount).toBe(2)
    expect(stats.onTimeRate).toBe(67) // 2/3 = 66.6% -> 67%
  })

  it('getStatusMeta returns proper badge class and labels', () => {
    expect(getStatusMeta('COMPLETED').label).toBe('เสร็จสิ้น')
    expect(getStatusMeta('IN_PROGRESS').label).toBe('กำลังทำ')
    expect(getStatusMeta('DELAYED').label).toBe('ล่าช้า')
    expect(getStatusMeta('UNKNOWN').label).toBe('ตามแผน') // default fallback
  })
})

describe('PMMonthlyScheduleView UI Component', () => {
  const mockMachines = [
    { mc: 'DB-3014M', ki: '81798', location: 'GMK1', type: 'Double' },
    { mc: 'MC-02', ki: '81144', location: 'GMK3', type: 'Single' },
  ]

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders title, month selection buttons and KPI summary cards', async () => {
    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    expect(screen.getByText(/จัดทำแผน PM รายเดือน/)).toBeInTheDocument()
    expect(screen.getByText('แผนรายเดือน')).toBeInTheDocument()
    expect(screen.getByText('สรุปภาพรวมทั้งปี (12 เดือน)')).toBeInTheDocument()

    // 12 month buttons are rendered
    SHORT_THAI_MONTHS.forEach(name => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    })

    // KPI cards are present
    expect(screen.getByText('ทั้งหมดในแผน')).toBeInTheDocument()
    expect(screen.getByText('เสร็จสมบูรณ์')).toBeInTheDocument()
    expect(screen.getByText('กำลังทำ')).toBeInTheDocument()
    expect(screen.getByText('ล่าช้ากว่าแผน')).toBeInTheDocument()
    expect(screen.getByText('อัตราความสำเร็จ')).toBeInTheDocument()
  })

  it('renders Timeline Gantt view by default with legend and supports switching to List view', async () => {
    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    // Check View Mode Switcher buttons
    const timelineBtn = screen.getByRole('button', { name: /แถบเวลา \(Timeline\)/ })
    const listBtn = screen.getByRole('button', { name: /ตารางรายการ/ })
    expect(timelineBtn).toBeInTheDocument()
    expect(listBtn).toBeInTheDocument()

    // Check Timeline Legend
    expect(screen.getByText(/วันอาทิตย์ \(วันหยุด ไม่นับวันทำงาน\)/)).toBeInTheDocument()

    // Generate schedule
    const autoGenBtn = screen.getByRole('button', { name: /สร้างแผนอัตโนมัติ/ })
    fireEvent.click(autoGenBtn)

    await waitFor(() => {
      expect(screen.getAllByText('DB-3014M').length).toBeGreaterThan(0)
    })

    // Switch to List view
    fireEvent.click(listBtn)
    expect(screen.getByText('กำหนดตามแผน (3 วันทำการ)')).toBeInTheDocument()

    // Switch back to Timeline view
    fireEvent.click(timelineBtn)
    expect(screen.getByText(/สัญลักษณ์แถบสี:/)).toBeInTheDocument()
  })

  it('allows switching to Annual 12-Month Summary view', async () => {
    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    const annualTabBtn = screen.getByRole('button', { name: /สรุปภาพรวมทั้งปี/ })
    fireEvent.click(annualTabBtn)

    // Annual view headers are displayed
    expect(screen.getByText(/แผน PM รวมทั้งปี/)).toBeInTheDocument()
    expect(screen.getByText(/เสร็จสมบูรณ์ทั้งปี/)).toBeInTheDocument()
    expect(screen.getByText(/ตารางสรุปแผน PM 12 เดือน/)).toBeInTheDocument()

    // 12 months rows are listed in the table
    THAI_MONTHS.forEach(name => {
      expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0)
    })
  })
})
