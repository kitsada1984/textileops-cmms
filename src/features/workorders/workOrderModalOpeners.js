import { format } from 'date-fns'
import { getWorkOrderDetails, getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { resolveDailyLogJob } from './workOrderDailyLogHandlers.js'

// Modal-opener state builders moved verbatim out of the WorkOrders
// component. Pure transformations only — the component keeps the
// setter calls. Bodies run at call time exactly as before.

// Was the body of `const openCompleteModal = (job) => {...}` minus setters.
export function buildCompleteModalState(job) {
  const now = new Date()
  return {
    compJob: job,
    compEndDate: format(now, 'yyyy-MM-dd'),
    compEndTime: format(now, 'HH:mm'),
  }
}

// Was the transformation part of `const openEditModal = (job) => {...}`.
export function buildEditModalState(job) {
  const detailsVal = getWorkOrderDetails(job)
  const statusCode = getWorkOrderStatusMeta(job.Status).value
  return {
    editJob: {
      ...job,
      Comment: detailsVal === '—' ? (job.Comment || '') : detailsVal,
      Details: detailsVal === '—' ? (job.Details || '') : detailsVal,
      ProblemCause: job.ProblemCause || job.problem_cause || '',
      Status: statusCode,
    },
    editTechs: (job.Technicians || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

// Was the transformation part of `const openDailyLogModal = (job) => {...}`.
// Fresh-job lookup reuses resolveDailyLogJob (identical expression,
// output-identical by its own locks).
export function buildDailyLogModalState(allJobs, job) {
  const freshJob = resolveDailyLogJob(allJobs, job)
  const now = new Date()
  const currentMeta = getWorkOrderStatusMeta(freshJob.Status)
  return {
    freshJob,
    date: format(now, 'yyyy-MM-dd'),
    status: currentMeta.value,
    techs: (freshJob.Technicians || freshJob.Tech || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
}
