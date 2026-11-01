import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PMMonthlyScheduleView, {
  getMonthlyWorkingDays,
  buildThreeDayBlocks,
  buildDayBlocks,
  autoGenerateMonthlySchedule,
  calculateMonthlyStats,
  getItemDayRange,
  getStatusMeta,
  resolveItemMachine,
  getStoredInUseMachinesFallback,
  syncWorkOrdersToMonthlyPlan,
  AVAILABLE_LOCATIONS,
  matchesLocation,
  getPMCountdown,
  augmentMachineWithPMPlan,
  sortMachinesByCountdownPriority,
  THAI_MONTHS,
  SHORT_THAI_MONTHS,
} from './PMMonthlyScheduleView'

// Mock AppConfigAPI & WorkOrderAPI
vi.mock('../../api/entities', () => ({
  AppConfigAPI: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ ok: true }),
    update: vi.fn().mockResolvedValue({ ok: true }),
  },
  WorkOrderAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  PMPlanAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  CylinderAPI: {
    list: vi.fn().mockResolvedValue([]),
  },
  countWorkingDaysExcludingSundays: (startDate, targetDate) => {
    if (!startDate || !targetDate) return 0
    const start = new Date(startDate)
    const end = new Date(targetDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    if (start.getTime() === end.getTime()) return 0
    const isFuture = end > start
    let current = isFuture ? new Date(start) : new Date(end)
    const stop = isFuture ? new Date(end) : new Date(start)
    let workingDays = 0
    while (current < stop) {
      current.setDate(current.getDate() + 1)
      if (current.getDay() !== 0) workingDays++
    }
    return isFuture ? workingDays : -workingDays
  },
  isSystemWorkOrder: vi.fn().mockReturnValue(false),
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

describe('resolveItemMachine & In-use Cylinder Machine Resolution', () => {
  const mockCylinders = [
    { NewMC: 'DA-306M', Serial_OLD: '66936', Location: 'GK3', Type: 'D', Machine_Ref: 'In-use-GMK3' },
    { NewMC: 'SC-368M', Serial_OLD: '62407', Location: 'GK1', Type: 'S', Machine_Ref: 'In-use-GMK1' },
    { NewMC: 'SB-363P', Serial_OLD: 'A1100551', Location: 'GK1', Type: 'S', Machine_Ref: 'In-use-GMK1' },
  ]

  it('resolves generic MC-01 with Serial_OLD 66936 to real current machine DA-306M', () => {
    const rawItem = {
      id: 'PMSCH-202610-01',
      mc: 'MC-01',
      ki: '66936',
      location: 'GK3',
      type: 'D',
    }

    const resolved = resolveItemMachine(rawItem, mockCylinders)
    expect(resolved.mc).toBe('DA-306M')
    expect(resolved.ki).toBe('66936')
    expect(resolved.location).toBe('GK3')
    expect(resolved.type).toBe('D')
  })

  it('resolves generic MC-02 with Serial_OLD 62407 to real current machine SC-368M', () => {
    const rawItem = {
      id: 'PMSCH-202610-02',
      mc: 'MC-02',
      ki: '62407',
      location: 'GK1',
      type: 'S',
    }

    const resolved = resolveItemMachine(rawItem, mockCylinders)
    expect(resolved.mc).toBe('SC-368M')
    expect(resolved.ki).toBe('62407')
  })

  it('resolves generic MC-03 with Serial_OLD A1100551 to real current machine SB-363P', () => {
    const rawItem = {
      id: 'PMSCH-202610-03',
      mc: 'MC-03',
      ki: 'A1100551',
      location: 'GK1',
      type: 'S',
    }

    const resolved = resolveItemMachine(rawItem, mockCylinders)
    expect(resolved.mc).toBe('SB-363P')
  })

  it('preserves existing real machine code if already resolved', () => {
    const rawItem = {
      id: 'PMSCH-202610-01',
      mc: 'DA-306M',
      ki: '66936',
      location: 'GK3',
      type: 'D',
    }

    const resolved = resolveItemMachine(rawItem, mockCylinders)
    expect(resolved.mc).toBe('DA-306M')
  })

  it('resolves from localStorage fallback when cylindersOrMachines is empty', () => {
    localStorage.setItem('textileops_tbl_cylinders', JSON.stringify(mockCylinders))

    const rawItem = {
      id: 'PMSCH-202610-01',
      mc: 'MC-01',
      ki: '66936',
      location: 'GK3',
      type: 'D',
    }

    const resolved = resolveItemMachine(rawItem, [])
    expect(resolved.mc).toBe('DA-306M')
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

    const confirmBtn = screen.getByRole('button', { name: /ยืนยันสร้างแผนงาน/ })
    fireEvent.click(confirmBtn)

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

  it('auto-heals existing saved schedule containing MC-01 (66936) to DA-306M on display', async () => {
    const mockInUse = [
      { mc: 'DA-306M', ki: '66936', location: 'GK3', type: 'D' },
      { mc: 'SC-368M', ki: '62407', location: 'GK1', type: 'S' },
    ]

    // Pre-populate localStorage with legacy schedule saved as MC-01
    const legacySchedule = [
      {
        id: 'PMSCH-202610-01',
        mc: 'MC-01',
        ki: '66936',
        location: 'GK3',
        type: 'D',
        plannedStartDate: '2026-10-01',
        plannedEndDate: '2026-10-03',
        status: 'SCHEDULED',
      },
    ]

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    localStorage.setItem(`pm_monthly_schedule_${monthKey}`, JSON.stringify(legacySchedule))

    render(<PMMonthlyScheduleView machinesList={mockInUse} />)

    // Should display DA-306M instead of MC-01
    await waitFor(() => {
      expect(screen.getAllByText('DA-306M').length).toBeGreaterThan(0)
      expect(screen.queryByText('MC-01')).not.toBeInTheDocument()
    })
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

describe('syncWorkOrdersToMonthlyPlan - PM Work Order Auto-Sync', () => {
  const inUseMachines = [
    { NewMC: 'DA-306M', Serial_OLD: '66936', Location: 'GK3', Type: 'D' },
    { NewMC: 'SC-368M', Serial_OLD: '62407', Location: 'GK1', Type: 'S' },
  ]

  const initialPlan = [
    {
      id: 'PMSCH-202610-01',
      mc: 'DA-306M',
      ki: '66936',
      plannedStartDate: '2026-10-01',
      plannedEndDate: '2026-10-03',
      status: 'SCHEDULED',
    },
    {
      id: 'PMSCH-202610-02',
      mc: 'SC-368M',
      ki: '62407',
      plannedStartDate: '2026-10-05',
      plannedEndDate: '2026-10-07',
      status: 'SCHEDULED',
    },
  ]

  it('updates in-plan machine with actual dates, tech, status and workOrderId from PM work order', () => {
    const mockWOs = [
      {
        Job_ID: 'WO-202610-001',
        JobType: 'PM',
        MC: 'DA-306M',
        KI: '66936',
        StartDate: '2026-10-01',
        EndDate: '2026-10-03',
        Technicians: 'ช่างหนึ่ง',
        Status: 'COMPLETED',
        Comment: 'ล้างเครื่องเรียบร้อย',
      },
    ]

    const synced = syncWorkOrdersToMonthlyPlan(initialPlan, mockWOs, inUseMachines, 2026, 10)
    expect(synced).toHaveLength(2)

    const da = synced[0]
    expect(da.mc).toBe('DA-306M')
    expect(da.status).toBe('COMPLETED')
    expect(da.actualStartDate).toBe('2026-10-01')
    expect(da.actualEndDate).toBe('2026-10-03')
    expect(da.actualTech).toBe('ช่างหนึ่ง')
    expect(da.workOrderId).toBe('WO-202610-001')
    expect(da.isOnTime).toBe(true)
  })

  it('appends unplanned PM work order for machine not in initial plan with isUnplanned: true', () => {
    const mockWOs = [
      {
        Job_ID: 'WO-202610-999',
        JobType: 'PM',
        MC: 'SB-363P',
        KI: 'A1100551',
        StartDate: '2026-10-15',
        EndDate: '2026-10-16',
        Technicians: 'ช่างดล',
        Status: 'IN_PROGRESS',
        Comment: 'ล้างด่วนนอกแผน',
      },
    ]

    const synced = syncWorkOrdersToMonthlyPlan(initialPlan, mockWOs, inUseMachines, 2026, 10)
    expect(synced).toHaveLength(3) // 2 planned + 1 unplanned

    const unplanned = synced[2]
    expect(unplanned.mc).toBe('SB-363P')
    expect(unplanned.isUnplanned).toBe(true)
    expect(unplanned.workOrderId).toBe('WO-202610-999')
    expect(unplanned.status).toBe('IN_PROGRESS')
    expect(unplanned.actualStartDate).toBe('2026-10-15')
  })
})

describe('Dual Timeline View & 3-Mode Filter Controls', () => {
  const mockMachines = [
    { mc: 'DA-306M', ki: '66936', location: 'GK3', type: 'D' },
  ]

  beforeEach(() => {
    localStorage.clear()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const monthKey = `${y}-${m}`
    const mockScheduleWithActual = [
      {
        id: `PMSCH-${y}${m}-01`,
        mc: 'DA-306M',
        ki: '66936',
        plannedStartDate: `${y}-${m}-01`,
        plannedEndDate: `${y}-${m}-03`,
        actualStartDate: `${y}-${m}-01`,
        actualEndDate: `${y}-${m}-03`,
        actualTech: 'ช่างหนึ่ง',
        status: 'COMPLETED',
        workOrderId: `WO-${y}${m}-001`,
      },
    ]
    localStorage.setItem(`pm_monthly_schedule_${monthKey}`, JSON.stringify(mockScheduleWithActual))
  })

  it('renders Dual Timeline view with both Planned and Actual bars by default', async () => {
    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    // Check Dual View filter buttons
    expect(screen.getByRole('button', { name: /ดูคู่กัน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เฉพาะแผน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เฉพาะทำจริง/ })).toBeInTheDocument()

    // Both planned and actual bars are rendered
    await waitFor(() => {
      expect(screen.getByText(/แผน: DA-306M/)).toBeInTheDocument()
      expect(screen.getByText(/จริง: ช่างหนึ่ง/)).toBeInTheDocument()
    })
  })

  it('switches to planned-only and actual-only views when filter buttons clicked', async () => {
    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    const plannedOnlyBtn = screen.getByRole('button', { name: /เฉพาะแผน/ })
    const actualOnlyBtn = screen.getByRole('button', { name: /เฉพาะทำจริง/ })

    // Click Planned Only
    fireEvent.click(plannedOnlyBtn)
    await waitFor(() => {
      expect(screen.getByText(/แผน: DA-306M/)).toBeInTheDocument()
      expect(screen.queryByText(/จริง: ช่างหนึ่ง/)).not.toBeInTheDocument()
    })

    // Click Actual Only
    fireEvent.click(actualOnlyBtn)
    await waitFor(() => {
      expect(screen.queryByText(/แผน: DA-306M/)).not.toBeInTheDocument()
      expect(screen.getByText(/จริง: ช่างหนึ่ง/)).toBeInTheDocument()
    })
  })
})

describe('matchesLocation & Location Multi-Selection Logic', () => {
  it('returns true when selectedLocations is empty or includes ALL', () => {
    expect(matchesLocation('GK1', [])).toBe(true)
    expect(matchesLocation('GK1', ['ALL'])).toBe(true)
    expect(matchesLocation('GK3', ['ALL'])).toBe(true)
    expect(matchesLocation('', ['ALL'])).toBe(true)
  })

  it('correctly maps GMK1 <-> GK1, GMK3 <-> GK3, GMK4 <-> GK4', () => {
    expect(matchesLocation('GK1', ['GMK1'])).toBe(true)
    expect(matchesLocation('GK3', ['GMK3'])).toBe(true)
    expect(matchesLocation('GK4', ['GMK4'])).toBe(true)
    expect(matchesLocation('GMK1', ['GMK1'])).toBe(true)
    expect(matchesLocation('GK1', ['GMK3'])).toBe(false)
    expect(matchesLocation('GK3', ['GMK1'])).toBe(false)
  })

  it('supports multi-selection of locations (e.g. GMK1 and GMK3)', () => {
    const selected = ['GMK1', 'GMK3']
    expect(matchesLocation('GK1', selected)).toBe(true)
    expect(matchesLocation('GK3', selected)).toBe(true)
    expect(matchesLocation('GK4', selected)).toBe(false)
  })

  it('autoGenerateMonthlySchedule filters machines by selectedLocations', () => {
    const testMachines = [
      { mc: 'MC-GK1-A', location: 'GK1', ki: '111', type: 'S' },
      { mc: 'MC-GK1-B', location: 'GK1', ki: '222', type: 'S' },
      { mc: 'MC-GK3-A', location: 'GK3', ki: '333', type: 'D' },
      { mc: 'MC-GK4-A', location: 'GK4', ki: '444', type: 'D' },
    ]

    // Only GMK1
    const gmk1Sched = autoGenerateMonthlySchedule(2026, 10, testMachines, ['GMK1'])
    expect(gmk1Sched.every(item => item.location === 'GK1')).toBe(true)
    expect(gmk1Sched.some(item => item.mc === 'MC-GK1-A')).toBe(true)
    expect(gmk1Sched.some(item => item.mc === 'MC-GK3-A')).toBe(false)

    // GMK1 + GMK3
    const multiSched = autoGenerateMonthlySchedule(2026, 10, testMachines, ['GMK1', 'GMK3'])
    expect(multiSched.every(item => item.location === 'GK1' || item.location === 'GK3')).toBe(true)
    expect(multiSched.some(item => item.mc === 'MC-GK4-A')).toBe(false)
  })
})

describe('Location Toolbar Filter & Modal UI Interaction', () => {
  const multiLocMachines = [
    { mc: 'DA-306M', ki: '66936', location: 'GK3', type: 'D' },
    { mc: 'SC-368M', ki: '62407', location: 'GK1', type: 'S' },
    { mc: 'KB-400M', ki: '99999', location: 'GK4', type: 'S' },
  ]

  beforeEach(() => {
    localStorage.clear()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const monthKey = `${y}-${m}`
    const schedule = [
      {
        id: 'PMSCH-01',
        mc: 'DA-306M',
        location: 'GK3',
        plannedStartDate: `${y}-${m}-01`,
        plannedEndDate: `${y}-${m}-03`,
        status: 'SCHEDULED',
      },
      {
        id: 'PMSCH-02',
        mc: 'SC-368M',
        location: 'GK1',
        plannedStartDate: `${y}-${m}-05`,
        plannedEndDate: `${y}-${m}-07`,
        status: 'SCHEDULED',
      },
    ]
    localStorage.setItem(`pm_monthly_schedule_${monthKey}`, JSON.stringify(schedule))
  })

  it('renders location filter chips on toolbar and filters items when clicked', async () => {
    render(<PMMonthlyScheduleView machinesList={multiLocMachines} />)

    // Check location chips
    expect(screen.getByRole('button', { name: /^ทั้งหมด$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GMK1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GMK3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GMK4/ })).toBeInTheDocument()

    // Initially both GMK3 (DA-306M) and GMK1 (SC-368M) are shown
    await waitFor(() => {
      expect(screen.getAllByText(/DA-306M/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/SC-368M/).length).toBeGreaterThan(0)
    })

    // Filter by GMK1
    const gmk1Chip = screen.getByRole('button', { name: /GMK1/ })
    fireEvent.click(gmk1Chip)

    await waitFor(() => {
      expect(screen.getAllByText(/SC-368M/).length).toBeGreaterThan(0)
      expect(screen.queryAllByText(/DA-306M/).length).toBe(0)
    })

    // Click 'ทั้งหมด' to reset
    const allChip = screen.getByRole('button', { name: /^ทั้งหมด$/ })
    fireEvent.click(allChip)

    await waitFor(() => {
      expect(screen.getAllByText(/DA-306M/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/SC-368M/).length).toBeGreaterThan(0)
    })
  })

  it('opens Location Selection Modal with machine counts when auto-generate button is clicked', async () => {
    render(<PMMonthlyScheduleView machinesList={multiLocMachines} />)

    const autoGenBtn = screen.getByRole('button', { name: /สร้างแผนอัตโนมัติ/ })
    fireEvent.click(autoGenBtn)

    // Modal title
    expect(screen.getByText('จัดทำแผน PM รายเดือนอัตโนมัติ (3 วัน/เครื่อง)')).toBeInTheDocument()
    expect(screen.getByText(/เลือกสถานที่ \/ โรงงาน/)).toBeInTheDocument()

    // Confirm button shows total machines
    const confirmBtn = screen.getByRole('button', { name: /ยืนยันสร้างแผนงาน/ })
    expect(confirmBtn).toBeInTheDocument()
  })
})

describe('Countdown Priority & Most Overdue First Scheduling Logic', () => {
  it('getPMCountdown calculates overdue, today, and future working days accurately', () => {
    // Empty or invalid date
    expect(getPMCountdown(null)).toEqual({ days: null, label: '—', color: 'gray' })
    expect(getPMCountdown('')).toEqual({ days: null, label: '—', color: 'gray' })

    // Date in the past (overdue): e.g. 100 days ago
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 150)
    const overdueRes = getPMCountdown(pastDate.toISOString().slice(0, 10))
    expect(overdueRes.color).toBe('red')
    expect(overdueRes.days).toBeLessThan(0)
    expect(overdueRes.label).toMatch(/^เกิน \d+ วัน$/)

    // Date today
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayRes = getPMCountdown(todayStr)
    expect(todayRes.color).toBe('yellow')
    expect(todayRes.days).toBe(0)
    expect(todayRes.label).toBe('ครบกำหนดวันนี้')

    // Date in the future (remaining)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const futureRes = getPMCountdown(futureDate.toISOString().slice(0, 10))
    expect(futureRes.color).toBe('green')
    expect(futureRes.days).toBeGreaterThan(0)
    expect(futureRes.label).toMatch(/^เหลือ \d+ วัน$/)
  })

  it('sortMachinesByCountdownPriority places most overdue machines first (-100 > -98 > 0 > +5 > null)', () => {
    const rawList = [
      { mc: 'MC-FUTURE', countdownDays: 10, countdownLabel: 'เหลือ 10 วัน' },
      { mc: 'MC-NO-DATE', countdownDays: null, countdownLabel: '—' },
      { mc: 'MC-OVERDUE-98', countdownDays: -98, countdownLabel: 'เกิน 98 วัน' },
      { mc: 'MC-TODAY', countdownDays: 0, countdownLabel: 'ครบกำหนดวันนี้' },
      { mc: 'MC-OVERDUE-100', countdownDays: -100, countdownLabel: 'เกิน 100 วัน' },
    ]

    const sorted = sortMachinesByCountdownPriority(rawList)
    const names = sorted.map(m => m.mc)

    expect(names).toEqual([
      'MC-OVERDUE-100',
      'MC-OVERDUE-98',
      'MC-TODAY',
      'MC-FUTURE',
      'MC-NO-DATE',
    ])
  })

  it('augmentMachineWithPMPlan matches machine by KI or MC and attaches countdown info', () => {
    const pmPlans = [
      { Machine_KI: 'KI-66936', Machine_MC: 'DA-306M', Next_PM_Date: '2026-06-15', Last_PM_Date: '2026-05-15' },
    ]

    const machine = { mc: 'DA-306M', ki: 'KI-66936', location: 'GK3', type: 'D' }
    const augmented = augmentMachineWithPMPlan(machine, pmPlans)

    expect(augmented.nextPmDate).toBe('2026-06-15')
    expect(augmented.lastPmDate).toBe('2026-05-15')
    expect(augmented.countdownDays).toBeLessThan(0)
    expect(augmented.countdownLabel).toMatch(/^เกิน \d+ วัน$/)
    expect(augmented.countdownColor).toBe('red')
  })

  it('autoGenerateMonthlySchedule places the most overdue machine in the very first block', () => {
    const machines = [
      { mc: 'MC-NORMAL', ki: '001', location: 'GK1', countdownDays: 5, countdownLabel: 'เหลือ 5 วัน' },
      { mc: 'MC-OVERDUE-100', ki: '002', location: 'GK3', countdownDays: -100, countdownLabel: 'เกิน 100 วัน' },
      { mc: 'MC-OVERDUE-98', ki: '003', location: 'GK1', countdownDays: -98, countdownLabel: 'เกิน 98 วัน' },
    ]

    const sched = autoGenerateMonthlySchedule(2026, 10, machines, ['ALL'])
    expect(sched.length).toBeGreaterThanOrEqual(3)

    // Block 1 (Day 1-3) MUST have the most overdue machine (MC-OVERDUE-100)
    expect(sched[0].mc).toBe('MC-OVERDUE-100')
    expect(sched[0].plannedStartDate).toBe('2026-10-01')
    expect(sched[0].plannedEndDate).toBe('2026-10-03')
    expect(sched[0].countdownLabel).toBe('เกิน 100 วัน')

    // Block 2 (Day 5-7, skipping Sunday Oct 4) MUST have the second most overdue machine (MC-OVERDUE-98)
    expect(sched[1].mc).toBe('MC-OVERDUE-98')
    expect(sched[1].plannedStartDate).toBe('2026-10-05')
    expect(sched[1].plannedEndDate).toBe('2026-10-07')
    expect(sched[1].countdownLabel).toBe('เกิน 98 วัน')

    // Block 3 MUST have MC-NORMAL
    expect(sched[2].mc).toBe('MC-NORMAL')
  })
})

describe('Configurable Days Per Machine (1, 2, 3, 4, 5 days/machine)', () => {
  it('buildDayBlocks chunks working days into specified days per machine and skips Sundays', () => {
    const octWorkingDays = getMonthlyWorkingDays(2026, 10) // 27 working days in Oct 2026

    // 1 Day per machine -> 27 blocks of 1 day each
    const blocks1 = buildDayBlocks(octWorkingDays, 1)
    expect(blocks1).toHaveLength(27)
    expect(blocks1[0].startDate).toBe('2026-10-01')
    expect(blocks1[0].endDate).toBe('2026-10-01')
    expect(blocks1[0].workingDaysCount).toBe(1)

    // 2 Days per machine -> 14 blocks (13 blocks of 2 days + 1 block of 1 day = 27 days)
    const blocks2 = buildDayBlocks(octWorkingDays, 2)
    expect(blocks2).toHaveLength(14)
    // Block 1: Oct 1-2
    expect(blocks2[0].startDate).toBe('2026-10-01')
    expect(blocks2[0].endDate).toBe('2026-10-02')
    expect(blocks2[0].workingDaysCount).toBe(2)
    // Block 2: Oct 3 and Oct 5 (skipping Sunday Oct 4)
    expect(blocks2[1].startDate).toBe('2026-10-03')
    expect(blocks2[1].endDate).toBe('2026-10-05')
    expect(blocks2[1].workingDaysCount).toBe(2)

    // 3 Days per machine -> matches buildThreeDayBlocks exactly
    const blocks3 = buildDayBlocks(octWorkingDays, 3)
    const blocks3Legacy = buildThreeDayBlocks(octWorkingDays)
    expect(blocks3).toEqual(blocks3Legacy)
    expect(blocks3).toHaveLength(9)

    // 4 Days per machine -> 7 blocks (6 blocks of 4 days + 1 block of 3 days = 27 days)
    const blocks4 = buildDayBlocks(octWorkingDays, 4)
    expect(blocks4).toHaveLength(7)
  })

  it('autoGenerateMonthlySchedule respects custom daysPerMachine parameter', () => {
    const machines = [
      { mc: 'MC-OVERDUE-100', countdownDays: -100, countdownLabel: 'เกิน 100 วัน' },
      { mc: 'MC-OVERDUE-50', countdownDays: -50, countdownLabel: 'เกิน 50 วัน' },
    ]

    // Generate with 2 days per machine
    const sched2Days = autoGenerateMonthlySchedule(2026, 10, machines, ['ALL'], [], 2)
    expect(sched2Days).toHaveLength(14)
    expect(sched2Days[0].workingDays).toBe(2)
    expect(sched2Days[0].plannedStartDate).toBe('2026-10-01')
    expect(sched2Days[0].plannedEndDate).toBe('2026-10-02')

    // Generate with default (3 days per machine)
    const schedDefault = autoGenerateMonthlySchedule(2026, 10, machines, ['ALL'])
    expect(schedDefault).toHaveLength(9)
    expect(schedDefault[0].workingDays).toBe(3)
    expect(schedDefault[0].plannedStartDate).toBe('2026-10-01')
    expect(schedDefault[0].plannedEndDate).toBe('2026-10-03')
  })

  it('Modal renders Days Per Machine selector chips and calculates blocks dynamically', async () => {
    const mockMachines = [
      { mc: 'DA-306M', ki: '66936', location: 'GK3', type: 'D' },
    ]

    render(<PMMonthlyScheduleView machinesList={mockMachines} />)

    // Click Auto-Generate to open modal
    const autoGenBtn = screen.getByRole('button', { name: /สร้างแผนอัตโนมัติ/ })
    fireEvent.click(autoGenBtn)

    // Check Days Per Machine options
    expect(screen.getByText('กำหนดจำนวนวันทำการต่อเครื่อง:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^1 วัน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^2 วัน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^3 วัน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^4 วัน/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^5 วัน/ })).toBeInTheDocument()

    // Click 2 วัน button
    const twoDaysBtn = screen.getByRole('button', { name: /^2 วัน$/ })
    fireEvent.click(twoDaysBtn)

    // Verify dynamic block calculation in summary box (for a working-day month: workingDays / 2 blocks)
    const now = new Date()
    const workingDays = getMonthlyWorkingDays(now.getFullYear(), now.getMonth() + 1)
    const expectedBlocks = Math.floor(workingDays.length / 2)
    expect(screen.getByText(new RegExp(`${expectedBlocks} บล็อก`))).toBeInTheDocument()

    // Confirm button
    const confirmBtn = screen.getByRole('button', { name: /ยืนยันสร้างแผนงาน/ })
    expect(confirmBtn).toBeInTheDocument()
    fireEvent.click(confirmBtn)
  })
})

describe('Save Plan, Delete Month Plan, and Item Actions (Edit/Delete)', () => {
  const testMachines = [
    { mc: 'DA-306M', ki: '66936', location: 'GK3', type: 'D' },
    { mc: 'SC-368M', ki: '62407', location: 'GK1', type: 'S' },
  ]

  beforeEach(() => {
    localStorage.clear()
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const monthKey = `${y}-${m}`
    const schedule = [
      {
        id: 'PMSCH-01',
        mc: 'DA-306M',
        location: 'GK3',
        plannedStartDate: `${y}-${m}-01`,
        plannedEndDate: `${y}-${m}-03`,
        status: 'SCHEDULED',
      },
    ]
    localStorage.setItem(`pm_monthly_schedule_${monthKey}`, JSON.stringify(schedule))
  })

  it('renders Explicit Save Plan button and Delete Month Plan button when items exist', async () => {
    render(<PMMonthlyScheduleView machinesList={testMachines} />)

    // Save Plan button
    const saveBtn = screen.getByRole('button', { name: /บันทึกแผน/ })
    expect(saveBtn).toBeInTheDocument()

    // Delete Month Plan button
    const deleteMonthBtn = screen.getByRole('button', { name: /ลบแผนเดือนนี้/ })
    expect(deleteMonthBtn).toBeInTheDocument()

    // Clicking Save Plan triggers save
    fireEvent.click(saveBtn)
  })

  it('opens Delete Month Plan confirmation modal and clears schedule on confirm', async () => {
    render(<PMMonthlyScheduleView machinesList={testMachines} />)

    const deleteMonthBtn = screen.getByRole('button', { name: /ลบแผนเดือนนี้/ })
    fireEvent.click(deleteMonthBtn)

    // Modal title & content
    expect(screen.getByText(/ยืนยันลบแผนงานประจำเดือน/)).toBeInTheDocument()
    expect(screen.getByText(/คุณแน่ใจหรือไม่ที่จะลบแผนงานทั้งหมด/)).toBeInTheDocument()

    // Confirm delete button inside modal
    const confirmDelBtn = screen.getByRole('button', { name: /ยืนยันลบแผนงาน/ })
    expect(confirmDelBtn).toBeInTheDocument()
    fireEvent.click(confirmDelBtn)

    // Schedule is now cleared (0 items)
    await waitFor(() => {
      expect(screen.getByText(/ยังไม่มีรายการแผน PM สำหรับเดือน/)).toBeInTheDocument()
    })
  })

  it('renders Edit and Delete action buttons on Timeline Gantt rows', async () => {
    render(<PMMonthlyScheduleView machinesList={testMachines} />)

    // In timeline view, check for edit and delete buttons
    const editBtn = screen.getByTitle(/แก้ไขแผน: DA-306M/)
    expect(editBtn).toBeInTheDocument()

    const deleteBtn = screen.getByTitle(/ลบ DA-306M ออกจากแผน/)
    expect(deleteBtn).toBeInTheDocument()

    // Clicking edit button opens AddEdit modal
    fireEvent.click(editBtn)
    expect(screen.getByText(/แก้ไขแผน: DA-306M/)).toBeInTheDocument()
  })
})
