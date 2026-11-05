import { describe, it, expect } from 'vitest'
import { normalizeWorkOrderRow } from './workOrderNormalize'

// Characterization tests: lock the legacy-alias normalization exactly as
// the in-component version behaved (moved verbatim, params only).

describe('normalizeWorkOrderRow', () => {
  it('prefers canonical fields over legacy aliases', () => {
    const out = normalizeWorkOrderRow({
      id: 'abc123',
      Job_ID: 'JOB-9',
      'Job ID': 'JOB-OLD',
      Technicians: 'ช่างหลัก',
      Tech: 'ช่างรอง',
      Comment: 'หมายเหตุหลัก',
      Problem: 'ปัญหาสำรอง',
    })

    expect(out.Job_ID).toBe('JOB-9')
    expect(out.Technicians).toBe('ช่างหลัก')
    expect(out.Comment).toBe('หมายเหตุหลัก')
  })

  it('falls back to legacy aliases and generated ids', () => {
    const out = normalizeWorkOrderRow({
      id: 'abc123456789',
      'Job ID': 'JOB-LEGACY',
      Tech: 'ช่างรอง',
      Detail: 'รายละเอียดสำรอง',
      daily_logs: { a: 1 },
    })

    expect(out.Job_ID).toBe('JOB-LEGACY')
    expect(out.Technicians).toBe('ช่างรอง')
    expect(out.Comment).toBe('รายละเอียดสำรอง')
    expect(out.DailyLogs).toBe('{"a":1}')
    expect(out.daily_logs).toBe('{"a":1}')
  })

  it('normalizes ISO timestamps into date and time parts', () => {
    const out = normalizeWorkOrderRow({
      id: 'x1',
      StartTimestamp: '2026-10-20T08:30:00',
      EndTimestamp: '2026-10-20T17:00:00',
    })

    expect(out.StartDate).toBe('2026-10-20')
    expect(out.StartTime).toBe('08:30:00')
    expect(out.EndDate).toBe('2026-10-20')
    expect(out.EndTime).toBe('17:00:00')
  })

  it('keeps explicit date/time fields untouched', () => {
    const out = normalizeWorkOrderRow({
      id: 'x2',
      StartDate: '2026-10-21',
      StartTime: '09:00:00',
      StartTimestamp: '2026-10-20T08:30:00',
    })

    expect(out.StartDate).toBe('2026-10-21')
    expect(out.StartTime).toBe('09:00:00')
  })
})
