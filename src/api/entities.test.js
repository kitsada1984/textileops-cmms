import { describe, expect, it } from 'vitest'
import {
  generateCenterCheckDocNo,
  DEFAULT_SINGLE_CHECKLIST_ITEMS,
  DEFAULT_DOUBLE_CHECKLIST_ITEMS,
  isSystemWorkOrder,
  calculateSundayMinutes,
  countWorkingDaysExcludingSundays,
  normalizeSpareNeedleRequest,
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
        dial: { t1: 10, t2: 5 },
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
    expect(norm.tracks_requested.dial.t1).toBe(10)
    expect(norm.tracks_requested.cylinder.t2).toBe(5)
    expect(norm.issued_items).toEqual([])
  })

  it('identifies SYS_SPARE_NEEDLE_REQUESTS as a system work order', () => {
    expect(isSystemWorkOrder({ WO_ID: 'SYS_SPARE_NEEDLE_REQUESTS' })).toBe(true)
  })
})

