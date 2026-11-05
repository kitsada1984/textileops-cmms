import {
  matchesWorkOrderTypeFilter,
  matchesWorkOrderStatusFilter,
  matchesWorkOrderProblemCauseFilter,
  getWorkOrderDetails,
} from './WorkOrders.jsx'

// Pure job-list filter predicate (moved verbatim out of the WorkOrders
// component to meet the complexity gate; params only, no component
// state, no side effects).
export function filterWorkOrderJobs(allJobs, { showDeleted, typeFilters, statusFilters, causeFilter, search }) {
  return allJobs.filter((job) => {
    const isDel = Boolean(job.IsDeleted)
    if (!showDeleted && isDel) return false
    if (showDeleted && !isDel) return false

    if (!matchesWorkOrderTypeFilter(job.JobType, typeFilters)) return false
    if (!matchesWorkOrderStatusFilter(job.Status, statusFilters)) return false
    if (!matchesWorkOrderProblemCauseFilter(job.ProblemCause || job.problem_cause, causeFilter)) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        String(job.Job_ID || job['Job ID'] || '').toLowerCase().includes(q) ||
        String(job.MC || '').toLowerCase().includes(q) ||
        String(job.KI || '').toLowerCase().includes(q) ||
        String(job.Design || '').toLowerCase().includes(q) ||
        String(job.Technicians || '').toLowerCase().includes(q) ||
        String(job.ProblemCause || job.problem_cause || '').toLowerCase().includes(q) ||
        String(job.CreatedBy || '').toLowerCase().includes(q) ||
        String(getWorkOrderDetails(job) || '').toLowerCase().includes(q) ||
        String(job.Details || '').toLowerCase().includes(q) ||
        String(job.Comment || '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
}
