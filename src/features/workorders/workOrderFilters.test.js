import { describe, it, expect } from 'vitest'
import { filterWorkOrderJobs } from './workOrderFilters'

// Characterization tests: lock the job-list filtering exactly as the
// in-component version behaved (moved verbatim, params only).

const jobs = [
  { id: 'a', Job_ID: 'JOB-A', Status: 'OPEN', JobType: 'REPAIR', ProblemCause: 'คน', Technicians: 'ช่างหนึ่ง' },
  { id: 'b', Job_ID: 'JOB-B', Status: 'COMPLETED', JobType: 'PM', ProblemCause: 'เครื่องจักร', IsDeleted: true },
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
    ).toEqual(['b'])
  })

  it('matches search text across job fields', () => {
    const out = filterWorkOrderJobs(jobs, { ...baseFilters, search: 'ช่างหนึ่ง' })
    expect(out.map((j) => j.id)).toEqual(['a'])

    const none = filterWorkOrderJobs(jobs, { ...baseFilters, search: 'ไม่มีคำนี้' })
    expect(none).toHaveLength(0)
  })
})
