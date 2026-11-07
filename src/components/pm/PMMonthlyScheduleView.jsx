import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  TrendingUp,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  FileText,
  X,
  Layers,
  Users,
  Search,
  Tag,
} from 'lucide-react'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'
import { AppConfigAPI, WorkOrderAPI, CylinderAPI, PMPlanAPI, countWorkingDaysExcludingSundays, isSystemWorkOrder } from '../../api/entities'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import PMMonthlyPrintModal from './PMMonthlyPrintModal'
import {
  matchMachineBySerial,
  matchMachineByCode,
  matchMachineBySlot,
  resolveMatchedCodes,
  resolveMatchedMeta,
  resolveMatchedSchedule,
  matchPmPlan,
  isMonthlyPmWorkOrder,
  matchSyncMachine,
  matchSyncPlanItem,
} from './monthlyMachineResolve'
import {
  resolveSyncWoDates,
  mapSyncWoStatus,
  resolveSyncWoMeta,
  resolveSyncEffectiveKeys,
  applySyncWoToItem,
  buildUnplannedSyncItem,
  resolveEffectiveActualEnd,
} from './monthlySyncItem'
import { buildPlannedBlockItem, THAI_MONTHS, SHORT_THAI_MONTHS, AVAILABLE_LOCATIONS, matchesLocation, SCHEDULE_STATUS_OPTIONS, sortMachinesByCountdownPriority, getMonthlyWorkingDays, matchScheduleFilter } from './monthlyPlanGenerate'
import { MonthlyHeader } from './MonthlyHeader'
import { MonthlyUpdateModal } from './MonthlyUpdateModal'
import { MonthlyAddEditModal } from './MonthlyAddEditModal'
import { MonthlyGenerateModal } from './MonthlyGenerateModal'
import { MonthlyAnnualView } from './MonthlyAnnualView'
import { MonthlyFilterBar } from './MonthlyFilterBar'
import { MonthlyEmptyState } from './MonthlyEmptyState'

export { SCHEDULE_STATUS_OPTIONS, AVAILABLE_LOCATIONS, matchesLocation, THAI_MONTHS, SHORT_THAI_MONTHS, sortMachinesByCountdownPriority, getMonthlyWorkingDays, resolveEffectiveActualEnd }
import { TimelineMachineCell } from './TimelineMachineCell'
import { TimelinePlannedBar } from './TimelinePlannedBar'
import { TimelineActualBar } from './TimelineActualBar'
import {
  resolveScheduleTargetMonth,
  loadScheduleItems,
  loadSyncMachines,
  loadSyncWorkOrders,
  loadRemainingWorkOrders,
  persistScheduleItems,
  dispatchScheduleUpdated,
} from './monthlyScheduleSync'
import {
  resolveDeletedWoKeys,
  matchEffectiveMachine,
  resolveEffectiveKeys,
  findAlternativeWO,
  matchMonthlyItem,
  buildRelinkedItem,
  resetPlannedItem,
} from './monthlyPlanRemoval'

// Thai Month Names

export function getStatusMeta(status = 'SCHEDULED') {
  return SCHEDULE_STATUS_OPTIONS.find(s => s.value === status) || SCHEDULE_STATUS_OPTIONS[0]
}

/**
 * Calculates working days countdown to Next PM Date (skipping Sundays).
 * Returns { days, label, color }. Negative days mean overdue ("เกิน X วัน").
 */
export function getPMCountdown(date) {
  if (!date) return { days: null, label: '—', color: 'gray' }
  const target = startOfDay(new Date(date))
  const today = startOfDay(new Date())
  if (isNaN(target.getTime())) return { days: null, label: '—', color: 'gray' }

  const workingDays = countWorkingDaysExcludingSundays(today, target)

  if (workingDays > 0) return { days: workingDays, label: `เหลือ ${workingDays} วัน`, color: 'green' }
  if (workingDays === 0) return { days: 0, label: 'ครบกำหนดวันนี้', color: 'yellow' }
  return { days: workingDays, label: `เกิน ${Math.abs(workingDays)} วัน`, color: 'red' }
}

/**
 * Augments a machine with its Next_PM_Date and countdown priority from PM Plan master list.
 */
export function augmentMachineWithPMPlan(machine, pmPlans = []) {
  if (!machine) return machine
  const mc = String(machine.NewMC || machine.mc || machine.Machine_MC || '').trim().toUpperCase()
  const ki = String(machine.Serial_OLD || machine.ki || machine.Machine_KI || '').trim().toUpperCase()

  const matchedPlan = matchPmPlan(pmPlans, ki, mc)

  const nextPmDate = matchedPlan?.Next_PM_Date || machine?.nextPmDate || machine?.Next_PM_Date || ''
  const lastPmDate = matchedPlan?.Last_PM_Date || machine?.lastPmDate || machine?.Last_PM_Date || ''
  const countdown = getPMCountdown(nextPmDate)

  return {
    ...machine,
    nextPmDate,
    lastPmDate,
    countdownDays: countdown.days,
    countdownLabel: countdown.label,
    countdownColor: countdown.color,
  }
}

/**
 * Groups working days into continuous N-working-day blocks (skipping Sundays).
 */
export function buildDayBlocks(workingDays = [], daysPerMachine = 3) {
  const n = Math.max(1, Number(daysPerMachine) || 3)
  const blocks = []
  for (let i = 0; i < workingDays.length; i += n) {
    const slice = workingDays.slice(i, i + n)
    if (slice.length > 0) {
      blocks.push({
        blockIndex: blocks.length + 1,
        startDate: slice[0].dateStr,
        endDate: slice[slice.length - 1].dateStr,
        workingDaysCount: slice.length,
        days: slice,
      })
    }
  }
  return blocks
}

/**
 * Backward-compatible alias for 3-day blocks.
 */
export function buildThreeDayBlocks(workingDays = []) {
  return buildDayBlocks(workingDays, 3)
}

/**
 * Calculates startDay, endDay, and span for rendering timeline bars in the calendar grid.
 */
export function getItemDayRange(item, year, month, daysInMonth) {
  if (!item?.plannedStartDate || !item?.plannedEndDate) return null
  const [sYear, sMonth, sDay] = item.plannedStartDate.split('-').map(Number)
  const [eYear, eMonth, eDay] = item.plannedEndDate.split('-').map(Number)

  let startDay = 1
  let endDay = daysInMonth

  if (sYear === year && sMonth === month) {
    startDay = sDay
  } else if (sYear < year || (sYear === year && sMonth < month)) {
    startDay = 1
  } else {
    return null
  }

  if (eYear === year && eMonth === month) {
    endDay = eDay
  } else if (eYear > year || (eYear === year && eMonth > month)) {
    endDay = daysInMonth
  } else {
    return null
  }

  return {
    startDay: Math.max(1, startDay),
    endDay: Math.min(daysInMonth, endDay),
    span: Math.max(1, Math.min(daysInMonth, endDay) - Math.max(1, startDay) + 1),
  }
}

/**
 * Retrieves fallback in-use cylinders/machines directly from local storage if not provided.
 */
export function getStoredInUseMachinesFallback() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem('textileops_tbl_cylinders') || localStorage.getItem('txops_tbl_cylinders')
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed) || parsed.length === 0) return []
    return parsed
      .filter(c => String(c?.Machine_Ref || '').trim().toLowerCase().startsWith('in-use'))
      .map(c => ({
        mc: String(c?.NewMC || c?.Machine_MC || c?.mc || '').trim(),
        ki: String(c?.Serial_OLD || c?.Machine_KI || c?.ki || '').trim(),
        location: String(c?.Location || c?.location || '').trim(),
        type: String(c?.Type || c?.type || '').trim(),
        raw: c,
      }))
      .filter(m => m.mc)
  } catch {
    return []
  }
}

