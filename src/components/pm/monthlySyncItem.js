// Pure field builders moved verbatim from syncWorkOrdersToMonthlyPlan
// (date/status/meta shaping only — list mutation stays in the caller).

export function resolveSyncWoDates(wo, targetPrefix) {
  const sDate = String(wo.StartDate || wo.DateStart || wo.StartTime || wo.StartTimestamp || wo.created_at || `${targetPrefix}-01`).slice(0, 10)
  const hasEnded = Boolean(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp)
  const rawEndDate = hasEnded ? String(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp).slice(0, 10) : ''
  const eDate = rawEndDate || sDate
  return { sDate, hasEnded, rawEndDate, eDate }
}

export function mapSyncWoStatus(wo) {
  const woStatus = String(wo.Status || wo.status || '').toUpperCase()
  // Status mapping:
  // If completed: 'COMPLETED'
  // If cancelled: 'CANCELLED'
  // If explicitly scheduled: 'SCHEDULED'
  // Any active/open state (OPEN, IN_PROGRESS, WAITING_TECH, WAITING_PARTS, WAITING_SUMMARY, ASSIGNED, etc.): 'IN_PROGRESS'
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
  const { sDate, eDate, rawEndDate, mappedStatus, techName, woNotes, woId } = woFields
  let isOnTime = item.isOnTime
  if (mappedStatus === 'COMPLETED' && eDate && item.plannedEndDate) {
    isOnTime = eDate <= item.plannedEndDate
  }

  return {
    ...item,
    actualStartDate: sDate || item.actualStartDate,
    actualEndDate: mappedStatus === 'COMPLETED' ? eDate : (rawEndDate || item.actualEndDate || sDate),
    actualTech: techName || item.actualTech,
    status: mappedStatus,
    notes: woNotes || item.notes,
    workOrderId: woId || item.workOrderId,
    isOnTime: isOnTime !== undefined ? isOnTime : item.isOnTime,
    updatedAt: new Date().toISOString(),
  }
}

export function buildUnplannedSyncItem(wo, woFields, effectiveMC, effectiveKI, matchedMachine, monthKey) {
  const { sDate, eDate, rawEndDate, mappedStatus, techName, woNotes, woId } = woFields
  const m = matchedMachine || {}
  return {
    id: `PMSCH-${monthKey.replace('-', '')}-UNPLANNED-${woId || Date.now().toString(36)}`,
    mc: effectiveMC,
    ki: effectiveKI,
    location: m.Location || m.location || 'GMK1',
    type: m.Type || m.type || 'Double',
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: sDate,
    actualEndDate: mappedStatus === 'COMPLETED' ? eDate : (rawEndDate || ''),
    assignedTech: '',
    actualTech: techName,
    status: mappedStatus,
    notes: woNotes || 'ใบสั่งงาน PM นอกแผน',
    workingDays: 0,
    workOrderId: woId,
    isUnplanned: true,
    isOnTime: null,
    createdAt: wo.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
