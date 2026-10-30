import { describe, expect, it } from 'vitest'
import {
  normalizeNeedleSet,
  generateCenterCheckDocNo,
  DEFAULT_SINGLE_CHECKLIST_ITEMS,
  DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  isSystemWorkOrder,
  calculateSundayMinutes,
  countWorkingDaysExcludingSundays,
  calculateShiftWorkingMinutes,
  calculateDuration,
  calculateSlaPerformance,
  normalizeSpareNeedleRequest,
  SpareNeedleRequestAPI,
} from './entities'

describe('CenterCheck Entities & Helpers', () => {
  it('has default checklist items for Single (10) and Double (12) Jersey', () => {
    expect(DEFAULT_SINGLE_CHECKLIST_ITEMS.length).toBe(10)
    expect(DEFAULT_DOUBLE_CHECKLIST_ITEMS.length).toBe(12)
    expect(DEFAULT_SINGLE_CHECKLIST_ITEMS[0].item).toBe('กลม cylinder')
    expect(DEFAULT_DOUBLE_CHECKLIST_ITEMS[0].item).toBe('กลม Cylinder')
  })

  it('generates valid doc numbers for Single and Double Jersey', () => {
    const singleDoc = generateCenterCheckDocNo('Single', [])
    expect(singleDoc).toMatch(/^CS-S-\d{8}-001$/)

    const doubleDoc = generateCenterCheckDocNo('Double', [])
    expect(doubleDoc).toMatch(/^CS-D-\d{8}-001$/)
  })

  it('increments doc number sequence when existing records exist for today', () => {
    const existing = [
      { doc_no: generateCenterCheckDocNo('Single', []) },
    ]
    const nextDoc = generateCenterCheckDocNo('Single', existing)
    expect(nextDoc).toMatch(/^CS-S-\d{8}-002$/)
  })
})

describe('isSystemWorkOrder helper', () => {
  it('correctly identifies background system config records', () => {
    expect(isSystemWorkOrder({ MC: '__SYSTEM__', WO_ID: 'SYS_CENTER_CHECKS' })).toBe(true)
    expect(isSystemWorkOrder({ MC: '__SYSTEM__', Problem: '__SYS_CONFIG__' })).toBe(true)
    expect(isSystemWorkOrder({ WO_ID: 'SYS_TECHNICIANS' })).toBe(true)
    expect(isSystemWorkOrder({ WO_ID: 'SYS_NEEDLE_CONDITIONS' })).toBe(true)
  })

  it('allows real factory work orders to pass through', () => {
    expect(isSystemWorkOrder({ MC: 'DA-305M', WO_ID: 'JOB-20260826-0001', Problem: 'Design test' })).toBe(false)
    expect(isSystemWorkOrder({ MC: 'DB-341m', Job_ID: 'JOB-20260825-0001', Problem: 'ขึ้นด้าย' })).toBe(false)
  })
})

describe('Sunday Calculation Helpers', () => {
  it('calculateSundayMinutes calculates exact overlap on Sundays', () => {
    // Saturday 2026-08-29 12:00 to Monday 2026-08-31 12:00
    // Sunday 2026-08-30 is a full 24h (1440 minutes)
    const start = '2026-08-29T12:00:00Z'
    const end = '2026-08-31T12:00:00Z'
    const mins = calculateSundayMinutes(start, end)
    expect(mins).toBe(1440)
  })

  it('countWorkingDaysExcludingSundays excludes Sundays correctly', () => {
    // Saturday 2026-08-29 to Monday 2026-08-31: 2 working days (Sat, Mon; Sunday excluded)
    const workingDays = countWorkingDaysExcludingSundays('2026-08-29', '2026-08-31')
    expect(workingDays).toBe(1)
  })
})