/**
 * Resolves an item's machine code, ki, location, and type to the actual current in-use machine (NewMC).
 * Auto-resolves generic placeholder codes like MC-01, MC-02 to actual machine names (e.g. DA-306M).
 */
export function resolveItemMachine(item, cylindersOrMachines = []) {
  if (!item) return { mc: '', ki: '', location: '', type: '' }

  const effectiveList = Array.isArray(cylindersOrMachines) && cylindersOrMachines.length > 0
    ? cylindersOrMachines
    : getStoredInUseMachinesFallback()

  const rawMC = String(item.mc || '').trim()
  const rawKI = String(item.ki || '').trim()
  const isGenericMC = !rawMC || /^MC-\d+$/i.test(rawMC)

  // 1. Try matching by Serial_OLD / KI
  let matched = matchMachineBySerial(effectiveList, rawKI)

  // 2. If no match by KI, try matching by current machine code (if not generic)
  if (!matched && !isGenericMC && rawMC) {
    matched = matchMachineByCode(effectiveList, rawMC)
  }

  // 3. Fallback for generic MC-XX without KI: match by slot index if applicable
  if (!matched && isGenericMC && effectiveList.length > 0) {
    matched = matchMachineBySlot(effectiveList, rawMC)
  }

  const { mc: resolvedMC, ki: resolvedKI } = resolveMatchedCodes(item, matched)
  const { location: resolvedLocation, type: resolvedType } = resolveMatchedMeta(item, matched)
  const {
    nextPmDate: resolvedNextPmDate,
    lastPmDate: resolvedLastPmDate,
    countdownDays, countdownLabel, countdownColor,
  } = resolveMatchedSchedule(item, matched, getPMCountdown)

  return {
    ...item,
    mc: resolvedMC,
    ki: resolvedKI,
    location: resolvedLocation,
    type: resolvedType,
    nextPmDate: resolvedNextPmDate,
    lastPmDate: resolvedLastPmDate,
    countdownDays,
    countdownLabel,
    countdownColor,
  }
}

/**
 * Automatically syncs PM Work Orders into the monthly schedule items.
 * Updates in-plan machines with actual execution dates, techs, and status.
 * Automatically appends unplanned PM work orders with an [isUnplanned: true] tag.
 */
export function syncWorkOrdersToMonthlyPlan(
  monthlyItems = [],
  workOrders = [],
  effectiveMachines = [],
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  options = {}
) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const targetPrefix = monthKey

  // Filter PM Work Orders for this month
  const pmWorkOrders = (Array.isArray(workOrders) ? workOrders : []).filter(wo => {
    return isMonthlyPmWorkOrder(wo, targetPrefix, isSystemWorkOrder)
  })

  // Sort work orders by timestamp/id so later ones (e.g. COMPLETED) take precedence
  const sortedWorkOrders = [...pmWorkOrders].sort((a, b) => {
    const aDate = a.created_at || a.StartDate || ''
    const bDate = b.created_at || b.StartDate || ''
    return aDate.localeCompare(bDate)
  })

  let updatedItems = [...monthlyItems]

  sortedWorkOrders.forEach(wo => {
    const woMC = String(wo.MC || wo.Mc || wo.machine_mc || wo.Machine_MC || '').trim()
    const woKI = String(wo.KI || wo.Ki || wo.Machine_KI || wo.Serial_OLD || '').trim()

    // Match cylinder
    const matchedMachine = matchSyncMachine(effectiveMachines, woKI, woMC)

    const { effectiveMC, effectiveKI } = resolveSyncEffectiveKeys(matchedMachine, woMC, woKI)

    // Find existing item in plan
    const existingIndex = matchSyncPlanItem(updatedItems, effectiveKI, effectiveMC)

    const { sDate, rawEndDate, eDate, progressDate, latestLog } = resolveSyncWoDates(wo, targetPrefix, options)
    const mappedStatus = mapSyncWoStatus(wo)
    const { techName, woNotes, woId } = resolveSyncWoMeta(wo)
    const woFields = { sDate, rawEndDate, eDate, mappedStatus, techName, woNotes, woId, progressDate, latestLog }

    if (existingIndex >= 0) {
      const item = updatedItems[existingIndex]
      updatedItems[existingIndex] = applySyncWoToItem(item, woFields)
    } else {
      // Append unplanned PM work order
      const newItem = buildUnplannedSyncItem({
        wo,
        woFields,
        effectiveMC,
        effectiveKI,
        matchedMachine,
        monthKey,
      })
      updatedItems.push(newItem)
    }
  })

  return updatedItems
}

/**
 * Automatically syncs a single or updated PM Work Order directly into the Monthly PM Schedule.
 * Can be called immediately upon creating, completing, or modifying PM Work Orders from any page (e.g. WorkOrders.jsx).
 */
export async function syncPMWorkOrderToMonthlySchedule(workOrder, machines = []) {
  const target = resolveScheduleTargetMonth(workOrder)
  if (!target) return null
  const { targetYear, targetMonth, configKey } = target

  // 1. Load current items from AppConfigAPI / localStorage
  const currentItems = await loadScheduleItems(configKey)

  // 2. Load machines if not passed
  const effectiveMachines = await loadSyncMachines(machines, getStoredInUseMachinesFallback)

  // 3. Fetch all WorkOrders for this month (or combine with this workOrder)
  const allWos = await loadSyncWorkOrders(workOrder)

  // 4. Run syncWorkOrdersToMonthlyPlan
  const updatedItems = syncWorkOrdersToMonthlyPlan(
    currentItems,
    allWos,
    effectiveMachines,
    targetYear,
    targetMonth
  )

  // 5. Persist to localStorage and AppConfigAPI
  await persistScheduleItems(configKey, updatedItems)

  // 6. Dispatch custom event so any open PMMonthlyScheduleView updates immediately!
  dispatchScheduleUpdated(configKey, targetYear, targetMonth, updatedItems)

  return updatedItems
}

/**
 * Removes or resets the execution progress of a deleted PM work order from the monthly schedule items.
 * - If the machine was an unplanned entry (isUnplanned: true), it is completely removed from the schedule.
 * - If the machine was an in-plan entry, its actual execution progress is reset back to 'SCHEDULED' (ตามแผน).
 */
export function removePMWorkOrderFromMonthlyPlan(
  monthlyItems = [],
  deletedWorkOrder,
  remainingWorkOrders = [],
  effectiveMachines = [],
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1
) {
  if (!deletedWorkOrder || !Array.isArray(monthlyItems)) return monthlyItems

  const { delWoId, delMC, delKI } = resolveDeletedWoKeys(deletedWorkOrder)

  // Match deleted work order to effective machines if available
  const matchedMachine = matchEffectiveMachine(effectiveMachines, delMC, delKI)

  const { effectiveMC, effectiveKI } = resolveEffectiveKeys(matchedMachine, delMC, delKI)

  const updatedItems = []

  for (const item of monthlyItems) {
    const { itemMC, itemKI, isMatch } = matchMonthlyItem(item, { delWoId, effectiveMC, effectiveKI })

    if (!isMatch) {
      updatedItems.push(item)
      continue
    }

    // It is a match! Check if it's unplanned or in-plan
    if (item.isUnplanned) {
      const altWO = findAlternativeWO(remainingWorkOrders, delWoId, itemMC, itemKI)
      if (altWO) {
        // Re-link to the other PM work order
        updatedItems.push(buildRelinkedItem(item, altWO, { notesFallback: 'ใบสั่งงาน PM นอกแผน', trackOnTime: false }))
      } else {
        // No alternative WO: REMOVE UNPLANNED ITEM COMPLETELY!
      }
    } else {
      // In-plan machine: DO NOT delete the row, but reset its actual execution progress
      const altWO = findAlternativeWO(remainingWorkOrders, delWoId, itemMC, itemKI)
      if (altWO) {
        // Re-link to the other PM work order
        updatedItems.push(buildRelinkedItem(item, altWO, { notesFallback: item.notes, trackOnTime: true }))
      } else {
        updatedItems.push(resetPlannedItem(item))
      }
    }
  }

  return updatedItems
}

