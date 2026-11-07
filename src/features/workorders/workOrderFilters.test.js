import { describe, it, expect } from 'vitest'
import {
  filterWorkOrderJobs,
  toggleMultiFilterValue,
  nextMultiFilter,
  nextCauseFilter,
  togglePersistedOpen,
} from './workOrderFilters'

// Characterization tests: lock the job-list filtering exactly as the
// in-component version behaved (moved verbatim, params only).

const jobs = [
  { id: 'a', Job_ID: 'JOB-A', Status: 'OPEN', JobType: 'REPAIR', ProblemCause: 'คน', Technicians: 'ช่างหนึ่ง' },
  { id: 'b', Job_ID: 'JOB-B', Status: 'COMPLETED', JobType: 'PM', ProblemCause: 'เครื่องจักร', IsDeleted: true },
  { id: 'c', Job_ID: 'JOB-C', Status: 'COMPLETED', JobType: 'PM', ProblemCause: 'คน' },
  { id: 'd', Job_ID: 'JOB-D', Status: 'CANCELLED', JobType: 'REPAIR', ProblemCause: 'คน' },
]

const baseFilters = {
  showDeleted: false,
  typeFilters: 'ALL',
  statusFilters: 'ALL',
  causeFilter: 'ALL',
  search: '',
}

describe('filterWorkOrderJobs', () => {
  it('hides deleted jobs by default and shows them when requested', () => {
    expect(filterWorkOrderJobs(jobs, baseFilters).map((j) => j.id)).toEqual(['a'])
    expect(
      filterWorkOrderJobs(jobs, { ...baseFilters, showDeleted: true }).map((j) => j.id)
    ).toEqual([])
    expect(
      filterWorkOrderJobs(jobs, { ...baseFilters, showDeleted: true, showFinished: true }).map((j) => j.id)
    ).toEqual(['b'])
  })

  it('hides completed and cancelled jobs by default and shows them when requested', () => {
    expect(filterWorkOrderJobs(jobs, baseFilters).map((j) => j.id)).toEqual(['a'])
    expect(
      filterWorkOrderJobs(jobs, { ...baseFilters, showFinished: true }).map((j) => j.id)
    ).toEqual(['a', 'c', 'd'])
  })

  it('matches search text across job fields', () => {
    const out = filterWorkOrderJobs(jobs, { ...baseFilters, search: 'ช่างหนึ่ง' })
    expect(out.map((j) => j.id)).toEqual(['a'])

    const none = filterWorkOrderJobs(jobs, { ...baseFilters, search: 'ไม่มีคำนี้' })
    expect(none).toHaveLength(0)
  })
})

describe('filter toggle cores', () => {
  it('toggles a value in and out', () => {
    expect(toggleMultiFilterValue([], 'REPAIR')).toEqual(['REPAIR'])
    expect(toggleMultiFilterValue(['REPAIR', 'PM'], 'REPAIR')).toEqual(['PM'])
  })

  it('resets to [] on ALL', () => {
    expect(nextMultiFilter(['REPAIR'], 'ALL')).toEqual([])
    expect(nextMultiFilter([], 'PM')).toEqual(['PM'])
  })

  it('resets the cause filter on ALL or re-click', () => {
    expect(nextCauseFilter('คน', 'ALL')).toBe('')
    expect(nextCauseFilter('คน', 'คน')).toBe('')
    expect(nextCauseFilter('คน', 'เครื่องจักร')).toBe('เครื่องจักร')
  })

  it('flips the persisted open flag', () => {
    expect(togglePersistedOpen(true, 'test-key')).toBe(false)
    expect(togglePersistedOpen(false, 'test-key')).toBe(true)
  })
})