describe('12h/Day Working Shift & SLA Calculations', () => {
  it('calculateShiftWorkingMinutes calculates same-day shift hours accurately', () => {
    // 08:30 to 17:00 on the same weekday (8.5 hrs = 510 minutes)
    const start = new Date(2026, 9, 29, 8, 30, 0)
    const end = new Date(2026, 9, 29, 17, 0, 0)
    const mins = calculateShiftWorkingMinutes(start, end)
    expect(mins).toBe(510)
  })

  it('calculateShiftWorkingMinutes correctly deducts 12h off-shift night hours across overnight job', () => {
    // Yesterday 08:00 to Today 11:06
    // Gross = 27h 6m = 1626 min
    // Day 1 shift (08:00 - 20:00) = 720 min
    // Night off-shift (20:00 - 08:00) = 720 min (deducted!)
    // Day 2 shift (08:00 - 11:06) = 186 min
    // Working shift minutes = 720 + 186 = 906 min = 15.1 hours
    const start = new Date(2026, 9, 29, 8, 0, 0)
    const end = new Date(2026, 9, 30, 11, 6, 0)
    const mins = calculateShiftWorkingMinutes(start, end)
    expect(mins).toBe(906)
  })

  it('calculateDuration returns comprehensive breakdown with 12h shift and off-shift hours', () => {
    const start = new Date(2026, 9, 29, 8, 0, 0)
    const end = new Date(2026, 9, 30, 11, 6, 0)
    const result = calculateDuration(start, end)
    expect(result.grossHoursDecimal).toBe(27.1)
    expect(result.offShiftHoursDecimal).toBe(12.0)
    expect(result.offShiftDurationText).toBe('12 ชม.')
    expect(result.sundayHoursDecimal).toBe(0)
    expect(result.netHoursDecimal).toBe(15.1)
    expect(result.netDurationText).toBe('15 ชม. 6 นาที')
  })

  it('calculateDuration handles weekend shift spanning Saturday to Monday', () => {
    // Saturday 18:00 to Monday 10:00
    // Sat: 18:00 - 20:00 = 2 hrs (120m)
    // Sun: Sunday excluded = 0m (24h deducted)
    // Mon: 08:00 - 10:00 = 2 hrs (120m)
    // Total working shift = 4 hrs (240m)
    // Gross = 40 hrs (2400m)
    const sat = new Date(2026, 9, 24, 18, 0, 0)
    const mon = new Date(2026, 9, 26, 10, 0, 0)
    const result = calculateDuration(sat, mon)
    expect(result.grossHoursDecimal).toBe(40.0)
    expect(result.sundayHoursDecimal).toBe(24.0)
    expect(result.offShiftHoursDecimal).toBe(12.0)
    expect(result.netHoursDecimal).toBe(4.0)
    expect(result.netDurationText).toBe('4 ชม.')
  })

  it('calculateSlaPerformance evaluates ongoing job against 24h KPI target without false overdue', () => {
    // 27.1 calendar hours overnight job with target 2.0 days (24 working hours)
    // Working hours = 15.1 hrs <= 24 hrs -> On Time!
    const job = {
      Job_ID: 'JOB-20261029-0001',
      JobType: 'PM',
      Status: 'IN_PROGRESS',
      StartTimestamp: new Date(2026, 9, 29, 8, 0, 0).toISOString(),
    }
    const fixedNow = new Date(2026, 9, 30, 11, 6, 0)
    const end = fixedNow.toISOString()
    const targetMap = { PM: 2.0 } // 2 days * 12h = 24h
    const sla = calculateSlaPerformance({ ...job, EndTimestamp: end }, targetMap, 12)
    expect(sla.isOnTime).toBe(true)
    expect(sla.netHoursDecimal).toBe(15.1)
    expect(sla.targetHours).toBe(24)
    expect(sla.label).toBe('อยู่ในเกณฑ์ (15.1/24ชม.)')
    expect(sla.badgeClass).toBe('badge-blue')
  })

  it('calculateSlaPerformance marks job overdue when actual shift hours exceed KPI target', () => {
    // 15.1 working hours with target 1.0 day (12 working hours) -> Overdue!
    const job = {
      Job_ID: 'JOB-20261029-0002',
      JobType: 'REPAIR',
      Status: 'IN_PROGRESS',
      StartTimestamp: new Date(2026, 9, 29, 8, 0, 0).toISOString(),
      EndTimestamp: new Date(2026, 9, 30, 11, 6, 0).toISOString(),
    }
    const targetMap = { REPAIR: 1.0 } // 1 day * 12h = 12h
    const sla = calculateSlaPerformance(job, targetMap, 12)
    expect(sla.isOnTime).toBe(false)
    expect(sla.netHoursDecimal).toBe(15.1)
    expect(sla.targetHours).toBe(12)
    expect(sla.label).toBe('เกินเวลา SLA (15.1/12ชม.)')
    expect(sla.badgeClass).toBe('badge-red')
  })

  it('calculateSlaPerformance marks completed job as On-Time or Overdue properly', () => {
    const onTimeJob = {
      Job_ID: 'JOB-20261029-0003',
      JobType: 'REPAIR',
      Status: 'COMPLETED',
      StartTimestamp: new Date(2026, 9, 29, 8, 0, 0).toISOString(),
      EndTimestamp: new Date(2026, 9, 29, 14, 0, 0).toISOString(), // 6 hours
    }
    const sla = calculateSlaPerformance(onTimeJob, { REPAIR: 1.0 }, 12)
    expect(sla.isOnTime).toBe(true)
    expect(sla.netHoursDecimal).toBe(6.0)
    expect(sla.label).toBe('ทันเป้าหมาย (On-Time)')
    expect(sla.badgeClass).toBe('badge-green')
  })
})

