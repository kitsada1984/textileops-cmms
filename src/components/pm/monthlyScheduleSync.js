import { format } from 'date-fns'
import { AppConfigAPI, CylinderAPI, WorkOrderAPI } from '../../api/entities'

// Sync-pipeline steps moved verbatim from syncPMWorkOrderToMonthlySchedule
// (same I/O order and fallbacks — orchestration stays in the caller).

export function resolveScheduleTargetMonth(workOrder) {
  if (!workOrder) return null
  const jobType = String(workOrder.JobType || workOrder.Job_Type || workOrder.job_type || workOrder.jobType || '').toUpperCase()
  if (jobType !== 'PM') return null

  // Determine target month from StartDate or EndDate or today
  const sDate = String(workOrder.StartDate || workOrder.DateStart || workOrder.StartTime || workOrder.StartTimestamp || workOrder.created_at || '').slice(0, 10)
  const eDate = String(workOrder.EndDate || workOrder.DateEnd || workOrder.EndTime || workOrder.EndTimestamp || '').slice(0, 10)
  const targetDateStr = sDate || eDate || format(new Date(), 'yyyy-MM-dd')

  const [yearStr, monthStr] = targetDateStr.split('-')
  const targetYear = parseInt(yearStr, 10)
  const targetMonth = parseInt(monthStr, 10)
  if (isNaN(targetYear) || isNaN(targetMonth)) return null

  return {
    targetYear,
    targetMonth,
    configKey: `pm_monthly_schedule_${targetYear}-${String(targetMonth).padStart(2, '0')}`,
  }
}

export async function loadScheduleItems(configKey) {
  // 1. Load current items from AppConfigAPI / localStorage
  let currentItems = []
  try {
    const local = typeof localStorage !== 'undefined' ? localStorage.getItem(configKey) : null
    if (local) {
      const parsed = JSON.parse(local)
      if (Array.isArray(parsed)) currentItems = parsed
    }
  } catch {}

  try {
    const list = await AppConfigAPI.list().catch(() => [])
    const found = list.find(c => c.key === configKey)
    if (found && found.value) {
      const parsed = JSON.parse(found.value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        currentItems = parsed
      }
    }
  } catch {}
  return currentItems
}

export async function loadSyncMachines(machines, loadFallback) {
  // 2. Load machines if not passed
  let effectiveMachines = Array.isArray(machines) && machines.length > 0 ? machines : []
  if (effectiveMachines.length === 0) {
    try {
      const rawCylinders = await CylinderAPI.list().catch(() => [])
      if (Array.isArray(rawCylinders) && rawCylinders.length > 0) {
        effectiveMachines = rawCylinders
      }
    } catch {}
    if (effectiveMachines.length === 0) {
      effectiveMachines = loadFallback()
    }
  }
  return effectiveMachines
}

export async function loadSyncWorkOrders(workOrder) {
  // 3. Fetch all WorkOrders for this month (or combine with this workOrder)
  let allWos = []
  try {
    allWos = await WorkOrderAPI.list().catch(() => [])
  } catch {}
  if (!Array.isArray(allWos) || allWos.length === 0) {
    try {
      const raw = typeof localStorage !== 'undefined' ? (localStorage.getItem('textileops_tbl_workorders') || localStorage.getItem('txops_tbl_workorders')) : null
      allWos = raw ? JSON.parse(raw) : []
    } catch {}
  }
  // Ensure the current workOrder is in allWos (or replaces old version)
  const woId = workOrder.Job_ID || workOrder.WO_ID || workOrder.id
  const woIndex = allWos.findIndex(w => (w.Job_ID || w.WO_ID || w.id) === woId)
  if (woIndex >= 0) {
    allWos[woIndex] = { ...allWos[woIndex], ...workOrder }
  } else {
    allWos.push(workOrder)
  }
  return allWos
}

export async function persistScheduleItems(configKey, updatedItems) {
  // 5. Persist to localStorage and AppConfigAPI
  const jsonStr = JSON.stringify(updatedItems)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(configKey, jsonStr)
    }
  } catch {}

  try {
    const list = await AppConfigAPI.list().catch(() => [])
    const existing = list.find(c => c.key === configKey)
    if (existing) {
      await AppConfigAPI.update(existing.id || existing._id, { value: jsonStr })
    } else {
      await AppConfigAPI.create({ key: configKey, value: jsonStr })
    }
  } catch (e) {
    console.warn('Could not persist updated PM monthly schedule to AppConfigAPI:', e)
  }
  return jsonStr
}

export function dispatchScheduleUpdated(configKey, targetYear, targetMonth, updatedItems) {
  // 6. Dispatch custom event so any open PMMonthlyScheduleView updates immediately!
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('textileops_pm_schedule_updated', {
      detail: { key: configKey, year: targetYear, month: targetMonth, items: updatedItems }
    }))
  }
}

export async function loadRemainingWorkOrders(deletedWorkOrder) {
  // 3b. Fetch all WorkOrders excluding the deleted one
  let allWos = []
  try {
    allWos = await WorkOrderAPI.list().catch(() => [])
  } catch {}
  if (!Array.isArray(allWos) || allWos.length === 0) {
    try {
      const raw = typeof localStorage !== 'undefined' ? (localStorage.getItem('textileops_tbl_workorders') || localStorage.getItem('txops_tbl_workorders')) : null
      allWos = raw ? JSON.parse(raw) : []
    } catch {}
  }
  const delWoId = deletedWorkOrder.Job_ID || deletedWorkOrder.WO_ID || deletedWorkOrder.id
  return allWos.filter(w => {
    const id = w.Job_ID || w.WO_ID || w.id
    return id && id !== delWoId
  })
}
