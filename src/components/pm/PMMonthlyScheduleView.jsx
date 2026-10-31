import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Printer,
  RefreshCw,
  FileText,
  Check,
  X,
  Layers,
  Sparkles,
  Users,
  Search,
  ExternalLink,
  Tag,
} from 'lucide-react'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'
import { AppConfigAPI, WorkOrderAPI, CylinderAPI, isSystemWorkOrder } from '../../api/entities'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'

// Thai Month Names
export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

export const SHORT_THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

export const SCHEDULE_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'ตามแผน', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 'IN_PROGRESS', label: 'กำลังทำ', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'DELAYED', label: 'ล่าช้า', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'POSTPONED', label: 'เลื่อนแผน', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
]

export function getStatusMeta(status = 'SCHEDULED') {
  return SCHEDULE_STATUS_OPTIONS.find(s => s.value === status) || SCHEDULE_STATUS_OPTIONS[0]
}

/**
 * Calculates working days in a month (Monday to Saturday, Day 0 Sunday excluded).
 * Returns an array of date objects.
 */
export function getMonthlyWorkingDays(year, month1Indexed) {
  const daysInMonth = new Date(year, month1Indexed, 0).getDate()
  const workingDays = []

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month1Indexed - 1, day)
    // 0 = Sunday (Non-working day in 12h factory shift)
    if (d.getDay() !== 0) {
      workingDays.push({
        date: d,
        dateStr: format(d, 'yyyy-MM-dd'),
        dayNumber: day,
        dayOfWeek: d.getDay(),
      })
    }
  }
  return workingDays
}

/**
 * Groups working days into continuous 3-working-day blocks.
 */
