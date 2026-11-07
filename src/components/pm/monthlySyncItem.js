import { format } from 'date-fns'
import { getLatestDailyLog } from '../../features/workorders/workOrderNormalize.js'

// Pure field builders moved verbatim from syncWorkOrdersToMonthlyPlan
// (date/status/meta shaping only — list mutation stays in the caller).

export function formatLatestDailyLog(latestLog, fallbackStatus = '') {
  if (!latestLog) return null
  const logDate = latestLog.date || (latestLog.timestamp ? String(latestLog.timestamp).slice(0, 10) : '')
  return {
    date: logDate,
    details: latestLog.details || latestLog.Problem || latestLog.Comment || '',
    status: latestLog.status || fallbackStatus,
    hours: latestLog.hours,
    techs: latestLog.technicians || latestLog.Techs || [],
  }
}

export function resolveItemEffectiveEnd(mappedStatus, eDate, progressDate, rawEndDate, fallback = '') {
  if (mappedStatus === 'COMPLETED') return eDate
  return progressDate || rawEndDate || fallback
}

export function resolveItemProgressDate(mappedStatus, progressDate, sDate, eDate) {
  if (mappedStatus === 'IN_PROGRESS') return progressDate || sDate
  if (mappedStatus === 'COMPLETED') return eDate
  return null
}

export function resolveSyncProgressDate(wo, sDate, targetPrefix, options = {}) {
  const today = options.today || new Date()
  const todayStr = options.todayStr || format(today, 'yyyy-MM-dd')
  const latestLog = getLatestDailyLog(wo)
  const latestLogDate = latestLog?.date ? String(latestLog.date).slice(0, 10) : ''

  const currentPrefix = todayStr.slice(0, 7)
  let progressDate

  if (targetPrefix === currentPrefix) {
    if (sDate <= todayStr) {
      progressDate = latestLogDate && latestLogDate > todayStr ? latestLogDate : todayStr
    } else {
      progressDate = sDate
    }
  } else if (targetPrefix < currentPrefix) {
    const [tYear, tMonth] = targetPrefix.split('-').map(Number)
    const daysInTargetMonth = new Date(tYear, tMonth, 0).getDate()
    const lastDayOfMonth = `${targetPrefix}-${String(daysInTargetMonth).padStart(2, '0')}`
    if (latestLogDate && latestLogDate.startsWith(targetPrefix)) {
      progressDate = latestLogDate
    } else {
      progressDate = lastDayOfMonth
    }
  } else {
    progressDate = sDate
  }

  if (progressDate < sDate) {
    progressDate = sDate
  }

  return { progressDate, latestLog }
}

export function resolveSyncWoDates(wo, targetPrefix, options = {}) {
  const sDate = String(wo.StartDate || wo.DateStart || wo.StartTime || wo.StartTimestamp || wo.created_at || `${targetPrefix}-01`).slice(0, 10)
  const hasEnded = Boolean(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp)
  const rawEndDate = hasEnded ? String(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp).slice(0, 10) : ''
  const { progressDate, latestLog } = resolveSyncProgressDate(wo, sDate, targetPrefix, options)
  const eDate = hasEnded ? (rawEndDate || sDate) : progressDate
  return { sDate, hasEnded, rawEndDate, eDate, progressDate, latestLog }
}

export function resolveEffectiveActualEnd(item, year, month, today = new Date()) {
  if (!item || !item.actualStartDate) return ''
  if (item.status === 'COMPLETED') {
    return item.actualEndDate || item.actualStartDate
  }
  if (item.status === 'IN_PROGRESS') {
    if (item.manualOverrideEndDate && item.actualEndDate) {
      return item.actualEndDate
    }
    const sDate = item.actualStartDate
    const todayStr = typeof today === 'string' ? today : format(today, 'yyyy-MM-dd')
    const targetPrefix = `${year}-${String(month).padStart(2, '0')}`
    const currentPrefix = todayStr.slice(0, 7)
    const logDate = item.latestDailyLog?.date || item.progressDate || ''

    if (targetPrefix === currentPrefix) {
      if (sDate <= todayStr) {
        const candidate = logDate && logDate > todayStr ? logDate : todayStr
        return candidate >= sDate ? candidate : sDate
      }
      return sDate
    } else if (targetPrefix < currentPrefix) {
      const daysInTargetMonth = new Date(year, month, 0).getDate()
      const lastDayOfMonth = `${targetPrefix}-${String(daysInTargetMonth).padStart(2, '0')}`
      if (logDate && logDate.startsWith(targetPrefix)) {
        return logDate >= sDate ? logDate : sDate
      }
      return lastDayOfMonth >= sDate ? lastDayOfMonth : sDate
    } else {
      return sDate
    }
  }
  return item.actualEndDate || item.actualStartDate
}

