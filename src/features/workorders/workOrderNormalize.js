export const WORK_ORDER_STATUS_OPTIONS = [
  {
    value: 'IN_PROGRESS',
    label: 'กำลังทำ',
    fullLabel: '🟡 กำลังทำ (In Progress)',
    icon: '🟡',
    badgeClass: 'badge-orange',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
  },
  {
    value: 'WAITING_TECH',
    label: 'รอช่าง',
    fullLabel: '🟠 รอช่าง (Waiting Tech)',
    icon: '🟠',
    badgeClass: 'badge-yellow',
    activeClass: 'bg-orange-500 text-white border-orange-500 shadow-xs',
  },
  {
    value: 'WAITING_PARTS',
    label: 'รออะไหล่',
    fullLabel: '🟣 รออะไหล่ (Waiting Parts)',
    icon: '🟣',
    badgeClass: 'badge-purple',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs',
  },
  {
    value: 'WAITING_SUMMARY',
    label: 'รอสรุป',
    fullLabel: '🔵 รอสรุป (Waiting Summary)',
    icon: '🔵',
    badgeClass: 'badge-blue',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs',
  },
  {
    value: 'WAITING_DYE_TEST',
    label: 'รอเทส-ย้อม',
    fullLabel: '🧪 รอเทส-ย้อม (Waiting Dye Test)',
    icon: '🧪',
    badgeClass: 'badge-teal',
    activeClass: 'bg-teal-600 text-white border-teal-600 shadow-xs',
  },
  {
    value: 'COMPLETED',
    label: 'เสร็จสิ้น',
    fullLabel: '🟢 เสร็จสิ้น (Completed)',
    icon: '🟢',
    badgeClass: 'badge-green',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
  {
    value: 'CANCELLED',
    label: 'ยกเลิก',
    fullLabel: '⚪ ยกเลิก (Cancelled)',
    icon: '⚪',
    badgeClass: 'badge-gray',
    activeClass: 'bg-slate-500 text-white border-slate-500 shadow-xs',
    isCancelled: true,
  },
]

const FINISHED_STATUSES = ['COMPLETED', 'CANCELLED']

// Default status filter: the 5 pending-work options pre-ticked on open,
// finished / cancelled left unticked. Derived (not hardcoded) so a future
// active status joins the default automatically.
export const DEFAULT_ACTIVE_STATUS_FILTERS = WORK_ORDER_STATUS_OPTIONS.filter(
  (opt) => !FINISHED_STATUSES.includes(opt.value)
).map((opt) => opt.value)

// True when the selection equals the default (order-insensitive).
export function isDefaultStatusSelection(statusFilters) {
  if (!Array.isArray(statusFilters)) return true
  if (statusFilters.length !== DEFAULT_ACTIVE_STATUS_FILTERS.length) return false
  return DEFAULT_ACTIVE_STATUS_FILTERS.every((v) => statusFilters.includes(v))
}

export function getWorkOrderStatusMeta(status) {
  const raw = String(status || '').trim()
  const upper = raw.toUpperCase()

  if (upper === 'CANCELLED' || raw === 'ยกเลิก') {
    return { ...WORK_ORDER_STATUS_OPTIONS[6], isCompleted: false, isCancelled: true }
  }
  if (upper === 'COMPLETED' || raw === 'เสร็จสิ้น') {
    return { ...WORK_ORDER_STATUS_OPTIONS[5], isCompleted: true, isCancelled: false }
  }
  if (upper === 'WAITING_TECH' || raw === 'รอช่าง') {
    return { ...WORK_ORDER_STATUS_OPTIONS[1], isCompleted: false, isCancelled: false }
  }
  if (upper === 'WAITING_PARTS' || raw === 'รออะไหล่') {
    return { ...WORK_ORDER_STATUS_OPTIONS[2], isCompleted: false, isCancelled: false }
  }
  if (upper === 'WAITING_SUMMARY' || raw === 'รอสรุป') {
    return { ...WORK_ORDER_STATUS_OPTIONS[3], isCompleted: false, isCancelled: false }
  }
  if (upper === 'WAITING_DYE_TEST' || raw === 'รอเทส-ย้อม' || raw === 'รอเทสย้อม') {
    return { ...WORK_ORDER_STATUS_OPTIONS[4], isCompleted: false, isCancelled: false }
  }
  return { ...WORK_ORDER_STATUS_OPTIONS[0], isCompleted: false, isCancelled: false }
}

export function getWorkOrderDetails(job = {}) {
  if (!job) return '—'
  const comment = job.Comment || job.comment || ''
  if (comment && typeof comment === 'string') {
    if (comment.trim().startsWith('{') && comment.includes('synced_from_repair')) {
      return job.Problem || job.problem || job.Details || job.details || job.Detail || job.Solution || '—'
    }
    return comment
  }
  return job.Details || job.details || job.Problem || job.problem || job.Detail || job.Description || '—'
}

export function getJobDailyLogs(job = {}) {
  if (!job) return []
  const raw = job.DailyLogs || job.daily_logs || job.dailyLogs
  if (!raw) {
    const comment = job.Comment || job.comment || ''
    if (typeof comment === 'string' && comment.trim().startsWith('{') && comment.includes('daily_logs')) {
      try {
        const parsed = JSON.parse(comment)
        if (Array.isArray(parsed.daily_logs)) return parsed.daily_logs
      } catch {}
    }
    return []
  }
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      let parsed = JSON.parse(raw)
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed) } catch {}
      }
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function getLatestDailyLog(job = {}) {
  const logs = getJobDailyLogs(job)
  if (!Array.isArray(logs) || logs.length === 0) return null
  const sorted = [...logs].sort((a, b) => {
    const tA = new Date(a.timestamp || a.date).getTime() || 0
    const tB = new Date(b.timestamp || b.date).getTime() || 0
    return tA - tB
  })
  return sorted[sorted.length - 1]
}

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