/**
 * Automatically syncs the deletion of a PM Work Order with the Monthly PM Schedule.
 * Can be called immediately upon deleting a PM Work Order from WorkOrders.jsx or any other page.
 */
export async function removePMWorkOrderFromMonthlySchedule(deletedWorkOrder, machines = []) {
  const target = resolveScheduleTargetMonth(deletedWorkOrder)
  if (!target) return null
  const { targetYear, targetMonth, configKey } = target

  // 1. Load current items from AppConfigAPI / localStorage
  const currentItems = await loadScheduleItems(configKey)

  // 2. Load machines if not passed
  const effectiveMachines = await loadSyncMachines(machines, getStoredInUseMachinesFallback)

  // 3. Fetch all WorkOrders excluding the deleted one
  const remainingWos = await loadRemainingWorkOrders(deletedWorkOrder)

  // 4. Run removePMWorkOrderFromMonthlyPlan
  const updatedItems = removePMWorkOrderFromMonthlyPlan(
    currentItems,
    deletedWorkOrder,
    remainingWos,
    effectiveMachines,
    targetYear,
    targetMonth
  )

  // 5. Persist to localStorage and AppConfigAPI
  await persistScheduleItems(configKey, updatedItems)

  // 6. Dispatch custom event so any open PMMonthlyScheduleView updates immediately!
  dispatchScheduleUpdated(configKey, targetYear, targetMonth, updatedItems)

  return updatedItems
}
/**
 * Auto-generates a 1-month PM plan (3 working days per machine, skipping Sundays).
 * Accurately extracts machine codes from active in-use machines list.
 */
export function autoGenerateMonthlySchedule(year, month1Indexed, machines = [], selectedLocations = ['ALL'], pmPlans = [], daysPerMachine = 3) {
  const workingDays = getMonthlyWorkingDays(year, month1Indexed)
  const blocks = buildDayBlocks(workingDays, daysPerMachine)
  const monthKey = `${year}-${String(month1Indexed).padStart(2, '0')}`

  // Pick unique machines from available machines list or fallback to stored in-use machines
  const fallback = getStoredInUseMachinesFallback()
  const rawMachines = (Array.isArray(machines) && machines.length > 0)
    ? machines
    : fallback

  // Augment with PM Plans if needed
  const allMachines = rawMachines.map(m => {
    if (typeof m.countdownDays === 'number' && m.countdownLabel) return m
    return augmentMachineWithPMPlan(m, pmPlans)
  })

  // Filter by selected locations if specified
  const filteredByLoc = allMachines.filter(m => matchesLocation(m.location, selectedLocations))
  const candidateMachines = filteredByLoc.length > 0 ? filteredByLoc : allMachines

  // Sort by Countdown Priority (Most Overdue First: -100 days > -98 days > 0 > +5 > null)
  const availableMachines = sortMachinesByCountdownPriority(candidateMachines)

  return blocks.map((block, idx) => {
    const machine = availableMachines.length > 0
      ? availableMachines[idx % availableMachines.length]
      : null
    return buildPlannedBlockItem(block, idx, machine, monthKey, daysPerMachine)
  })
}

/**
 * Calculates monthly schedule statistics.
 */
export function calculateMonthlyStats(items = []) {
  const total = items.length
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      scheduled: 0,
      postponed: 0,
      completionRate: 0,
      onTimeCount: 0,
      onTimeRate: 0,
    }
  }

  let completed = 0
  let inProgress = 0
  let delayed = 0
  let scheduled = 0
  let postponed = 0
  let onTimeCount = 0

  items.forEach(item => {
    if (item.status === 'COMPLETED') {
      completed++
      if (item.isOnTime !== false) onTimeCount++
    } else if (item.status === 'IN_PROGRESS') {
      inProgress++
    } else if (item.status === 'DELAYED') {
      delayed++
    } else if (item.status === 'POSTPONED') {
      postponed++
    } else {
      scheduled++
    }
  })

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const onTimeRate = completed > 0 ? Math.round((onTimeCount / completed) * 100) : 0

  return {
    total,
    completed,
    inProgress,
    delayed,
    scheduled,
    postponed,
    completionRate,
    onTimeCount,
    onTimeRate,
  }
}

const EMPTY_DEFAULT_ARRAY = Object.freeze([])

