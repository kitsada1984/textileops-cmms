import { describe, expect, it } from 'vitest'
import {
  normalizeCounter,
  computeCounterDiff,
  pickPreviousWithCounter,
  buildCounterFields,
} from './counterDiff'

describe('normalizeCounter', () => {
  it('keeps positive numbers and rejects empty/invalid/negative ones', () => {
    expect(normalizeCounter(1500)).toBe(1500)
    expect(normalizeCounter('1500')).toBe(1500)
    expect(normalizeCounter('')).toBe(0)
    expect(normalizeCounter(null)).toBe(0)
    expect(normalizeCounter(undefined)).toBe(0)
    expect(normalizeCounter(-5)).toBe(0)
    expect(normalizeCounter('abc')).toBe(0)
  })
})

describe('computeCounterDiff', () => {
  it('subtracts the previous reading from the latest', () => {
    expect(computeCounterDiff(1541000, 1540200)).toBe(800)
  })

  it('returns 0 when either reading is missing', () => {
    expect(computeCounterDiff(1541000, 0)).toBe(0)
    expect(computeCounterDiff('', 1540200)).toBe(0)
  })

  it('never returns a negative difference (meter reset / typo)', () => {
    expect(computeCounterDiff(1000, 1500)).toBe(0)
  })
})

const rows = [
  { id: 'r1', serial: 'SN-1', doc_date: '2026-09-01', created_at: '2026-09-01T09:00:00Z', counter: 1000, status: 'สึกเล็กน้อย' },
  { id: 'r2', serial: 'SN-1', doc_date: '2026-09-20', created_at: '2026-09-20T09:00:00Z', counter: 1540200, status: 'สึกมาก(ควรเปลี่ยน)' },
  { id: 'r3', serial: 'SN-1', doc_date: '2026-09-25', created_at: '2026-09-25T09:00:00Z', counter: 0, status: 'สึกเล็กน้อย' }, // no reading
  { id: 'r4', serial: 'SN-2', doc_date: '2026-09-26', created_at: '2026-09-26T09:00:00Z', counter: 999999, status: 'สึกเล็กน้อย' },
]

describe('pickPreviousWithCounter', () => {
  const matches = (r) => r.serial === 'SN-1'

  it('picks the newest earlier record that has a counter', () => {
    expect(pickPreviousWithCounter(rows, { matches })?.id).toBe('r2')
  })

  it('skips records without a counter reading', () => {
    // r3 is newer but has no counter → r2 must win
    const picked = pickPreviousWithCounter(rows, { matches })
    expect(picked?.counter).toBe(1540200)
  })

  it('ignores the record being edited', () => {
    expect(pickPreviousWithCounter(rows, { matches, excludeId: 'r2' })?.id).toBe('r1')
  })

  it('ignores other machines and empty input', () => {
    expect(pickPreviousWithCounter(rows, { matches: (r) => r.serial === 'SN-9' })).toBe(null)
    expect(pickPreviousWithCounter(null, { matches })).toBe(null)
  })
})

describe('buildCounterFields', () => {
  const matches = (r) => r.serial === 'SN-1'

  it('computes previous reading and difference for a new record', () => {
    const out = buildCounterFields(rows, { matches, latest: 1542000 })
    expect(out.counter_prev).toBe(1540200)
    expect(out.counter_total).toBe(1800)
    expect(out.prevRecord?.id).toBe('r2')
  })

  it('returns zeros for the first ever inspection', () => {
    const out = buildCounterFields(rows, { matches: (r) => r.serial === 'NEW', latest: 5000 })
    expect(out).toEqual({ counter_prev: 0, counter_total: 0, prevRecord: null })
  })

  it('supports a custom counter field name (center checks use counter_latest)', () => {
    const centerRows = [
      { id: 'c1', mc: 'LA341M', doc_date: '2026-09-10', counter_latest: 500 },
      { id: 'c2', mc: 'LA341M', doc_date: '2026-09-20', counter_latest: 900 },
    ]
    const out = buildCounterFields(centerRows, {
      matches: (r) => r.mc === 'LA341M',
      latest: 1200,
      getCounter: (r) => r.counter_latest,
    })
    expect(out.counter_prev).toBe(900)
    expect(out.counter_total).toBe(300)
  })

  it('honours an explicitly provided previous record (edit mode)', () => {
    const out = buildCounterFields(rows, {
      matches,
      latest: 1540200,
      prevRecord: rows[0], // force the older record as the baseline
    })
    expect(out.counter_prev).toBe(1000)
    expect(out.counter_total).toBe(1539200)
  })
})
