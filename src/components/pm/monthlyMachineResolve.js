// Pure helpers moved verbatim from resolveItemMachine
// (matching stages and field resolution only — no storage I/O).

// 1. Try matching by Serial_OLD / KI
export function matchMachineBySerial(effectiveList, rawKI) {
  return effectiveList.find(m => {
    const serial = String((m || {}).Serial_OLD || (m || {}).ki || (m || {}).Machine_KI || '').trim()
    if (rawKI && serial && rawKI.toUpperCase() === serial.toUpperCase()) return true
    return false
  })
}

// 2. If no match by KI, try matching by current machine code (if not generic)
export function matchMachineByCode(effectiveList, rawMC) {
  return effectiveList.find(m => {
    const code = String((m || {}).NewMC || (m || {}).mc || (m || {}).Machine_MC || '').trim()
    if (code && rawMC.toUpperCase() === code.toUpperCase()) return true
    return false
  })
}

// 3. Fallback for generic MC-XX without KI: match by slot index if applicable
export function matchMachineBySlot(effectiveList, rawMC) {
  const idxMatch = rawMC.match(/^MC-(\d+)$/i)
  if (idxMatch) {
    const slot = parseInt(idxMatch[1], 10) - 1
    if (slot >= 0 && slot < effectiveList.length) {
      return effectiveList[slot]
    }
  }
  return undefined
}

export function resolveMatchedCodes(item, matched) {
  const m = matched || {}
  return {
    mc: matched
      ? String(m.NewMC || m.mc || m.Machine_MC || '').trim() || item.mc
      : item.mc,
    ki: matched
      ? String(m.Serial_OLD || m.ki || m.Machine_KI || '').trim() || item.ki
      : item.ki,
  }
}

export function resolveMatchedMeta(item, matched) {
  const m = matched || {}
  return {
    location: (matched && String(m.Location || m.location || '').trim())
      ? String(m.Location || m.location || '').trim()
      : item.location,
    type: (matched && String(m.Type || m.type || '').trim())
      ? String(m.Type || m.type || '').trim()
      : item.type,
  }
}

export function resolveMatchedSchedule(item, matched, getPMCountdown) {
  const m = matched || {}
  const nextPmDate = (matched && (m.nextPmDate || m.Next_PM_Date)) || item.nextPmDate || ''
  const lastPmDate = (matched && (m.lastPmDate || m.Last_PM_Date)) || item.lastPmDate || ''
  const countdown = nextPmDate ? getPMCountdown(nextPmDate) : null
  return {
    nextPmDate,
    lastPmDate,
    countdownDays: countdown ? countdown.days : (item.countdownDays ?? null),
    countdownLabel: (countdown && countdown.label) ? countdown.label : (item.countdownLabel || '—'),
    countdownColor: (countdown && countdown.color) ? countdown.color : (item.countdownColor || 'gray'),
  }
}

export function matchPmPlan(pmPlans, ki, mc) {
  let matchedPlan = null
  if (Array.isArray(pmPlans) && pmPlans.length > 0) {
    if (ki) {
      matchedPlan = pmPlans.find(p => {
        const pKI = String(p.Machine_KI || p.ki || p.Serial_OLD || '').trim().toUpperCase()
        return pKI && pKI === ki
      })
    }
    if (!matchedPlan && mc) {
      matchedPlan = pmPlans.find(p => {
        const pMC = String(p.Machine_MC || p.mc || p.NewMC || '').trim().toUpperCase()
        return pMC && pMC === mc
      })
    }
  }
  return matchedPlan
}

export function isMonthlyPmWorkOrder(wo, targetPrefix, isSystemWorkOrder) {
  if (!wo || (typeof isSystemWorkOrder === 'function' && isSystemWorkOrder(wo))) return false
  const type = String(wo.JobType || wo.Job_Type || wo.job_type || wo.jobType || '').toUpperCase()
  if (type !== 'PM') return false
  const sDate = String(wo.StartDate || wo.DateStart || wo.StartTime || wo.StartTimestamp || wo.created_at || '').slice(0, 10)
  const eDate = String(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp || '').slice(0, 10)
  return (sDate && sDate.startsWith(targetPrefix)) || (eDate && eDate.startsWith(targetPrefix))
}

export function matchSyncMachine(effectiveMachines, woKI, woMC) {
  return effectiveMachines.find(m => {
    const mSerial = String(m?.Serial_OLD || m?.ki || m?.Machine_KI || '').trim()
    const mCode = String(m?.NewMC || m?.mc || m?.Machine_MC || '').trim()
    if (woKI && mSerial && woKI.toUpperCase() === mSerial.toUpperCase()) return true
    if (woMC && mCode && woMC.toUpperCase() === mCode.toUpperCase()) return true
    return false
  })
}

export function matchSyncPlanItem(updatedItems, effectiveKI, effectiveMC) {
  return updatedItems.findIndex(item => {
    const itemMC = String(item.mc || '').toUpperCase()
    const itemKI = String(item.ki || '').toUpperCase()
    if (effectiveKI && itemKI && effectiveKI.toUpperCase() === itemKI) return true
    if (effectiveMC && itemMC && effectiveMC.toUpperCase() === itemMC) return true
    return false
  })
}
