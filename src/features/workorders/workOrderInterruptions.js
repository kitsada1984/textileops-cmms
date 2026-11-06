import { calculateDuration } from '../../api/entities'

// Pure interruption-log helpers moved verbatim out of the WorkOrders
// component (helper const and memo body) to meet the complexity gate.
// Params only, no component state, no side effects.

// Was `const getJobInterruptions = (job) => {...}` in the component.
export function getJobInterruptions(job) {
  let logs = job?.Interruption_Logs || job?.interruption_logs || []
  if (typeof logs === 'string') {
    try { logs = JSON.parse(logs) } catch { logs = [] }
  }
  return Array.isArray(logs) ? logs : []
}

const EMPTY_COMPLETE_DURATION = {
  hoursDecimal: 0,
  durationText: '—',
  grossHoursDecimal: 0,
  grossDurationText: '—',
  lostHoursDecimal: 0,
  lostDurationText: '0 นาที',
  netHoursDecimal: 0,
  netDurationText: '—',
}

// Body of the `compCalcDuration` memo. The empty-result literal is shared
// (frozen shape, never mutated by callers — same values as before).
export function computeCompleteDuration(compJob, compEndDate, compEndTime) {
  if (!compJob || !compEndDate || !compEndTime) {
    return { ...EMPTY_COMPLETE_DURATION }
  }
  const start = compJob.StartTimestamp || compJob.DateStart || (compJob.StartDate && compJob.StartTime ? (compJob.StartTime.includes('T') ? compJob.StartTime : `${compJob.StartDate}T${compJob.StartTime}`) : null) || compJob.created_at
  const end = `${compEndDate}T${compEndTime}:00`
  const interruptions = getJobInterruptions(compJob)
  return calculateDuration(start, end, interruptions)
}