export default function PMMonthlyScheduleView({
  machinesList = EMPTY_DEFAULT_ARRAY,
  pmPlansList = EMPTY_DEFAULT_ARRAY,
  onBackToPlan,
  canEdit = true,
  canAdd = true,
  canDelete = true,
  isAdmin: isAdminProp,
}) {
  const auth = useAuth?.() || {}
  const isAdmin = typeof isAdminProp === 'boolean' ? isAdminProp : (auth?.user?.role === 'admin')
  const toast = useToast()

  const [remoteCylinders, setRemoteCylinders] = useState([])

  // Ensure cylinders are fetched from CylinderAPI if machinesList prop was empty or incomplete
  useEffect(() => {
    if (Array.isArray(machinesList) && machinesList.length > 0) return
    CylinderAPI.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const inUse = data
            .filter(c => String(c?.Machine_Ref || '').trim().toLowerCase().startsWith('in-use'))
            .map(c => ({
              mc: String(c?.NewMC || c?.Machine_MC || c?.mc || '').trim(),
              ki: String(c?.Serial_OLD || c?.Machine_KI || c?.ki || '').trim(),
              location: String(c?.Location || c?.location || '').trim(),
              type: String(c?.Type || c?.type || '').trim(),
              raw: c,
            }))
            .filter(m => m.mc)
          setRemoteCylinders(inUse)
          try {
            localStorage.setItem('textileops_tbl_cylinders', JSON.stringify(data))
          } catch {}
        }
      })
      .catch(() => {})
  }, [machinesList])

  // Remote PM Plans state for standalone routing
  const [remotePmPlans, setRemotePmPlans] = useState([])
  useEffect(() => {
    if (Array.isArray(pmPlansList) && pmPlansList.length > 0) return
    PMPlanAPI.list()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRemotePmPlans(data)
          try {
            localStorage.setItem('textileops_tbl_pm_plans', JSON.stringify(data))
          } catch {}
        }
      })
      .catch(() => {})
  }, [pmPlansList])

  const effectivePmPlans = useMemo(() => {
    if (Array.isArray(pmPlansList) && pmPlansList.length > 0) return pmPlansList
    if (remotePmPlans.length > 0) return remotePmPlans
    try {
      const raw = localStorage.getItem('textileops_tbl_pm_plans') || localStorage.getItem('txops_tbl_pm_plans')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return EMPTY_DEFAULT_ARRAY
  }, [pmPlansList, remotePmPlans])

  // Combined active machines list with local storage fallback and PM Plan augmentation
  const effectiveMachines = useMemo(() => {
    const rawList = (Array.isArray(machinesList) && machinesList.length > 0)
      ? machinesList
      : (remoteCylinders.length > 0 ? remoteCylinders : getStoredInUseMachinesFallback())
    return rawList.map(m => augmentMachineWithPMPlan(m, effectivePmPlans))
  }, [machinesList, remoteCylinders, effectivePmPlans])

  // Current Date anchor
  const now = useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  // Navigation state
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // View state: 'monthly' (regular month view) vs 'annual' (12-month summary hub)
  const [viewMode, setViewMode] = useState('monthly')

  // Schedule Display Mode: 'timeline' (Gantt bar table) vs 'list' (Detailed Table)
  const [scheduleDisplayMode, setScheduleDisplayMode] = useState('timeline')

  // Timeline Display Filter: 'both' (ดูคู่กัน แผน + ทำจริง), 'planned' (เฉพาะแผน), 'actual' (เฉพาะทำจริง)
  const [timelineBarFilter, setTimelineBarFilter] = useState('both')
  const [syncingWO, setSyncingWO] = useState(false)

  // Storage state
  const [allSchedules, setAllSchedules] = useState({})
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewLocationFilter, setViewLocationFilter] = useState(['ALL'])

  // Days Per Machine Configuration State (จำนวนวันทำการต่อเครื่อง)
  const [daysPerMachine, setDaysPerMachine] = useState(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('pm_monthly_days_per_machine') : null
      const num = parseInt(saved, 10)
      return num > 0 ? num : 3
    } catch {
      return 3
    }
  })
  const [genDaysPerMachine, setGenDaysPerMachine] = useState(daysPerMachine)

  // Location Select Pre-Generation Modal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [deleteMonthModalOpen, setDeleteMonthModalOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedGenLocations, setSelectedGenLocations] = useState(['ALL'])

  // Modals state
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [actualForm, setActualForm] = useState({
    actualStartDate: '',
    actualEndDate: '',
    actualTech: '',
    status: 'SCHEDULED',
    notes: '',
  })

  const [addEditModalOpen, setAddEditModalOpen] = useState(false)
  const [editItemForm, setEditItemForm] = useState({
    id: null,
    mc: '',
    ki: '',
    location: '',
    type: '',
    plannedStartDate: '',
    plannedEndDate: '',
    assignedTech: '',
    workingDays: daysPerMachine,
    status: 'SCHEDULED',
  })

  // Selected month key: e.g. "2026-10"
  const monthKey = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  }, [selectedYear, selectedMonth])

  const configKey = useMemo(() => `pm_monthly_schedule_${monthKey}`, [monthKey])

  // Number of days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate()
  }, [selectedYear, selectedMonth])

  // Calendar days array for Timeline grid
  const calendarDays = useMemo(() => {
    const days = []
    const THAI_DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, d)
      const dayOfWeek = dateObj.getDay()
      const dateStr = format(dateObj, 'yyyy-MM-dd')
      days.push({
        dayNumber: d,
        dayOfWeek,
        shortDayName: THAI_DAY_SHORT[dayOfWeek],
        dateStr,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
      })
    }
    return days
  }, [selectedYear, selectedMonth, daysInMonth])

  const effectiveMachinesRef = React.useRef(effectiveMachines)
  effectiveMachinesRef.current = effectiveMachines

  // Load schedule for selected year and month with Stale-While-Revalidate
  const loadMonthSchedule = useCallback(async (key) => {
    // 1. Instant cache load from localStorage (0ms first paint)
    let localParsed = null
    try {
      const local = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localParsed = parsed.map(item => resolveItemMachine(item, effectiveMachinesRef.current))
          setAllSchedules(prev => ({ ...prev, [key]: localParsed }))
        }
      }
    } catch {}

    if (!localParsed) {
      setLoadingSchedule(true)
    }

    try {
      // 2. Background revalidation from AppConfigAPI
      const list = await AppConfigAPI.list().catch(() => [])
      const found = list.find(c => c.key === key)
      if (found && found.value) {
        let parsed = []
        try { parsed = JSON.parse(found.value) } catch { parsed = [] }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const healed = parsed.map(item => resolveItemMachine(item, effectiveMachinesRef.current))
          setAllSchedules(prev => ({ ...prev, [key]: healed }))
          try {
            localStorage.setItem(key, JSON.stringify(healed))
          } catch {}
          setLoadingSchedule(false)
          return healed
        }
      }

      if (localParsed) {
        setLoadingSchedule(false)
        return localParsed
      }

      // If no schedule exists yet, return empty
      setAllSchedules(prev => ({ ...prev, [key]: [] }))
      return []
    } catch (err) {
      console.warn('Failed to load monthly schedule:', err)
      if (!localParsed) {
        setAllSchedules(prev => ({ ...prev, [key]: [] }))
      }
      return localParsed || []
    } finally {
      setLoadingSchedule(false)
    }
  }, [])

  // Raw and resolved current items for the selected month
  const rawCurrentItems = useMemo(() => {
    return allSchedules[configKey] || []
  }, [allSchedules, configKey])

  const currentItems = useMemo(() => {
    return rawCurrentItems.map(item => resolveItemMachine(item, effectiveMachines))
  }, [rawCurrentItems, effectiveMachines])

  const currentItemsRef = React.useRef(currentItems)
  currentItemsRef.current = currentItems

  // Save schedule to remote and local storage
  const saveSchedule = useCallback(async (itemsToSave, targetConfigKey = configKey, customSuccessMsg = null, silent = false) => {
    setSavingSchedule(true)
    try {
      const jsonStr = JSON.stringify(itemsToSave)

      // 1. Save to AppConfigAPI
      try {
        const list = await AppConfigAPI.list()
        const existing = list.find(c => c.key === targetConfigKey)
        if (existing) {
          await AppConfigAPI.update(existing.id || existing._id, { value: jsonStr })
        } else {
          await AppConfigAPI.create({ key: targetConfigKey, value: jsonStr })
        }
      } catch (e) {
        console.warn('Could not save to remote AppConfigAPI, using localStorage fallback:', e)
      }

      // 2. LocalStorage backup
      localStorage.setItem(targetConfigKey, jsonStr)

      // 3. Update memory state
      setAllSchedules(prev => ({ ...prev, [targetConfigKey]: itemsToSave }))
      if (customSuccessMsg) {
        toast.success(customSuccessMsg.title, customSuccessMsg.desc)
      } else if (!silent) {
        toast.success('บันทึกสำเร็จ', 'อัปเดตข้อมูลแผน PM เรียบร้อย')
      }
    } catch (err) {
      if (!silent) toast.error('บันทึกไม่สำเร็จ', err.message)
    } finally {
      setSavingSchedule(false)
    }
  }, [configKey])

  // Auto-sync Work Orders (PM job type) into Monthly Schedule
  const syncWithWorkOrders = useCallback(async (baseItems = currentItemsRef.current, showToast = false) => {
    try {
      setSyncingWO(true)
      // 1. Fetch Work Orders (API with LocalStorage fallback)
      let wos = []
      try {
        wos = await WorkOrderAPI.list()
      } catch {}
      if (!Array.isArray(wos) || wos.length === 0) {
        try {
          const raw = localStorage.getItem('textileops_tbl_workorders') || localStorage.getItem('txops_tbl_workorders')
          wos = raw ? JSON.parse(raw) : []
        } catch {}
      }

      // 2. Run sync
      const synced = syncWorkOrdersToMonthlyPlan(baseItems, wos, effectiveMachines, selectedYear, selectedMonth)
      const hasChanges = JSON.stringify(synced) !== JSON.stringify(baseItems)
      if (hasChanges) {
        await saveSchedule(synced, configKey, null, !showToast)
        if (showToast) {
          toast.success('ซิงค์ใบสั่งงาน PM สำเร็จ', `อัปเดตข้อมูลผลงานจริง ${synced.length} รายการ`)
        }
      } else if (showToast) {
        toast.info('ข้อมูลเป็นปัจจุบันแล้ว', 'ไม่มีใบสั่งงาน PM ใหม่ในเดือนนี้')
      }
    } catch (err) {
      if (showToast) toast.error('ซิงค์ไม่สำเร็จ', err.message)
    } finally {
      setSyncingWO(false)
    }
  }, [effectiveMachines, selectedYear, selectedMonth, configKey, saveSchedule])

  // Initial load & automatic sync with Work Orders
  useEffect(() => {
    let isMounted = true
    loadMonthSchedule(configKey).then(items => {
      if (isMounted) {
        syncWithWorkOrders(items || [], false)
      }
    })
    return () => { isMounted = false }
  }, [configKey, loadMonthSchedule, syncWithWorkOrders])

  // Listen for real-time schedule updates from WorkOrders or other components
  useEffect(() => {
    const handleScheduleUpdate = (e) => {
      if (e?.detail?.key === configKey && Array.isArray(e?.detail?.items)) {
        setAllSchedules(prev => ({ ...prev, [configKey]: e.detail.items }))
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('textileops_pm_schedule_updated', handleScheduleUpdate)
      return () => window.removeEventListener('textileops_pm_schedule_updated', handleScheduleUpdate)
    }
  }, [configKey])

  // Auto-heal saved schedule in background if placeholder codes (MC-01) were resolved
  useEffect(() => {
    if (!rawCurrentItems || rawCurrentItems.length === 0 || effectiveMachines.length === 0) return
    const needsHeal = rawCurrentItems.some((raw, idx) => {
      const resolved = currentItems[idx]
      return resolved && (raw.mc !== resolved.mc || raw.ki !== resolved.ki || raw.location !== resolved.location)
    })
    if (needsHeal) {
      const jsonStr = JSON.stringify(currentItems)
      localStorage.setItem(configKey, jsonStr)
      AppConfigAPI.list().then(list => {
        const existing = list.find(c => c.key === configKey)
        if (existing) {
          AppConfigAPI.update(existing.id || existing._id, { value: jsonStr }).catch(() => {})
        } else {
          AppConfigAPI.create({ key: configKey, value: jsonStr }).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [rawCurrentItems, currentItems, effectiveMachines, configKey])

  // Explicit Save Plan button handler
  const handleExplicitSaveSchedule = async () => {
    await saveSchedule(currentItems, configKey, {
      title: 'บันทึกแผนสำเร็จ 💾',
      desc: `บันทึกแผนงานเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear} (${currentItems.length} เครื่อง) เรียบร้อยแล้ว`,
    })
  }

  // Confirm delete entire month schedule handler
  const handleConfirmDeleteMonthSchedule = async () => {
    await saveSchedule([], configKey, {
      title: 'ลบแผนงานสำเร็จ 🗑️',
      desc: `ลบแผนงานประจำเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear} เรียบร้อยแล้ว`,
    })
    setDeleteMonthModalOpen(false)
  }

  // Handle Auto-generate schedule (opens location select modal)
  const handleAutoGenerate = () => {
    setSelectedGenLocations(['ALL'])
    setGenDaysPerMachine(daysPerMachine)
    setGenerateModalOpen(true)
  }

  // Confirm generate with selected locations, days per machine and countdown priority
  const handleConfirmGenerate = () => {
    const candidateMachines = effectiveMachines.filter(m => matchesLocation(m.location, selectedGenLocations))
    const machinesToUse = candidateMachines.length > 0 ? candidateMachines : effectiveMachines
    const newSchedule = autoGenerateMonthlySchedule(
      selectedYear,
      selectedMonth,
      machinesToUse,
      selectedGenLocations,
      effectivePmPlans,
      genDaysPerMachine
    )
    setDaysPerMachine(genDaysPerMachine)
    try {
      localStorage.setItem('pm_monthly_days_per_machine', String(genDaysPerMachine))
    } catch {}
    saveSchedule(newSchedule)
    setGenerateModalOpen(false)
    toast.success('สร้างแผน PM สำเร็จ', `จัดตาราง ${newSchedule.length} เครื่อง (${genDaysPerMachine} วัน/เครื่อง) เรียบร้อย`)
  }

  // Handle open actual execution update modal
  const handleOpenUpdateModal = (item) => {
    setSelectedItem(item)
    const autoEndDate = resolveEffectiveActualEnd(item, selectedYear, selectedMonth)
    setActualForm({
      actualStartDate: item.actualStartDate || item.plannedStartDate || '',
      actualEndDate: item.actualEndDate || (item.status === 'COMPLETED' ? item.plannedEndDate : (item.status === 'IN_PROGRESS' ? autoEndDate : '')),
      actualTech: item.actualTech || item.assignedTech || '',
      status: item.status || 'SCHEDULED',
      notes: item.notes || '',
      manualOverrideEndDate: Boolean(item.manualOverrideEndDate),
    })
    setUpdateModalOpen(true)
  }

  const handleResetAutoDate = () => {
    if (!selectedItem) return
    const autoEndDate = resolveEffectiveActualEnd(
      { ...selectedItem, manualOverrideEndDate: false, actualEndDate: null, actualStartDate: actualForm.actualStartDate || selectedItem.actualStartDate },
      selectedYear,
      selectedMonth
    )
    setActualForm(prev => ({
      ...prev,
      actualEndDate: autoEndDate,
      manualOverrideEndDate: false,
    }))
  }

  // Handle Save Actual Execution
  const handleSaveActual = (e) => {
    e?.preventDefault?.()
    if (!selectedItem) return

    let effectiveActualEnd = actualForm.actualEndDate
    let manualOverrideEndDate = selectedItem.manualOverrideEndDate || false

    if (actualForm.status === 'IN_PROGRESS') {
      const systemAutoDate = resolveEffectiveActualEnd(
        { ...selectedItem, manualOverrideEndDate: false, actualEndDate: null, actualStartDate: actualForm.actualStartDate || selectedItem.actualStartDate },
        selectedYear,
        selectedMonth
      )
      if (!isAdmin) {
        effectiveActualEnd = systemAutoDate
        manualOverrideEndDate = false
      } else {
        if (actualForm.actualEndDate && actualForm.actualEndDate !== systemAutoDate) {
          manualOverrideEndDate = true
        } else if (actualForm.manualOverrideEndDate === false) {
          manualOverrideEndDate = false
        }
      }
    } else {
      manualOverrideEndDate = false
    }

    // Evaluate SLA On-Time: If actualEndDate is on or before plannedEndDate, it's on-time
    let isOnTime = null
    if (actualForm.status === 'COMPLETED' && effectiveActualEnd && selectedItem.plannedEndDate) {
      const actualEnd = startOfDay(parseISO(effectiveActualEnd))
      const plannedEnd = startOfDay(parseISO(selectedItem.plannedEndDate))
      isOnTime = !isAfter(actualEnd, plannedEnd)
    }

    const updatedItems = currentItems.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          actualStartDate: actualForm.actualStartDate,
          actualEndDate: effectiveActualEnd,
          actualTech: actualForm.actualTech,
          status: actualForm.status,
          notes: actualForm.notes,
          manualOverrideEndDate,
          isOnTime,
          updatedAt: new Date().toISOString(),
        }
      }
      return item
    })

    saveSchedule(updatedItems)
    setUpdateModalOpen(false)
    setSelectedItem(null)
  }

  // Handle Add/Edit scheduled machine manually
  const handleOpenAddModal = () => {
    const workingDays = getMonthlyWorkingDays(selectedYear, selectedMonth)
    const blocks = buildDayBlocks(workingDays, daysPerMachine)
    const defaultBlock = blocks[0] || { startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') }

    setEditItemForm({
      id: null,
      mc: '',
      ki: '',
      location: 'GMK1',
      type: 'Double',
      plannedStartDate: defaultBlock.startDate,
      plannedEndDate: defaultBlock.endDate,
      assignedTech: '',
      workingDays: 3,
      status: 'SCHEDULED',
    })
    setAddEditModalOpen(true)
  }

  const handleOpenEditItemModal = (item) => {
    setEditItemForm({
      id: item.id,
      mc: item.mc || '',
      ki: item.ki || '',
      location: item.location || '',
      type: item.type || '',
      plannedStartDate: item.plannedStartDate || '',
      plannedEndDate: item.plannedEndDate || '',
      assignedTech: item.assignedTech || '',
      workingDays: item.workingDays || 3,
      status: item.status || 'SCHEDULED',
    })
    setAddEditModalOpen(true)
  }

  // When user selects a machine in the Add modal, auto-fill Ki, Location, Type
  const handleSelectMachinePreset = (mcCode) => {
    const found = effectiveMachines.find(m => String(m.mc || m.Machine_MC || m.NewMC || '').toUpperCase() === String(mcCode).toUpperCase())
    if (found) {
      setEditItemForm(prev => ({
        ...prev,
        mc: found.NewMC || found.mc || found.Machine_MC || mcCode,
        ki: found.Serial_OLD || found.ki || found.Machine_KI || prev.ki,
        location: found.Location || found.location || prev.location,
        type: found.Type || found.type || prev.type,
      }))
    } else {
      setEditItemForm(prev => ({ ...prev, mc: mcCode }))
    }
  }

  const handleSaveItem = (e) => {
    e?.preventDefault?.()
    if (!editItemForm.mc || !editItemForm.plannedStartDate || !editItemForm.plannedEndDate) {
      toast.warning('กรุณากรอกข้อมูล', 'กรุณาระบุรหัสเครื่อง และวันที่เริ่ม-สิ้นสุดตามแผน')
      return
    }

    let updatedItems
    if (editItemForm.id) {
      updatedItems = currentItems.map(item => {
        if (item.id === editItemForm.id) {
          return {
            ...item,
            mc: editItemForm.mc,
            ki: editItemForm.ki,
            location: editItemForm.location,
            type: editItemForm.type,
            plannedStartDate: editItemForm.plannedStartDate,
            plannedEndDate: editItemForm.plannedEndDate,
            assignedTech: editItemForm.assignedTech,
            workingDays: editItemForm.workingDays || 3,
            status: editItemForm.status,
            updatedAt: new Date().toISOString(),
          }
        }
        return item
      })
    } else {
      const newItem = {
        id: `PMSCH-${monthKey.replace('-', '')}-${Date.now().toString(36)}`,
        mc: editItemForm.mc,
        ki: editItemForm.ki,
        location: editItemForm.location,
        type: editItemForm.type,
        plannedStartDate: editItemForm.plannedStartDate,
        plannedEndDate: editItemForm.plannedEndDate,
        actualStartDate: '',
        actualEndDate: '',
        assignedTech: editItemForm.assignedTech,
        actualTech: '',
        status: editItemForm.status || 'SCHEDULED',
        notes: '',
        workingDays: editItemForm.workingDays || 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updatedItems = [...currentItems, newItem]
    }

    saveSchedule(updatedItems)
    setAddEditModalOpen(false)
  }

  const handleDeleteItem = (id) => {
    const itemToDelete = currentItems.find(i => i.id === id)
    const mcName = itemToDelete?.mc || 'เครื่องนี้'
    if (!window.confirm(`คุณต้องการลบเครื่อง ${mcName} ออกจากแผนงานใช่หรือไม่?`)) return
    const updatedItems = currentItems.filter(item => item.id !== id)
    saveSchedule(updatedItems, configKey, {
      title: 'ลบออกจากแผนสำเร็จ',
      desc: `ลบเครื่อง ${mcName} ออกจากแผนเรียบร้อย`,
    })
  }

  // Filter items
  // Filter items
  const filteredItems = useMemo(() => {
    return currentItems.filter(item => matchScheduleFilter(item, { statusFilter, viewLocationFilter, searchQuery }))
  }, [currentItems, statusFilter, viewLocationFilter, searchQuery])

  // Current Month KPI Stats
  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(currentItems)
  }, [currentItems])

  // Annual Summary Calculation (for 12 months)
  const annualSummary = useMemo(() => {
    const monthsData = []
    let totalPlanned = 0
    let totalCompleted = 0
    let totalInProgress = 0
    let totalDelayed = 0
    let totalOnTime = 0

    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`
      const cKey = `pm_monthly_schedule_${key}`
      const items = allSchedules[cKey] || []

      // If not yet loaded into state, try reading localStorage
      let effectiveItems = items
      if (effectiveItems.length === 0) {
        try {
          const raw = localStorage.getItem(cKey)
          if (raw) effectiveItems = JSON.parse(raw) || []
        } catch {}
      }

      const stats = calculateMonthlyStats(effectiveItems)
      monthsData.push({
        monthNumber: m,
        monthName: THAI_MONTHS[m - 1],
        shortName: SHORT_THAI_MONTHS[m - 1],
        key,
        cKey,
        itemsCount: effectiveItems.length,
        ...stats,
      })

      totalPlanned += stats.total
      totalCompleted += stats.completed
      totalInProgress += stats.inProgress
      totalDelayed += stats.delayed
      totalOnTime += stats.onTimeCount
    }

    const annualCompletionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
    const annualOnTimeRate = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 0

    return {
      year: selectedYear,
      monthsData,
      totalPlanned,
      totalCompleted,
      totalInProgress,
      totalDelayed,
      totalOnTime,
      annualCompletionRate,
      annualOnTimeRate,
    }
  }, [selectedYear, allSchedules])

  return (
    <div className="space-y-6">
      <MonthlyHeader daysPerMachine={daysPerMachine} viewMode={viewMode} setViewMode={setViewMode} selectedYear={selectedYear} setSelectedYear={setSelectedYear} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} currentMonth={currentMonth} currentYear={currentYear} savingSchedule={savingSchedule} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} currentItems={currentItems} handleAutoGenerate={handleAutoGenerate} handleExplicitSaveSchedule={handleExplicitSaveSchedule} setDeleteMonthModalOpen={setDeleteMonthModalOpen} setPrintModalOpen={setPrintModalOpen} />

      {/* ── VIEW 1: MONTHLY PLAN & DASHBOARD ──────────────────── */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Planned */}
            <div className="card p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ทั้งหมดในแผน</div>
              <div className="text-xl font-black mt-0.5 font-mono text-slate-900 dark:text-slate-100">
                {monthlyStats.total} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                {THAI_MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
            </div>

            {/* 2. Completed */}
            <div className="card p-3.5 border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>เสร็จสมบูรณ์</span>
              </div>
              <div className="text-xl font-black mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                {monthlyStats.completed} <span className="text-xs font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                ความสำเร็จ {monthlyStats.completionRate}%
              </div>
            </div>

            {/* 3. In Progress */}
            <div className="card p-3.5 border border-amber-500/20 bg-amber-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Play size={12} />
                <span>กำลังทำ</span>
              </div>
              <div className="text-xl font-black mt-0.5 font-mono text-amber-600 dark:text-amber-400">
                {monthlyStats.inProgress} <span className="text-xs font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                อยู่ระหว่างดำเนินการ
              </div>
            </div>

            {/* 4. Delayed */}
            <div className="card p-3.5 border border-rose-500/20 bg-rose-500/5 shadow-xs">
              <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>ล่าช้ากว่าแผน</span>
              </div>
              <div className="text-xl font-black mt-0.5 font-mono text-rose-600 dark:text-rose-400">
                {monthlyStats.delayed} <span className="text-xs font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">
                ต้องติดตามเร่งด่วน
              </div>
            </div>

            {/* 5. Completion Rate */}
            <div className="card p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp size={12} />
                <span>อัตราความสำเร็จ</span>
              </div>
              <div className="text-xl font-black mt-0.5 font-mono text-blue-600 dark:text-blue-400">
                {monthlyStats.completionRate}%
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${monthlyStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* 6. SLA On-Time Rate */}
            <div className="card p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                <span>อัตราตรงเวลา (On-Time)</span>
              </div>
              <div className="text-xl font-black mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                {monthlyStats.completed > 0 ? `${monthlyStats.onTimeRate}%` : '—'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                ทันกำหนด {monthlyStats.onTimeCount}/{monthlyStats.completed} งาน
              </div>
            </div>
          </div>

          {/* Schedule Container */}
          <div className="card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Filter & Search Bar: Tier 1 - Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative min-w-[200px] sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา M/C, KI, ช่าง, สถานที่..."
                  className="input pl-8 py-1.5 text-xs w-full min-h-[44px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <MonthlyFilterBar statusFilter={statusFilter} setStatusFilter={setStatusFilter} viewLocationFilter={viewLocationFilter} setViewLocationFilter={setViewLocationFilter} currentItems={currentItems} />
            </div>

            {/* Filter & Search Bar: Tier 2 - View Modes & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Switcher: Timeline vs List View */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScheduleDisplayMode('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      scheduleDisplayMode === 'timeline'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="แสดงแถบเวลาตามปฏิทิน 1-31 วัน"
                  >
                    <BarChart3 size={13} />
                    <span>แถบเวลา (Timeline)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleDisplayMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                      scheduleDisplayMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="แสดงตารางรายการข้อมูลละเอียด"
                  >
                    <Layers size={13} />
                    <span>ตารางรายการ</span>
                  </button>
                </div>

                {/* Timeline Mode Filter: Both vs Planned vs Actual */}
                {scheduleDisplayMode === 'timeline' && (
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTimelineBarFilter('both')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                        timelineBarFilter === 'both'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="แสดงแถบคู่: แผนงาน (แถวบน) และ ทำจริง (แถวล่าง) พร้อมกัน"
                    >
                      <span>📊 ดูคู่กัน (แผน+จริง)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineBarFilter('planned')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                        timelineBarFilter === 'planned'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="แสดงเฉพาะแถบสีน้ำเงินตามแผน 3 วัน"
                    >
                      <span>📅 เฉพาะแผน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineBarFilter('actual')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                        timelineBarFilter === 'actual'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="แสดงเฉพาะผลงานทำจริงจากใบสั่งงาน PM"
                    >
                      <span>🛠️ เฉพาะทำจริง</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Sync Work Orders & Add Machine */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => syncWithWorkOrders(currentItems, true)}
                  disabled={syncingWO}
                  className="btn-outline text-xs px-2.5 py-1.5 min-h-[44px] flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="คลิกเพื่อดึงใบสั่งงาน PM ล่าสุดเข้าสู่แผน"
                >
                  <RefreshCw size={13} className={syncingWO ? "animate-spin text-blue-500" : ""} />
                  <span className="hidden sm:inline">ซิงค์ใบสั่งงาน PM</span>
                  <span className="sm:hidden">ซิงค์ WO</span>
                </button>

                {canAdd && (
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="btn-outline text-xs px-3 py-1.5 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>เพิ่มเครื่องในแผน</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── MODE 1: TIMELINE GANTT VIEW (แสดงแถบการทำงานของแผนแต่ละเครื่อง) ── */}
            {scheduleDisplayMode === 'timeline' ? (
              <div className="space-y-3">
                {/* Legend Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-500 dark:text-slate-400">สัญลักษณ์แถบสี:</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-md bg-blue-600 shadow-xs inline-block"></span>
                      <span>แถบแผนงาน ({daysPerMachine} วัน)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-xs inline-block"></span>
                      <span>ทำจริง: เสร็จสิ้น (Completed)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-md bg-amber-500 shadow-xs inline-block"></span>
                      <span>ทำจริง: กำลังทำ (In Progress)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-3 h-3 rounded-md bg-rose-500 shadow-xs inline-block"></span>
                      <span>ทำจริง: ล่าช้า (Delayed)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">[นอกแผน] Unplanned</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                      <span className="w-3 h-3 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 inline-block"></span>
                      <span>วันอาทิตย์ (วันหยุด ไม่นับวันทำงาน)</span>
                    </span>
                  </div>
                </div>

                {/* Gantt Scroll Container */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="min-w-[1240px]">
                    {/* Timeline Header Row */}
                    <div className="flex items-stretch border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-xs font-bold sticky top-0 z-10">
                      {/* Left Machine Columns */}
                      <div className="w-10 shrink-0 py-1.5 px-1 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        #
                      </div>
                      <div className="w-64 shrink-0 py-1.5 px-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        เครื่องจักร (M/C)
                      </div>
                      <div className="w-40 shrink-0 py-1.5 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        สถานะ / จัดการ
                      </div>

                      {/* 31 Calendar Day Columns Header */}
                      <div
                        className="flex-1 grid text-center"
                        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(32px, 1fr))` }}
                      >
                        {calendarDays.map((day) => (
                          <div
                            key={day.dayNumber}
                            className={`py-1.5 px-0.5 border-r border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center ${
                              day.isSunday
                                ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                                : day.isToday
                                ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black ring-1 ring-inset ring-blue-500'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-mono">{day.shortDayName}</span>
                            <span className="text-xs font-black">{String(day.dayNumber).padStart(2, '0')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Body Rows */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <MonthlyEmptyState loadingSchedule={loadingSchedule} selectedMonth={selectedMonth} selectedYear={selectedYear} canAdd={canAdd} handleAutoGenerate={handleAutoGenerate} daysPerMachine={daysPerMachine} />
                        </div>
                      ) : (
                        filteredItems.map((item, idx) => {
                          const statusMeta = getStatusMeta(item.status)
                          const range = getItemDayRange(item, selectedYear, selectedMonth, daysInMonth)
                          const showPlanned = (timelineBarFilter === 'both' || timelineBarFilter === 'planned') && Boolean(range)
                          const effectiveActualEnd = resolveEffectiveActualEnd(item, selectedYear, selectedMonth)
                          const actItem = item.actualStartDate ? {
                            plannedStartDate: item.actualStartDate,
                            plannedEndDate: effectiveActualEnd,
                          } : null
                          const actRange = actItem ? getItemDayRange(actItem, selectedYear, selectedMonth, daysInMonth) : null
                          const showActual = (timelineBarFilter === 'both' || timelineBarFilter === 'actual') && Boolean(actRange)
                          const hasOverlap = showPlanned && showActual && !(range.endDay < actRange.startDay || range.startDay > actRange.endDay)

                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-stretch hover:bg-slate-50/60 dark:hover:bg-slate-900/50 transition-colors group"
                            >
                              {/* Left Machine Columns (Compact 1 Row) */}
                              <div className="w-10 shrink-0 py-1 px-1 text-center text-slate-400 font-mono text-xs flex items-center justify-center border-r border-slate-200 dark:border-slate-800">
                                {idx + 1}
                              </div>

                              <TimelineMachineCell item={item} />

                              <div className="w-40 shrink-0 py-1 px-2 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpdateModal(item)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer hover:opacity-85 transition-opacity truncate max-w-[80px] ${statusMeta.badgeClass}`}
                                  title={`คลิกเพื่อดูหรืออัปเดตงานจริง${item.workOrderId ? ` | WO: ${item.workOrderId}` : ''}`}
                                >
                                  {statusMeta.label}
                                </button>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditItemModal(item)}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      title={`แก้ไขแผน: ${item.mc}`}
                                      aria-label={`แก้ไขแผน ${item.mc}`}
                                    >
                                      <Calendar size={12} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                      title={`ลบ ${item.mc} ออกจากแผน`}
                                      aria-label={`ลบแผน ${item.mc}`}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Day Grid with Single-Row Compact Bars (~36px) */}
                              <div
                                className="flex-1 grid relative py-0.5 h-[36px] min-h-[44px]"
                                style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(32px, 1fr))` }}
                              >
                                {/* Background Day Columns */}
                                {calendarDays.map((day) => (
                                  <div
                                    key={day.dayNumber}
                                    className={`border-r border-slate-100 dark:border-slate-800/40 h-full ${
                                      day.isSunday
                                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                        : day.isToday
                                        ? 'bg-blue-50/30 dark:bg-blue-900/10'
                                        : ''
                                    }`}
                                  />
                                ))}

                                {/* 1. Planned Bar (แถบแผนงาน) */}
                                <TimelinePlannedBar item={item} range={range} hasOverlap={hasOverlap} showPlanned={showPlanned} handleOpenUpdateModal={handleOpenUpdateModal} />

                                {/* 2. Actual Bar (แถบทำจริงจากใบสั่งงาน PM) */}
                                <TimelineActualBar item={item} actRange={actRange} hasOverlap={hasOverlap} showActual={showActual} statusMeta={statusMeta} handleOpenUpdateModal={handleOpenUpdateModal} effectiveEndDate={effectiveActualEnd} />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── MODE 2: DETAILED LIST TABLE (ตารางรายการข้อมูลละเอียด) ── */
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                      <th className="py-2.5 px-3">เครื่องจักร (MC)</th>
                      <th className="py-2.5 px-3">ตำแหน่ง / ประเภท</th>
                      <th className="py-2.5 px-3">{`กำหนดตามแผน (${daysPerMachine} วันทำการ)`}</th>
                      <th className="py-2.5 px-3">ช่วงเวลาทำจริง</th>
                      <th className="py-2.5 px-3">ช่างผู้รับผิดชอบ</th>
                      <th className="py-2.5 px-3">สถานะ</th>
                      <th className="py-2.5 px-3">ประเมิน SLA</th>
                      <th className="py-2.5 px-3 text-right">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          <MonthlyEmptyState loadingSchedule={loadingSchedule} selectedMonth={selectedMonth} selectedYear={selectedYear} canAdd={canAdd} handleAutoGenerate={handleAutoGenerate} daysPerMachine={daysPerMachine} />
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const statusMeta = getStatusMeta(item.status)
                        const isCompleted = item.status === 'COMPLETED'
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                                <span>{item.mc}</span>
                                {item.ki && <span className="text-[10px] font-mono text-slate-400">({item.ki})</span>}
                                {item.isUnplanned && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    นอกแผน
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.location || '—'}</span>
                                {item.type && <span className="text-[10px] text-slate-400">· {item.type}</span>}
                                {item.countdownLabel && item.countdownLabel !== '—' && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center ${
                                    item.countdownColor === 'red' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                                    item.countdownColor === 'yellow' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                    item.countdownColor === 'green' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                    'bg-slate-500/10 text-slate-400'
                                  }`} title={item.nextPmDate ? `Next PM: ${item.nextPmDate}` : 'ไม่มีข้อมูล Next PM'}>
                                    {item.countdownLabel}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.plannedStartDate ? (
                                <>
                                  <div className="font-mono text-slate-700 dark:text-slate-300">
                                    {item.plannedStartDate} → {item.plannedEndDate}
                                  </div>
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                    {item.workingDays || daysPerMachine || 3} วันทำการ (ไม่รวมอาทิตย์)
                                  </div>
                                </>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">
                                  — (งานนอกแผน)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {item.actualStartDate ? (
                                <div>
                                  <div className="font-mono text-slate-800 dark:text-slate-200">
                                    {item.actualStartDate} → {item.actualEndDate || 'กำลังทำ'}
                                  </div>
                                  {item.workOrderId && (
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                                      <span>WO: {item.workOrderId}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                <Users size={12} className="text-slate-400" />
                                <span>{item.actualTech || item.assignedTech || '—'}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isCompleted ? (
                                item.isOnTime !== false ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    ✓ ทันกำหนด
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    ⚠ เกินกำหนด
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUpdateModal(item)}
                                    className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                                    title="อัปเดตงานทำจริง"
                                  >
                                    <Edit3 size={12} />
                                    <span>อัปเดตงานจริง</span>
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditItemModal(item)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    title="แก้ไขแผน"
                                  >
                                    <Calendar size={13} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                                    title="ลบออกจากแผน"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: ANNUAL 12-MONTH SUMMARY (แดชบอร์ดสรุปภาพรวมทั้งปี) ─ */}
      {viewMode === 'annual' && (
          <MonthlyAnnualView annualSummary={annualSummary} selectedYear={selectedYear} setSelectedYear={setSelectedYear} setSelectedMonth={setSelectedMonth} setViewMode={setViewMode} currentMonth={currentMonth} currentYear={currentYear} />
      )}

      <MonthlyUpdateModal updateModalOpen={updateModalOpen} setUpdateModalOpen={setUpdateModalOpen} selectedItem={selectedItem} actualForm={actualForm} setActualForm={setActualForm} handleSaveActual={handleSaveActual} daysPerMachine={daysPerMachine} isAdmin={isAdmin} onResetAutoDate={handleResetAutoDate} />

      <MonthlyAddEditModal addEditModalOpen={addEditModalOpen} setAddEditModalOpen={setAddEditModalOpen} editItemForm={editItemForm} setEditItemForm={setEditItemForm} selectedMonth={selectedMonth} selectedYear={selectedYear} effectiveMachines={effectiveMachines} handleSelectMachinePreset={handleSelectMachinePreset} handleSaveItem={handleSaveItem} />

      <MonthlyGenerateModal generateModalOpen={generateModalOpen} setGenerateModalOpen={setGenerateModalOpen} genDaysPerMachine={genDaysPerMachine} setGenDaysPerMachine={setGenDaysPerMachine} selectedGenLocations={selectedGenLocations} setSelectedGenLocations={setSelectedGenLocations} selectedMonth={selectedMonth} selectedYear={selectedYear} effectiveMachines={effectiveMachines} currentItems={currentItems} handleConfirmGenerate={handleConfirmGenerate} />

      {/* ── MODAL 4: CONFIRM DELETE ENTIRE MONTH SCHEDULE ── */}
      <Modal
        open={deleteMonthModalOpen}
        onClose={() => setDeleteMonthModalOpen(false)}
        title={`ยืนยันลบแผนงานประจำเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                คุณแน่ใจหรือไม่ที่จะลบแผนงานทั้งหมด?
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                ระบบจะลบเครื่องจักรทั้งหมดจำนวน <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold">{currentItems.length} เครื่อง</strong> ออกจากแผนงานประจำเดือน <strong>{THAI_MONTHS[selectedMonth - 1]} {selectedYear}</strong>
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                ⚠️ ข้อมูลแผนของเดือนนี้จะถูกล้างออกจากระบบ แต่จะไม่กระทบประวัติ PM หรือใบสั่งงานเดิม
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDeleteMonthModalOpen(false)}
              className="btn-outline px-3.5 py-1.5 text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteMonthSchedule}
              disabled={savingSchedule}
              className="px-4 py-1.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>ยืนยันลบแผนงาน ({currentItems.length} เครื่อง)</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── PM MONTHLY PRINT & PDF PREVIEW MODAL ── */}
      <PMMonthlyPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        year={selectedYear}
        month={selectedMonth}
        items={currentItems}
        stats={monthlyStats}
        daysPerMachine={daysPerMachine}
        locationFilter={viewLocationFilter.includes('ALL') ? 'ALL' : viewLocationFilter.join(', ')}
      />
    </div>
  )
}