export function mapSyncWoStatus(wo) {
  const woStatus = String(wo.Status || wo.status || '').toUpperCase()
  // Status mapping:
  // If completed: 'COMPLETED'
  // If cancelled: 'CANCELLED'
  // If explicitly scheduled: 'SCHEDULED'
  // Any active/open state (OPEN, IN_PROGRESS, WAITING_TECH, WAITING_PARTS, WAITING_SUMMARY, WAITING_DYE_TEST, ASSIGNED, etc.): 'IN_PROGRESS'
  const isCompleted = ['COMPLETED', 'เสร็จสิ้น', 'DONE', 'CLOSED'].includes(woStatus)
  const isCancelled = ['CANCELLED', 'CANCELED', 'ยกเลิก'].includes(woStatus)
  const isScheduled = ['SCHEDULED', 'ตามแผน', 'PLANNED'].includes(woStatus)
  return isCompleted ? 'COMPLETED' : (isCancelled ? 'CANCELLED' : (isScheduled ? 'SCHEDULED' : 'IN_PROGRESS'))
}

export function resolveSyncWoMeta(wo) {
  return {
    techName: wo.Technicians || wo.Tech || wo.Technician || '',
    woNotes: wo.Comment || wo.Details || wo.Problem || '',
    woId: wo.Job_ID || wo.WO_ID || wo.id,
  }
}

export function resolveSyncEffectiveKeys(matchedMachine, woMC, woKI) {
  return {
    effectiveMC: (matchedMachine || {}).NewMC || (matchedMachine || {}).mc || woMC,
    effectiveKI: (matchedMachine || {}).Serial_OLD || (matchedMachine || {}).ki || woKI,
  }
}

export function applySyncWoToItem(item, woFields) {
  const { sDate, eDate, rawEndDate, mappedStatus, techName, woNotes, woId, progressDate, latestLog } = woFields
  let isOnTime = item.isOnTime
  if (mappedStatus === 'COMPLETED' && eDate && item.plannedEndDate) {
    isOnTime = eDate <= item.plannedEndDate
  }

  const effectiveEndDate = resolveItemEffectiveEnd(mappedStatus, eDate, progressDate, rawEndDate, item.actualEndDate || sDate)
  const effectiveProgress = resolveItemProgressDate(mappedStatus, progressDate, sDate, eDate)
  const formattedLog = formatLatestDailyLog(latestLog, mappedStatus)

  return {
    ...item,
    actualStartDate: sDate || item.actualStartDate,
    actualEndDate: effectiveEndDate,
    actualTech: techName || item.actualTech,
    status: mappedStatus,
    notes: woNotes || item.notes,
    workOrderId: woId || item.workOrderId,
    isOnTime: isOnTime !== undefined ? isOnTime : item.isOnTime,
    progressDate: effectiveProgress,
    latestDailyLog: formattedLog || item.latestDailyLog || null,
    updatedAt: new Date().toISOString(),
  }
}

export function buildUnplannedSyncItem(woOrOptions, woFieldsArg, ...rest) {
  const isOptionsObj = woOrOptions && typeof woOrOptions === 'object' && 'woFields' in woOrOptions
  const wo = isOptionsObj ? woOrOptions.wo : woOrOptions
  const woFields = isOptionsObj ? woOrOptions.woFields : woFieldsArg
  const effectiveMC = isOptionsObj ? woOrOptions.effectiveMC : rest[0]
  const effectiveKI = isOptionsObj ? woOrOptions.effectiveKI : rest[1]
  const matchedMachine = isOptionsObj ? woOrOptions.matchedMachine : rest[2]
  const monthKey = isOptionsObj ? woOrOptions.monthKey : rest[3]

  const { sDate, eDate, rawEndDate, mappedStatus, techName, woNotes, woId, progressDate, latestLog } = woFields
  const m = matchedMachine || {}
  const effectiveEndDate = resolveItemEffectiveEnd(mappedStatus, eDate, progressDate, rawEndDate, sDate)
  const effectiveProgress = resolveItemProgressDate(mappedStatus, progressDate, sDate, eDate)
  const formattedLog = formatLatestDailyLog(latestLog, mappedStatus)

  return {
    id: `PMSCH-${monthKey.replace('-', '')}-UNPLANNED-${woId || Date.now().toString(36)}`,
    mc: effectiveMC,
    ki: effectiveKI,
    location: m.Location || m.location || 'GMK1',
    type: m.Type || m.type || 'Double',
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: sDate,
    actualEndDate: effectiveEndDate,
    assignedTech: '',
    actualTech: techName,
    status: mappedStatus,
    notes: woNotes || 'ใบสั่งงาน PM นอกแผน',
    workingDays: 0,
    workOrderId: woId,
    isUnplanned: true,
    isOnTime: null,
    progressDate: effectiveProgress,
    latestDailyLog: formattedLog,
    createdAt: wo.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
