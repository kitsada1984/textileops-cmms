// SLA shaping helpers moved verbatim from calculateSlaPerformance
// (pure branching only — duration math stays in the caller).

export function resolveSlaStart(job) {
  return job.StartTimestamp || job['Start Timestamp'] || job.created_at || (job.StartDate && (job.StartTime ? `${job.StartDate}T${job.StartTime}` : `${job.StartDate}T08:00:00Z`))
}

export function buildDirectHoursSla(job, targetDays, targetHours, directHours) {
  const isOnTime = directHours <= targetHours
  const isCompleted = job.Status === 'COMPLETED' || job.Status === 'เสร็จสิ้น'
  return {
    targetDays,
    targetHours,
    hoursDecimal: directHours,
    netHoursDecimal: directHours,
    grossHoursDecimal: directHours,
    lostHoursDecimal: 0,
    sundayHoursDecimal: 0,
    sundayMinutes: 0,
    offShiftMinutes: 0,
    offShiftHoursDecimal: 0,
    isOnTime,
    label: isCompleted
      ? (isOnTime ? 'ทันเป้าหมาย (On-Time)' : 'เกินเป้าหมาย (Overdue)')
      : (isOnTime ? `อยู่ในเกณฑ์ (${directHours}/${targetHours}ชม.)` : `เกินเวลา SLA (${directHours}/${targetHours}ชม.)`),
    badgeClass: isCompleted
      ? (isOnTime ? 'badge-green' : 'badge-red')
      : (isOnTime ? 'badge-blue' : 'badge-red'),
  }
}

export function buildEmptySla(targetDays, targetHours) {
  return {
    targetDays,
    targetHours,
    isOnTime: true,
    label: '—',
    badgeClass: 'badge-gray',
    hoursDecimal: 0,
    netHoursDecimal: 0,
    grossHoursDecimal: 0,
    lostHoursDecimal: 0,
    sundayHoursDecimal: 0,
    sundayMinutes: 0,
    offShiftMinutes: 0,
    offShiftHoursDecimal: 0,
  }
}

export function resolveSlaNetHours(job, isCompleted, durationResult) {
  // If job is already COMPLETED and has an explicitly saved WorkingHoursDecimal, prefer that if durationResult cannot be calculated accurately (e.g. no endTimestamp)
  return (isCompleted && typeof job.WorkingHoursDecimal === 'number' && job.WorkingHoursDecimal > 0 && !job.EndTimestamp && !job.EndDate)
    ? job.WorkingHoursDecimal
    : durationResult.netHoursDecimal
}

export function buildDurationSla({ targetDays, targetHours, durationResult, netHours, isOnTime, isCompleted }) {
  if (isCompleted) {
    return {
      targetDays,
      targetHours,
      ...durationResult,
      hoursDecimal: netHours,
      isOnTime,
      label: isOnTime ? 'ทันเป้าหมาย (On-Time)' : 'เกินเป้าหมาย (Overdue)',
      badgeClass: isOnTime ? 'badge-green' : 'badge-red',
    }
  }

  // If in progress:
  return {
    targetDays,
    targetHours,
    ...durationResult,
    hoursDecimal: netHours,
    isOnTime,
    label: isOnTime ? `อยู่ในเกณฑ์ (${netHours}/${targetHours}ชม.)` : `เกินเวลา SLA (${netHours}/${targetHours}ชม.)`,
    badgeClass: isOnTime ? 'badge-blue' : 'badge-red',
  }
}
