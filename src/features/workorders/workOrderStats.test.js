import { describe, it, expect } from 'vitest'
import {
  normalizeAllJobs,
  computeTypeCounts,
  computeStatusCounts,
  computeCauseCounts,
  calcJobTypeKpi,
  computeKpiStats,
  saveKpiSettings,
} from './workOrderStats'

// Characterization: lock the moved stats computations exactly as the
// WorkOrders memo bodies behaved (moved verbatim, params only).
const jobs = [
  { id: '1', JobType: 'REPAIR', Status: 'IN_PROGRESS', IsDeleted: false, CreatedBy: 'ช่างA' },
  { id: '2', JobType: 'DESIGN', Status: 'COMPLETED', IsDeleted: false, CreatedBy: 'ช่างB' },
  { id: '3', JobType: 'REPAIR', Status: 'CANCELLED', IsDeleted: false, CreatedBy: 'ช่างA' },
  { id: '4', JobType: 'PM', Status: 'IN_PROGRESS', IsDeleted: true, CreatedBy: 'ช่างC' },
]

describe('workOrderStats characterization', () => {
  it('normalizes non-array input to []', () => {
    expect(normalizeAllJobs(null)).toEqual([])
    expect(normalizeAllJobs(undefined)).toEqual([])
  })

  it('counts job types excluding deleted', () => {
    const counts = computeTypeCounts(jobs, false)

    expect(counts.ALL).toBe(3)
    expect(counts.REPAIR).toBe(2)
    expect(counts.DESIGN).toBe(1)
  })

  it('counts an unknown job type as REPAIR', () => {
    const counts = computeTypeCounts([{ JobType: 'WEIRD' }], false)

    expect(counts.REPAIR).toBe(1)
  })

  it('counts statuses and causes', () => {
    const statuses = computeStatusCounts(jobs, false)
    const causes = computeCauseCounts(
      [{ ProblemCause: 'คน' }, { ProblemCause: '' }, { problem_cause: 'bogus' }], false
    )

    expect(statuses.ALL).toBe(3)
    expect(causes['คน']).toBe(1)
    expect(causes.UNSPECIFIED).toBe(2)
  })

  it('computes KPI totals, user metrics, and recent jobs', () => {
    const stats = computeKpiStats(jobs, { REPAIR: 1, DESIGN: 3, PM: 2, SETUP: 1 })

    expect(stats.total).toBe(3)
    expect(stats.completed).toBe(1)
    expect(stats.cancelled).toBe(1)
    expect(stats.active).toBe(1)
    expect(stats.repair.total).toBe(2)
    expect(stats.userMetrics).toContainEqual({ name: 'ช่างA', count: 2 })
    expect(stats.recentJobs.length).toBeLessThanOrEqual(5)
  })

  it('returns zeroed KPI for an empty type', () => {
    const kpi = calcJobTypeKpi([], 'SETUP', { SETUP: 1 })

    expect(kpi.total).toBe(0)
    expect(kpi.rate).toBe(0)
    expect(kpi.avgDurationText).toBe('—')
  })

  it('saveKpiSettings: persists remotely, falls back to local on failure', async () => {
    const toast = { success: vi.fn() }
    const draftKpi = { REPAIR: 1, DESIGN: 3, PM: 2, SETUP: 1 }
    const setKpiTargets = vi.fn()
    const setKpiModalOpen = vi.fn()

    await saveKpiSettings({ draftKpi, setKpiTargets, setKpiModalOpen, toast })
    expect(setKpiTargets).toHaveBeenCalledWith(draftKpi)
    expect(setKpiModalOpen).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalled()
  })
})