describe('CenterCheckStandardsAPI', () => {
  it('identifies SYS_CENTER_CHECK_STANDARDS as a system work order', () => {
    expect(isSystemWorkOrder({ WO_ID: 'SYS_CENTER_CHECK_STANDARDS' })).toBe(true)
    expect(isSystemWorkOrder({ MC: '__SYSTEM__', WO_ID: 'SYS_CENTER_CHECK_STANDARDS', Problem: '__SYS_CONFIG__' })).toBe(true)
  })
})

describe('SpareNeedleRequest Entities & Normalizer', () => {
  it('correctly normalizes spare needle request with tracks and defaults', () => {
    const raw = {
      id: 'SNR-20260924-0001',
      machine_mc: 'DG-341M',
      gauge: '28G',
      technician_name: 'ช่างหนึ่ง',
      shift: 'กะเช้า',
      tracks_requested: {
        dial: { singker: 20, t1: 10, t2: 5 },
        cylinder: { t1: 5, t2: 5, t3: 0, t4: 0 },
      },
      request_comment: 'เข็มหักจากลายริ้ว',
    }
    const norm = normalizeSpareNeedleRequest(raw)
    expect(norm.id).toBe('SNR-20260924-0001')
    expect(norm.request_no).toBe('SNR-20260924-0001')
    expect(norm.machine_mc).toBe('DG-341M')
    expect(norm.gauge).toBe('28G')
    expect(norm.technician_name).toBe('ช่างหนึ่ง')
    expect(norm.status).toBe('PENDING')
    expect(norm.tracks_requested.dial.singker).toBe(20)
    expect(norm.tracks_requested.dial.t1).toBe(10)
    expect(norm.tracks_requested.cylinder.t2).toBe(5)
    expect(norm.issued_items).toEqual([])

    const defaultNorm = normalizeSpareNeedleRequest({})
    expect(defaultNorm.tracks_requested.dial).toEqual({ t1: 0, t2: 0, singker: 0 })
  })

  it('identifies SYS_SPARE_NEEDLE_REQUESTS as a system work order', () => {
    expect(isSystemWorkOrder({ WO_ID: 'SYS_SPARE_NEEDLE_REQUESTS' })).toBe(true)
  })

  it('exposes list, create, update, getById, and delete on SpareNeedleRequestAPI', () => {
    expect(typeof SpareNeedleRequestAPI.list).toBe('function')
    expect(typeof SpareNeedleRequestAPI.create).toBe('function')
    expect(typeof SpareNeedleRequestAPI.update).toBe('function')
    expect(typeof SpareNeedleRequestAPI.getById).toBe('function')
    expect(typeof SpareNeedleRequestAPI.delete).toBe('function')
  })
})

describe('normalizeNeedleSet quantity precedence', () => {
  it('prefers the edited lowercase quantity over the stale DB column copy', () => {
    // Stock-out payloads spread the loaded record (Quantity) and override the
    // lowercase quantity — the edited value must win or stock never decreases.
    expect(normalizeNeedleSet({ id: 'NS-1', quantity: 240, Quantity: 250 }).quantity).toBe(240)
    expect(normalizeNeedleSet({ id: 'NS-1', quantity: 240, Quantity: 250 }).Quantity).toBe(240)
  })

  it('falls back to the Quantity column for records loaded from the cloud', () => {
    expect(normalizeNeedleSet({ id: 'NS-2', Quantity: 250 }).quantity).toBe(250)
    expect(normalizeNeedleSet({ id: 'NS-2', Quantity: '250' }).quantity).toBe(250)
  })

  it('accepts an explicit zero (stock finished)', () => {
    expect(normalizeNeedleSet({ id: 'NS-3', quantity: 0, Quantity: 250 }).quantity).toBe(0)
    expect(normalizeNeedleSet({ id: 'NS-3', quantity: '0', Quantity: 250 }).quantity).toBe(0)
  })

  it('clamps missing or invalid quantities to zero', () => {
    expect(normalizeNeedleSet({ id: 'NS-4', quantity: 'abc' }).quantity).toBe(0)
    expect(normalizeNeedleSet({ id: 'NS-4' }).quantity).toBe(0)
    expect(normalizeNeedleSet({ id: 'NS-4', quantity: '', Quantity: 120 }).quantity).toBe(120)
  })
})
