import { describe, expect, it } from 'vitest'
import {
  buildMonthlyRequestNo,
  priorityToWorkOrder,
  REPAIR_PRIORITY_OPTIONS,
  REPAIR_TYPE_OPTIONS,
} from './repairNumbers'

describe('buildMonthlyRequestNo', () => {
  const ref = new Date('2026-09-29T10:00:00Z')

  it('starts the month at 0001', () => {
    expect(buildMonthlyRequestNo([], ref)).toBe('RR202609-0001')
  })

  it('continues from the highest number of the same month', () => {
    const rows = [
      { request_no: 'RR202609-0057' },
      { request_no: 'RR202609-0056' },
      { request_no: 'RR202608-0099' }, // previous month must be ignored
      { request_no: '' },
      { request_no: null },
    ]
    expect(buildMonthlyRequestNo(rows, ref)).toBe('RR202609-0058')
  })

  it('ignores other numbering formats', () => {
    expect(buildMonthlyRequestNo(['REQ-123', { request_no: 'RR-2026-001' }], ref)).toBe('RR202609-0001')
  })

  it('pads the sequence to four digits', () => {
    expect(buildMonthlyRequestNo([{ request_no: 'RR202609-0009' }], ref)).toBe('RR202609-0010')
  })
})

describe('priorityToWorkOrder', () => {
  it('maps Thai priorities to work-order priority values', () => {
    expect(priorityToWorkOrder('ด่วนที่สุด')).toBe('HIGH')
    expect(priorityToWorkOrder('ด่วน')).toBe('MEDIUM')
    expect(priorityToWorkOrder('ปกติ')).toBe('LOW')
    expect(priorityToWorkOrder(undefined)).toBe('LOW')
  })
})

describe('repair option lists', () => {
  it('exposes value/label pairs for the form selects', () => {
    for (const opt of [...REPAIR_PRIORITY_OPTIONS, ...REPAIR_TYPE_OPTIONS]) {
      expect(typeof opt.value).toBe('string')
      expect(typeof opt.label).toBe('string')
      expect(opt.value.length).toBeGreaterThan(0)
    }
    expect(REPAIR_TYPE_OPTIONS.map((o) => o.value)).toEqual(['COMPLEX', 'EASY'])
  })
})
