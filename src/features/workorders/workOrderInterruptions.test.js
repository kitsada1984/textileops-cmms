import { describe, it, expect } from 'vitest'
import { getJobInterruptions, computeCompleteDuration } from './workOrderInterruptions'

// Characterization: lock the moved interruption helpers exactly as the
// WorkOrders versions behaved (moved verbatim, params only).
describe('workOrderInterruptions characterization', () => {
  it('returns [] for missing logs', () => {
    expect(getJobInterruptions(null)).toEqual([])
    expect(getJobInterruptions({})).toEqual([])
  })

  it('parses JSON-stringified logs', () => {
    const logs = [{ id: 'INT-1', task_name: 'รอวัตถุดิบ' }]

    expect(getJobInterruptions({ Interruption_Logs: JSON.stringify(logs) })).toEqual(logs)
  })

  it('falls back to [] for invalid JSON', () => {
    expect(getJobInterruptions({ interruption_logs: 'not-json' })).toEqual([])
  })

  it('returns the empty duration shape when inputs are missing', () => {
    const d = computeCompleteDuration(null, '2026-11-06', '16:00')

    expect(d.hoursDecimal).toBe(0)
    expect(d.durationText).toBe('—')
    expect(d.lostDurationText).toBe('0 นาที')
  })

  it('computes a duration for a complete job', () => {
    const job = { StartDate: '2026-11-06', StartTime: '08:00:00', Interruption_Logs: [] }
    const d = computeCompleteDuration(job, '2026-11-06', '16:00')

    expect(d.netHoursDecimal).toBeGreaterThan(0)
  })
})
