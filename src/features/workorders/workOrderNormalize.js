// Pure row normalizer for work orders (moved verbatim out of the
// WorkOrders component to meet the complexity gate; params only,
// no component state, no side effects).
export function normalizeWorkOrderRow(r) {
  const jobId = r.Job_ID || r['Job ID'] || r.WO_ID || (r.id ? `JOB-${String(r.id).slice(0, 8)}` : 'JOB-00000000-0000')
  const technicians = r.Technicians || r['Technicians'] || r.Tech || ''
  const comment = r.Comment || r['Comment'] || r.Problem || r.Detail || ''
  const rawDailyLogs = r.DailyLogs || r.daily_logs || r['Daily Logs'] || r.dailyLogs || null
  const normalizedDailyLogs = typeof rawDailyLogs === 'object' && rawDailyLogs !== null ? JSON.stringify(rawDailyLogs) : (rawDailyLogs || '')
  const startTimestamp = r.StartTimestamp || r['Start Timestamp'] || r.DateStart || r.StartTime || ''
  const endTimestamp = r.EndTimestamp || r['End Timestamp'] || r.DateEnd || r.EndTime || ''
  const startDate = r.StartDate || r['Start Date'] || (typeof startTimestamp === 'string' && startTimestamp.includes('T') ? startTimestamp.slice(0, 10) : (r.StartDate || ''))
  const startTime = r.StartTime || r['Start Time'] || (typeof startTimestamp === 'string' && startTimestamp.includes('T') ? startTimestamp.slice(11, 19) : (r.StartTime || ''))
  const endDate = r.EndDate || r['End Date'] || (typeof endTimestamp === 'string' && endTimestamp.includes('T') ? endTimestamp.slice(0, 10) : (r.EndDate || ''))
  const endTime = r.EndTime || r['End Time'] || (typeof endTimestamp === 'string' && endTimestamp.includes('T') ? endTimestamp.slice(11, 19) : (r.EndTime || ''))
  const workingDurationText = r.WorkingDurationText || r['Working Duration Text'] || r.Duration || ''

  return {
    ...r,
    Job_ID: jobId,
    Technicians: technicians,
    Comment: comment,
    DailyLogs: normalizedDailyLogs,
    daily_logs: normalizedDailyLogs,
    StartDate: startDate,
    StartTime: startTime,
    StartTimestamp: startTimestamp,
    EndDate: endDate,
    EndTime: endTime,
    EndTimestamp: endTimestamp,
    WorkingDurationText: workingDurationText,
  }
}