export function buildThreeDayBlocks(workingDays = []) {
  const blocks = []
  for (let i = 0; i < workingDays.length; i += 3) {
    const slice = workingDays.slice(i, i + 3)
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
  let matched = effectiveList.find(m => {
    const serial = String(m?.Serial_OLD || m?.ki || m?.Machine_KI || '').trim()
    if (rawKI && serial && rawKI.toUpperCase() === serial.toUpperCase()) return true
    return false
  })

  // 2. If no match by KI, try matching by current machine code (if not generic)
  if (!matched && !isGenericMC && rawMC) {
    matched = effectiveList.find(m => {
      const code = String(m?.NewMC || m?.mc || m?.Machine_MC || '').trim()
      if (code && rawMC.toUpperCase() === code.toUpperCase()) return true
      return false
    })
  }

  // 3. Fallback for generic MC-XX without KI: match by slot index if applicable
  if (!matched && isGenericMC && effectiveList.length > 0) {
    const idxMatch = rawMC.match(/^MC-(\d+)$/i)
    if (idxMatch) {
      const slot = parseInt(idxMatch[1], 10) - 1
      if (slot >= 0 && slot < effectiveList.length) {
        matched = effectiveList[slot]
      }
    }
  }

  const resolvedMC = matched
    ? String(matched?.NewMC || matched?.mc || matched?.Machine_MC || '').trim() || item.mc
    : item.mc

  const resolvedKI = matched
    ? String(matched?.Serial_OLD || matched?.ki || matched?.Machine_KI || '').trim() || item.ki
    : item.ki

  const resolvedLocation = (matched && String(matched?.Location || matched?.location || '').trim())
    ? String(matched?.Location || matched?.location || '').trim()
    : item.location

  const resolvedType = (matched && String(matched?.Type || matched?.type || '').trim())
    ? String(matched?.Type || matched?.type || '').trim()
    : item.type

  return {
    ...item,
    mc: resolvedMC,
    ki: resolvedKI,
    location: resolvedLocation,
    type: resolvedType,
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
  month = new Date().getMonth() + 1
) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const targetPrefix = monthKey

  // Filter PM Work Orders for this month
  const pmWorkOrders = (Array.isArray(workOrders) ? workOrders : []).filter(wo => {
    if (!wo || (typeof isSystemWorkOrder === 'function' && isSystemWorkOrder(wo))) return false
    const type = String(wo.JobType || wo.Job_Type || wo.job_type || wo.jobType || '').toUpperCase()
    if (type !== 'PM') return false
    const sDate = String(wo.StartDate || wo.DateStart || wo.StartTime || wo.StartTimestamp || wo.created_at || '').slice(0, 10)
    const eDate = String(wo.EndDate || wo.DateEnd || wo.EndTime || wo.EndTimestamp || '').slice(0, 10)
    return (sDate && sDate.startsWith(targetPrefix)) || (eDate && eDate.startsWith(targetPrefix))
  })

  let updatedItems = [...monthlyItems]

  pmWorkOrders.forEach(wo => {
    const woMC = String(wo.MC || wo.Mc || wo.machine_mc || wo.Machine_MC || '').trim()
    const woKI = String(wo.KI || wo.Ki || wo.Machine_KI || wo.Serial_OLD || '').trim()

    // Match cylinder
    const matchedMachine = effectiveMachines.find(m => {
      const mSerial = String(m?.Serial_OLD || m?.ki || m?.Machine_KI || '').trim()
      const mCode = String(m?.NewMC || m?.mc || m?.Machine_MC || '').trim()
      if (woKI && mSerial && woKI.toUpperCase() === mSerial.toUpperCase()) return true
      if (woMC && mCode && woMC.toUpperCase() === mCode.toUpperCase()) return true
      return false
    })

    const effectiveMC = matchedMachine?.NewMC || matchedMachine?.mc || woMC
    const effectiveKI = matchedMachine?.Serial_OLD || matchedMachine?.ki || woKI

    // Find existing item in plan
    const existingIndex = updatedItems.findIndex(item => {
      const itemMC = String(item.mc || '').toUpperCase()
      const itemKI = String(item.ki || '').toUpperCase()
      if (effectiveKI && itemKI && effectiveKI.toUpperCase() === itemKI) return true
      if (effectiveMC && itemMC && effectiveMC.toUpperCase() === itemMC) return true
      return false
    })

    const sDate = String(wo.StartDate || wo.DateStart || wo.StartTime || `${targetPrefix}-01`).slice(0, 10)
    const eDate = String(wo.EndDate || wo.DateEnd || wo.EndTime || sDate).slice(0, 10)
    const woStatus = String(wo.Status || wo.status || '').toUpperCase()
    const mappedStatus = woStatus === 'COMPLETED' ? 'COMPLETED' : (woStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'SCHEDULED')
    const techName = wo.Technicians || wo.Tech || wo.Technician || ''
    const woNotes = wo.Comment || wo.Details || wo.Problem || ''
    const woId = wo.Job_ID || wo.WO_ID || wo.id

    if (existingIndex >= 0) {
      const item = updatedItems[existingIndex]
      let isOnTime = item.isOnTime
      if (mappedStatus === 'COMPLETED' && eDate && item.plannedEndDate) {
        isOnTime = eDate <= item.plannedEndDate
      }

      updatedItems[existingIndex] = {
        ...item,
        actualStartDate: sDate || item.actualStartDate,
        actualEndDate: eDate || item.actualEndDate,
        actualTech: techName || item.actualTech,
        status: mappedStatus,
        notes: woNotes || item.notes,
        workOrderId: woId || item.workOrderId,
        isOnTime: isOnTime !== undefined ? isOnTime : item.isOnTime,
        updatedAt: new Date().toISOString(),
      }
    } else {
      // Append unplanned PM work order
      const newItem = {
        id: `PMSCH-${monthKey.replace('-', '')}-UNPLANNED-${woId || Date.now().toString(36)}`,
        mc: effectiveMC,
        ki: effectiveKI,
        location: matchedMachine?.Location || matchedMachine?.location || 'GMK1',
        type: matchedMachine?.Type || matchedMachine?.type || 'Double',
        plannedStartDate: '',
        plannedEndDate: '',
        actualStartDate: sDate,
        actualEndDate: eDate,
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
      updatedItems.push(newItem)
    }
  })

  return updatedItems
}

/**
 * Auto-generates a 1-month PM plan (3 working days per machine, skipping Sundays).
 * Accurately extracts machine codes from active in-use machines list.
 */
export function autoGenerateMonthlySchedule(year, month1Indexed, machines = []) {
  const workingDays = getMonthlyWorkingDays(year, month1Indexed)
  const blocks = buildThreeDayBlocks(workingDays)
  const monthKey = `${year}-${String(month1Indexed).padStart(2, '0')}`

  // Pick unique machines from available machines list or fallback to stored in-use machines
  const fallback = getStoredInUseMachinesFallback()
  const availableMachines = (Array.isArray(machines) && machines.length > 0)
    ? machines
    : fallback

  return blocks.map((block, idx) => {
    const machine = availableMachines.length > 0
      ? availableMachines[idx % availableMachines.length]
      : null
    const mc = machine?.NewMC || machine?.mc || machine?.Machine_MC || machine?.Mc || `MC-${String(idx + 1).padStart(2, '0')}`
    const ki = machine?.Serial_OLD || machine?.ki || machine?.Machine_KI || ''
    const location = machine?.Location || machine?.location || 'GMK1'
    const type = machine?.Type || machine?.type || 'Double'

    return {
      id: `PMSCH-${monthKey.replace('-', '')}-${String(idx + 1).padStart(2, '0')}`,
      mc,
      ki,
      location,
      type,
      plannedStartDate: block.startDate,
      plannedEndDate: block.endDate,
      actualStartDate: '',
      actualEndDate: '',
      assignedTech: '',
      actualTech: '',
      status: 'SCHEDULED',
      notes: '',
      workingDays: block.workingDaysCount || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
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

export default function PMMonthlyScheduleView({
  machinesList = [],
  onBackToPlan,
  canEdit = true,
  canAdd = true,
  canDelete = true,
}) {
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

  // Combined active machines list with local storage fallback
  const effectiveMachines = useMemo(() => {
    if (Array.isArray(machinesList) && machinesList.length > 0) return machinesList
    if (remoteCylinders.length > 0) return remoteCylinders
    return getStoredInUseMachinesFallback()
  }, [machinesList, remoteCylinders])

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
    workingDays: 3,
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

  // Load schedule for selected year and month with Stale-While-Revalidate
  const loadMonthSchedule = useCallback(async (key) => {
    // 1. Instant cache load from localStorage (0ms first paint)
    let localParsed = null
    try {
      const local = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          localParsed = parsed.map(item => resolveItemMachine(item, effectiveMachines))
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
          const healed = parsed.map(item => resolveItemMachine(item, effectiveMachines))
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
    } catch (err) {
      console.warn('Failed to load monthly schedule:', err)
      if (!localParsed) {
        setAllSchedules(prev => ({ ...prev, [key]: [] }))
      }
    } finally {
      setLoadingSchedule(false)
    }
  }, [effectiveMachines])

  // Initial load
  useEffect(() => {
    loadMonthSchedule(configKey)
  }, [configKey, loadMonthSchedule])

  // Raw and resolved current items for the selected month
  const rawCurrentItems = useMemo(() => {
    return allSchedules[configKey] || []
  }, [allSchedules, configKey])

  const currentItems = useMemo(() => {
    return rawCurrentItems.map(item => resolveItemMachine(item, effectiveMachines))
  }, [rawCurrentItems, effectiveMachines])

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

  // Auto-sync Work Orders (PM job type) into Monthly Schedule
  const syncWithWorkOrders = useCallback(async (baseItems = currentItems, showToast = false) => {
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
        saveSchedule(synced)
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
  }, [currentItems, effectiveMachines, selectedYear, selectedMonth])

  // Trigger sync on month load or when currentItems are ready
  useEffect(() => {
    if (currentItems.length > 0) {
      syncWithWorkOrders(currentItems, false)
    }
  }, [configKey])

  // Save schedule to remote and local storage
  const saveSchedule = async (itemsToSave, targetConfigKey = configKey) => {
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
      toast.success('บันทึกสำเร็จ', 'อัปเดตข้อมูลแผน PM เรียบร้อย')
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ', err.message)
    } finally {
      setSavingSchedule(false)
    }
  }

  // Handle Auto-generate schedule
  const handleAutoGenerate = () => {
    if (currentItems.length > 0) {
      if (!window.confirm(`มีแผนงานของเดือน ${THAI_MONTHS[selectedMonth - 1]} ${selectedYear} อยู่แล้ว ${currentItems.length} เครื่อง\nคุณต้องการสร้างแผนงานใหม่ทับข้อมูลเดิมหรือไม่?`)) {
        return
      }
    }
    const newSchedule = autoGenerateMonthlySchedule(selectedYear, selectedMonth, effectiveMachines)
    saveSchedule(newSchedule)
  }

  // Handle open actual execution update modal
  const handleOpenUpdateModal = (item) => {
    setSelectedItem(item)
    setActualForm({
      actualStartDate: item.actualStartDate || item.plannedStartDate || '',
      actualEndDate: item.actualEndDate || (item.status === 'COMPLETED' ? item.plannedEndDate : ''),
      actualTech: item.actualTech || item.assignedTech || '',
      status: item.status || 'SCHEDULED',
      notes: item.notes || '',
    })
    setUpdateModalOpen(true)
  }

  // Handle Save Actual Execution
  const handleSaveActual = (e) => {
    e?.preventDefault?.()
    if (!selectedItem) return

    // Evaluate SLA On-Time: If actualEndDate is on or before plannedEndDate, it's on-time
    let isOnTime = null
    if (actualForm.status === 'COMPLETED' && actualForm.actualEndDate && selectedItem.plannedEndDate) {
      const actualEnd = startOfDay(parseISO(actualForm.actualEndDate))
      const plannedEnd = startOfDay(parseISO(selectedItem.plannedEndDate))
      isOnTime = !isAfter(actualEnd, plannedEnd)
    }

    const updatedItems = currentItems.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          actualStartDate: actualForm.actualStartDate,
          actualEndDate: actualForm.actualEndDate,
          actualTech: actualForm.actualTech,
          status: actualForm.status,
          notes: actualForm.notes,
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
    const blocks = buildThreeDayBlocks(workingDays)
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
    if (!window.confirm('คุณต้องการลบเครื่องนี้ออกจากแผนงานใช่หรือไม่?')) return
    const updatedItems = currentItems.filter(item => item.id !== id)
    saveSchedule(updatedItems)
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return currentItems.filter(item => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim()
        const matchMC = String(item.mc || '').toLowerCase().includes(q)
        const matchKI = String(item.ki || '').toLowerCase().includes(q)
        const matchLoc = String(item.location || '').toLowerCase().includes(q)
        const matchTech = String(item.actualTech || item.assignedTech || '').toLowerCase().includes(q)
        if (!matchMC && !matchKI && !matchLoc && !matchTech) return false
      }
      return true
    })
  }, [currentItems, statusFilter, searchQuery])

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
      {/* ── HEADER & NAVIGATION CONTROLS ───────────────────────── */}
      <div className="card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarRange size={22} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>จัดทำแผน PM รายเดือน</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                    3 วัน/เครื่อง (ไม่รวมอาทิตย์)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  วางแผนและติดตามงาน PM รายเครื่อง ย้อนหลัง/ล่วงหน้า และสรุปผลประจำเดือน-ทั้งปี
                </p>
              </div>
            </div>

            {/* View Mode Toggle: Monthly vs Annual */}
            <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 sm:ml-4">
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                แผนรายเดือน
              </button>
              <button
                type="button"
                onClick={() => setViewMode('annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'annual'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 size={13} />
                <span>สรุปภาพรวมทั้งปี (12 เดือน)</span>
              </button>
            </div>
          </div>

          {/* Month / Year Navigator Ribbon */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedYear(y => y - 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="ปีก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono font-bold text-xs px-2 text-slate-800 dark:text-slate-200">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear(y => y + 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="ปีถัดไป"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Month Dropdown / Pills */}
            {viewMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select font-bold text-xs py-1.5 px-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {THAI_MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name} ({idx + 1})
                  </option>
                ))}
              </select>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {viewMode === 'monthly' && canAdd && (
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  disabled={savingSchedule}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="สร้างตารางแผน PM 3 วันต่อเครื่องให้อัตโนมัติ โดยข้ามวันอาทิตย์"
                >
                  <Sparkles size={14} />
                  <span>สร้างแผนอัตโนมัติ (3 วัน/เครื่อง)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                title="พิมพ์ตารางแผน PM"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">พิมพ์แผน</span>
              </button>
            </div>
          </div>
        </div>

        {/* Month Quick Jump Ribbon (Only in Monthly Mode) */}
        {viewMode === 'monthly' && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-bold mr-1 shrink-0">เดือน:</span>
            {SHORT_THAI_MONTHS.map((mName, idx) => {
              const mNum = idx + 1
              const isSelected = selectedMonth === mNum
              const isCurrent = currentMonth === mNum && currentYear === selectedYear
              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => setSelectedMonth(mNum)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{mName}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

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
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] max-w-xs flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา M/C, KI, ช่าง, สถานที่..."
                    className="input pl-8 py-1.5 text-xs w-full"
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

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    ทั้งหมด ({currentItems.length})
                  </button>
                  {SCHEDULE_STATUS_OPTIONS.map(opt => {
                    const count = currentItems.filter(i => i.status === opt.value).length
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatusFilter(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          statusFilter === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* View Switcher & Add Machine */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Switcher: Timeline vs List View */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setScheduleDisplayMode('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setTimelineBarFilter('both')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

                {/* Sync Work Orders Button */}
                <button
                  type="button"
                  onClick={() => syncWithWorkOrders(currentItems, true)}
                  disabled={syncingWO}
                  className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="คลิกเพื่อดึงใบสั่งงาน PM ล่าสุดเข้าสู่แผน"
                >
                  <RefreshCw size={13} className={syncingWO ? "animate-spin text-blue-500" : ""} />
                  <span className="hidden sm:inline">ซิงค์ใบสั่งงาน PM</span>
                </button>

                {canAdd && (
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="btn-outline text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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
                      <span>แถบแผนงาน (3 วัน)</span>
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
                  <div className="min-w-[1050px]">
                    {/* Timeline Header Row */}
                    <div className="flex items-stretch border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-xs font-bold sticky top-0 z-10">
                      {/* Left Machine Columns */}
                      <div className="w-12 shrink-0 py-2.5 px-2 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        #
                      </div>
                      <div className="w-44 shrink-0 py-2.5 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        เครื่องจักร (M/C)
                      </div>
                      <div className="w-28 shrink-0 py-2.5 px-2 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        สถานะ
                      </div>

                      {/* 31 Calendar Day Columns Header */}
                      <div
                        className="flex-1 grid text-center"
                        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))` }}
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
                          {loadingSchedule ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-blue-500" />
                              <span>กำลังโหลดข้อมูลแผนงาน...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p>ยังไม่มีรายการแผน PM สำหรับเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                              {canAdd && (
                                <button
                                  type="button"
                                  onClick={handleAutoGenerate}
                                  className="btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Sparkles size={14} />
                                  <span>คลิกสร้างแผนอัตโนมัติ (3 วัน/เครื่อง)</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        filteredItems.map((item, idx) => {
                          const statusMeta = getStatusMeta(item.status)
                          const range = getItemDayRange(item, selectedYear, selectedMonth, daysInMonth)
                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-stretch hover:bg-slate-50/60 dark:hover:bg-slate-900/50 transition-colors group"
                            >
                              {/* Left Machine Columns */}
                              <div className="w-12 shrink-0 py-2.5 px-2 text-center text-slate-400 font-mono text-xs flex items-center justify-center border-r border-slate-200 dark:border-slate-800">
                                {idx + 1}
                              </div>
                              <div className="w-44 shrink-0 py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex flex-wrap items-center gap-1.5">
                                  <span>{item.mc}</span>
                                  {item.ki && <span className="text-[10px] font-mono text-slate-400">({item.ki})</span>}
                                  {item.isUnplanned && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      นอกแผน
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <span>{item.location || '—'}</span>
                                  {item.type && <span>· {item.type}</span>}
                                </div>
                              </div>
                              <div className="w-28 shrink-0 py-2.5 px-2 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpdateModal(item)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer hover:opacity-85 transition-opacity ${statusMeta.badgeClass}`}
                                  title="คลิกเพื่อดูหรืออัปเดตงานจริง"
                                >
                                  {statusMeta.label}
                                </button>
                                {item.workOrderId && (
                                  <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[90px]" title={`ใบสั่งงาน: ${item.workOrderId}`}>
                                    {item.workOrderId}
                                  </span>
                                )}
                              </div>

                              {/* Day Grid with Dual Timeline Bars */}
                              <div
                                className={`flex-1 grid relative ${timelineBarFilter === 'both' ? 'py-1.5 min-h-[58px]' : 'py-2 min-h-[46px]'}`}
                                style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))` }}
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
                                {(timelineBarFilter === 'both' || timelineBarFilter === 'planned') && range && (
                                  <div
                                    style={{
                                      gridColumnStart: range.startDay,
                                      gridColumnEnd: range.endDay + 1,
                                    }}
                                    onClick={() => handleOpenUpdateModal(item)}
                                    title={`แผนงาน: ${item.mc} (${item.plannedStartDate} ถึง ${item.plannedEndDate})`}
                                    className={`absolute z-4 rounded-lg px-2 flex items-center justify-between font-bold cursor-pointer transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs ${
                                      timelineBarFilter === 'both'
                                        ? 'top-1 h-[22px] text-[10px] opacity-95 hover:opacity-100'
                                        : 'inset-y-1.5 my-auto text-[11px] py-1'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="truncate">แผน: {item.mc}</span>
                                      <span className="text-[9px] opacity-85 font-mono hidden sm:inline">
                                        ({item.plannedStartDate.slice(8)} - {item.plannedEndDate.slice(8)})
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono hidden md:inline ml-1 shrink-0">
                                      {item.workingDays || 3}วัน
                                    </span>
                                  </div>
                                )}

                                {/* 2. Actual Bar (แถบทำจริงจากใบสั่งงาน PM) */}
                                {(timelineBarFilter === 'both' || timelineBarFilter === 'actual') && (() => {
                                  if (!item.actualStartDate) return null
                                  const actItem = {
                                    plannedStartDate: item.actualStartDate,
                                    plannedEndDate: item.actualEndDate || item.actualStartDate,
                                  }
                                  const actRange = getItemDayRange(actItem, selectedYear, selectedMonth, daysInMonth)
                                  if (!actRange) return null

                                  return (
                                    <div
                                      style={{
                                        gridColumnStart: actRange.startDay,
                                        gridColumnEnd: actRange.endDay + 1,
                                      }}
                                      onClick={() => handleOpenUpdateModal(item)}
                                      title={`ผลงานจริง: ${item.mc} (${item.actualStartDate} ถึง ${item.actualEndDate || item.actualStartDate}) | ${statusMeta.label}${item.workOrderId ? ` | WO: ${item.workOrderId}` : ''}`}
                                      className={`absolute z-5 rounded-lg px-2 flex items-center justify-between font-bold cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                                        timelineBarFilter === 'both'
                                          ? 'top-[31px] h-[22px] text-[10px]'
                                          : 'inset-y-1.5 my-auto text-[11px] py-1'
                                      } ${
                                        item.status === 'COMPLETED'
                                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                                          : item.status === 'IN_PROGRESS'
                                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs animate-pulse ring-1 ring-amber-300'
                                          : item.status === 'DELAYED'
                                          ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-xs'
                                          : item.status === 'POSTPONED'
                                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xs'
                                          : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-xs'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1 truncate">
                                        <span className="truncate">จริง: {item.actualTech || item.mc}</span>
                                        {item.workOrderId && (
                                          <span className="text-[9px] opacity-90 font-mono hidden sm:inline">
                                            ({item.workOrderId})
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 ml-1">
                                        {item.status === 'COMPLETED' ? (
                                          <CheckCircle2 size={11} className="text-white" />
                                        ) : item.status === 'IN_PROGRESS' ? (
                                          <Clock size={11} className="text-white" />
                                        ) : null}
                                        <span className="text-[9px] hidden md:inline">
                                          {statusMeta.label}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })()}
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
                      <th className="py-2.5 px-3">กำหนดตามแผน (3 วันทำการ)</th>
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
                          {loadingSchedule ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-blue-500" />
                              <span>กำลังโหลดข้อมูลแผนงาน...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p>ยังไม่มีรายการแผน PM สำหรับเดือน {THAI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                              {canAdd && (
                                <button
                                  type="button"
                                  onClick={handleAutoGenerate}
                                  className="btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Sparkles size={14} />
                                  <span>คลิกสร้างแผนอัตโนมัติ (3 วัน/เครื่อง)</span>
                                </button>
                              )}
                            </div>
                          )}
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
                              <span className="text-slate-600 dark:text-slate-300 font-medium">{item.location || '—'}</span>
                              {item.type && <span className="ml-1 text-[10px] text-slate-400">· {item.type}</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              {item.plannedStartDate ? (
                                <>
                                  <div className="font-mono text-slate-700 dark:text-slate-300">
                                    {item.plannedStartDate} → {item.plannedEndDate}
                                  </div>
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                    {item.workingDays || 3} วันทำการ (ไม่รวมอาทิตย์)
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
        <div className="space-y-6">
          {/* Annual KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                แผน PM รวมทั้งปี ({annualSummary.year})
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {annualSummary.totalPlanned} <span className="text-sm font-normal text-slate-400">เครื่อง</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                เป้าหมายครอบคลุมเครื่องจักรทั้งหมด
              </div>
            </div>

            <div className="card p-5 border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>เสร็จสมบูรณ์ทั้งปี</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {annualSummary.totalCompleted} <span className="text-sm font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                ความสำเร็จสะสม {annualSummary.annualCompletionRate}%
              </div>
            </div>

            <div className="card p-5 border border-amber-500/20 bg-amber-500/5 shadow-xs">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Play size={14} />
                <span>กำลังทำ / รอดำเนินการ</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
                {annualSummary.totalInProgress} <span className="text-sm font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ล่าช้าสะสม {annualSummary.totalDelayed} เครื่อง
              </div>
            </div>

            <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={14} />
                <span>อัตราตรงเวลาทั้งปี (On-Time SLA)</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {annualSummary.totalCompleted > 0 ? `${annualSummary.annualOnTimeRate}%` : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                ทันกำหนด {annualSummary.totalOnTime}/{annualSummary.totalCompleted} เครื่อง
              </div>
            </div>
          </div>

          {/* 12-Month Table Breakdown */}
          <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>ตารางสรุปแผน PM 12 เดือน ประจำปี {annualSummary.year}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เปรียบเทียบผลการดำเนินงาน PM ของแต่ละเดือนตลอดทั้งปี
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                ข้อมูล ณ สิ้นปี / อัปเดตล่าสุด Real-time
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14">เดือน</th>
                    <th className="py-2.5 px-3">ชื่อเดือน</th>
                    <th className="py-2.5 px-3 text-center">แผนทั้งหมด (เครื่อง)</th>
                    <th className="py-2.5 px-3 text-center">เสร็จแล้ว</th>
                    <th className="py-2.5 px-3 text-center">กำลังทำ</th>
                    <th className="py-2.5 px-3 text-center">ล่าช้า</th>
                    <th className="py-2.5 px-3">ความก้าวหน้า (% Completion)</th>
                    <th className="py-2.5 px-3 text-center">ตรงเวลา (On-Time)</th>
                    <th className="py-2.5 px-3 text-right">เปิดดูแผน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {annualSummary.monthsData.map((m) => {
                    const isCurrent = currentMonth === m.monthNumber && currentYear === annualSummary.year
                    return (
                      <tr
                        key={m.monthNumber}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                          isCurrent ? 'bg-blue-500/5 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                          {String(m.monthNumber).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{m.monthName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                เดือนปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {m.total}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {m.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400">
                          {m.inProgress}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-600 dark:text-rose-400">
                          {m.delayed}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-2 rounded-full ${
                                  m.completionRate === 100
                                    ? 'bg-emerald-500'
                                    : m.completionRate > 50
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${m.completionRate}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {m.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {m.completed > 0 ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {m.onTimeRate}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth(m.monthNumber)
                              setViewMode('monthly')
                            }}
                            className="btn-outline text-[11px] px-2.5 py-1 cursor-pointer"
                          >
                            เปิดดูแผน
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: UPDATE ACTUAL EXECUTION ─────────────────────── */}
      <Modal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`อัปเดตงานทำจริง: ${selectedItem?.mc || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveActual}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึกผลงานจริง</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveActual} className="space-y-4 text-xs">
          {/* Target Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">เครื่องจักร:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5">
                {selectedItem?.mc} {selectedItem?.ki ? `(${selectedItem?.ki})` : ''}
                {selectedItem?.isUnplanned && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    นอกแผน
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>ตำแหน่ง / ประเภท:</span>
              <span>{selectedItem?.location || '—'} · {selectedItem?.type || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>กำหนดตามแผน (3 วัน):</span>
              <span className="font-mono">{selectedItem?.plannedStartDate ? `${selectedItem.plannedStartDate} → ${selectedItem.plannedEndDate}` : '— (ไม่มีแผนล่วงหน้า)'}</span>
            </div>
            {selectedItem?.workOrderId && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">ใบสั่งงาน PM:</span>
                <a
                  href={`/workorders?search=${encodeURIComponent(selectedItem.workOrderId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  title="คลิกเพื่อเปิดดูใบสั่งงานฉบับเต็ม"
                >
                  <span>{selectedItem.workOrderId}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Actual Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เริ่มทำจริง (Actual Start)</label>
              <input
                type="date"
                value={actualForm.actualStartDate}
                onChange={(e) => setActualForm({ ...actualForm, actualStartDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">วันที่เสร็จจริง (Actual End)</label>
              <input
                type="date"
                value={actualForm.actualEndDate}
                onChange={(e) => setActualForm({ ...actualForm, actualEndDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
              />
            </div>
          </div>

          {/* Actual Tech & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ช่างผู้ปฏิบัติงานจริง</label>
              <input
                type="text"
                placeholder="ระบุชื่อช่าง..."
                value={actualForm.actualTech}
                onChange={(e) => setActualForm({ ...actualForm, actualTech: e.target.value })}
                className="input text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">สถานะการทำงาน</label>
              <select
                value={actualForm.status}
                onChange={(e) => setActualForm({ ...actualForm, status: e.target.value })}
                className="select text-xs font-semibold"
              >
                {SCHEDULE_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">ปัญหาที่พบ / รายละเอียดการซ่อมบำรุง</label>
            <textarea
              rows={3}
              placeholder="ระบุปัญหาที่พบ อะไหล่ที่เปลี่ยน หรือหมายเหตุเพิ่มเติม..."
              value={actualForm.notes}
              onChange={(e) => setActualForm({ ...actualForm, notes: e.target.value })}
              className="textarea text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ADD / EDIT SCHEDULED MACHINE ───────────────── */}
      <Modal
        open={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        title={editItemForm.id ? `แก้ไขแผน: ${editItemForm.mc}` : `เพิ่มเครื่องจักรในแผน (${THAI_MONTHS[selectedMonth - 1]} ${selectedYear})`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddEditModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">รหัสเครื่องจักร (MC) *</label>
              <input
                type="text"
                list="active-machines-datalist"
                placeholder="เช่น MC-01"
                value={editItemForm.mc}
                onChange={(e) => handleSelectMachinePreset(e.target.value)}
                className="input font-bold font-mono text-xs uppercase"
                required
              />
              <datalist id="active-machines-datalist">
                {effectiveMachines.map((m, i) => (
                  <option key={i} value={m.NewMC || m.mc || m.Machine_MC}>
                    {m.NewMC || m.mc || m.Machine_MC} {m.location ? `(${m.location})` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">รหัสงาน (KI) / ซีเรียล</label>
              <input
                type="text"
                placeholder="เช่น KI-9012"
                value={editItemForm.ki}
                onChange={(e) => setEditItemForm({ ...editItemForm, ki: e.target.value.toUpperCase() })}
                className="input font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">สถานที่ (Location)</label>
              <input
                type="text"
                placeholder="เช่น GMK1"
                value={editItemForm.location}
                onChange={(e) => setEditItemForm({ ...editItemForm, location: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">ประเภทเครื่อง</label>
              <input
                type="text"
                placeholder="Single / Double"
                value={editItemForm.type}
                onChange={(e) => setEditItemForm({ ...editItemForm, type: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันเริ่มตามแผน (Start Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedStartDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedStartDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">วันเสร็จตามแผน (End Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedEndDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedEndDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">ช่างผู้รับผิดชอบ</label>
            <input
              type="text"
              placeholder="ระบุชื่อช่าง..."
              value={editItemForm.assignedTech}
              onChange={(e) => setEditItemForm({ ...editItemForm, assignedTech: e.target.value })}
              className="input text-xs font-semibold"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
