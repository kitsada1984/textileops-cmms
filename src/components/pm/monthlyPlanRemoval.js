// Pure helpers moved verbatim from removePMWorkOrderFromMonthlyPlan
// (key resolution, matching, and item shaping only — no storage I/O).

export function resolveDeletedWoKeys(deletedWorkOrder) {
  return {
    delWoId: String(deletedWorkOrder.Job_ID || deletedWorkOrder.WO_ID || deletedWorkOrder.id || '').trim(),
    delMC: String(deletedWorkOrder.MC || deletedWorkOrder.Mc || deletedWorkOrder.machine_mc || deletedWorkOrder.Machine_MC || '').trim().toUpperCase(),
    delKI: String(deletedWorkOrder.KI || deletedWorkOrder.Ki || deletedWorkOrder.Machine_KI || deletedWorkOrder.Serial_OLD || '').trim().toUpperCase(),
  }
}

export function matchEffectiveMachine(effectiveMachines, delMC, delKI) {
  // Match deleted work order to effective machines if available
  return (Array.isArray(effectiveMachines) ? effectiveMachines : []).find(m => {
    const mSerial = String(m?.Serial_OLD || m?.ki || m?.Machine_KI || '').trim().toUpperCase()
    const mCode = String(m?.NewMC || m?.mc || m?.Machine_MC || '').trim().toUpperCase()
    if (delKI && mSerial && delKI === mSerial) return true
    if (delMC && mCode && delMC === mCode) return true
    return false
  })
}

export function resolveEffectiveKeys(matchedMachine, delMC, delKI) {
  return {
    effectiveMC: (matchedMachine?.NewMC || matchedMachine?.mc || delMC).toUpperCase(),
    effectiveKI: (matchedMachine?.Serial_OLD || matchedMachine?.ki || delKI).toUpperCase(),
  }
}

// Helper: check if another active PM work order in remainingWorkOrders matches a machine
export function isActivePmCandidate(wo, delWoId) {
  if (!wo) return false
  const type = String(wo.JobType || wo.Job_Type || wo.job_type || wo.jobType || '').toUpperCase()
  if (type !== 'PM') return false
  const wId = String(wo.Job_ID || wo.WO_ID || wo.id || '').trim()
  if (delWoId && wId === delWoId) return false
  return true
}

export function matchCandidateMachine(wo, itemMC, itemKI) {
  const wMC = String(wo.MC || wo.Mc || wo.machine_mc || wo.Machine_MC || '').trim().toUpperCase()
  const wKI = String(wo.KI || wo.Ki || wo.Machine_KI || wo.Serial_OLD || '').trim().toUpperCase()
  if (itemKI && wKI && itemKI === wKI) return true
  if (itemMC && wMC && itemMC === wMC) return true
  return false
}

export function findAlternativeWO(remainingWorkOrders, delWoId, itemMC, itemKI) {
  return (Array.isArray(remainingWorkOrders) ? remainingWorkOrders : []).find(wo => {
    if (!isActivePmCandidate(wo, delWoId)) return false
    return matchCandidateMachine(wo, itemMC, itemKI)
  })
}

export function matchMonthlyItem(item, { delWoId, effectiveMC, effectiveKI }) {
  const itemMC = String(item.mc || '').toUpperCase()
  const itemKI = String(item.ki || '').toUpperCase()
  const itemWoId = String(item.workOrderId || '').trim()
  const itemId = String(item.id || '')

  return {
    itemMC,
    itemKI,
    isMatch: Boolean(
      (delWoId && itemWoId && itemWoId === delWoId) ||
      (delWoId && itemId.includes(delWoId)) ||
      (effectiveMC && itemMC && effectiveMC === itemMC) ||
      (effectiveKI && itemKI && effectiveKI === itemKI)
    ),
  }
}

export function buildRelinkedItem(item, altWO, { notesFallback, trackOnTime }) {
  const sDate = String(altWO.StartDate || altWO.DateStart || altWO.StartTime || altWO.created_at || '').slice(0, 10)
  const rawEndDate = String(altWO.EndDate || altWO.DateEnd || altWO.EndTime || '').slice(0, 10)
  const woStatus = String(altWO.Status || altWO.status || '').toUpperCase()
  const isCompleted = ['COMPLETED', 'เสร็จสิ้น', 'DONE', 'CLOSED'].includes(woStatus)
  const isScheduled = ['SCHEDULED', 'ตามแผน', 'PLANNED'].includes(woStatus)
  const mappedStatus = isCompleted ? 'COMPLETED' : (isScheduled ? 'SCHEDULED' : 'IN_PROGRESS')
  let isOnTime = item.isOnTime
  if (trackOnTime && mappedStatus === 'COMPLETED' && rawEndDate && item.plannedEndDate) {
    isOnTime = rawEndDate <= item.plannedEndDate
  }
  return {
    ...item,
    workOrderId: altWO.Job_ID || altWO.WO_ID || altWO.id,
    actualStartDate: sDate,
    actualEndDate: mappedStatus === 'COMPLETED' ? (rawEndDate || sDate) : rawEndDate,
    actualTech: altWO.Technicians || altWO.Tech || '',
    status: mappedStatus,
    notes: altWO.Comment || altWO.Details || notesFallback,
    ...(trackOnTime ? { isOnTime } : {}),
    updatedAt: new Date().toISOString(),
  }
}

export function resetPlannedItem(item) {
  // Reset back to planned state (ตามแผน)
  return {
    ...item,
    workOrderId: null,
    actualStartDate: null,
    actualEndDate: null,
    actualTech: '',
    status: 'SCHEDULED',
    isOnTime: null,
    notes: (item.notes && item.notes.startsWith('ใบสั่งงาน PM')) ? '' : item.notes,
    updatedAt: new Date().toISOString(),
  }
}
