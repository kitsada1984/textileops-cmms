import { useState, useMemo, useEffect } from 'react'
import {
  WORK_ORDER_STATUS_OPTIONS,
  DEFAULT_ACTIVE_STATUS_FILTERS,
  isDefaultStatusSelection,
  isAdminUser,
  getWorkOrderStatusMeta,
  getWorkOrderDetails,
  getJobDailyLogs,
  getLatestDailyLog,
} from './workOrderNormalize.js'

export { WORK_ORDER_STATUS_OPTIONS, DEFAULT_ACTIVE_STATUS_FILTERS, isDefaultStatusSelection, isAdminUser, getWorkOrderStatusMeta, getWorkOrderDetails, getJobDailyLogs, getLatestDailyLog }
import { filterWorkOrderJobs, toggleMultiFilterValue, nextMultiFilter, nextCauseFilter, togglePersistedOpen } from './workOrderFilters.js'
import { normalizeAllJobs, computeTypeCounts, computeStatusCounts, computeCauseCounts, computeKpiStats, saveKpiSettings } from './workOrderStats.js'
import { getJobInterruptions, computeCompleteDuration } from './workOrderInterruptions.js'
import { startInterruption, stopInterruption, addManualInterruption, deleteInterruption } from './workOrderInterruptionHandlers.js'
import { saveDailyLog, confirmCancelJob, deleteDailyLog } from './workOrderDailyLogHandlers.js'
import { useDefaultTabSync, useDeepLinkSearch, useTechLoader, useTechRealtimeSync } from './workOrderLifecycle.js'
import { buildCompleteModalState, buildEditModalState, buildDailyLogModalState, fireOpenPrintModal, fireOpenInterruptionModal, resolvePagePerms } from './workOrderModalOpeners.js'
import { buildAddTechForm, buildEditTechForm, selectUserForTech, saveTech, deleteTech, loadTechData, drilldownByCause } from './workOrderTechHandlers.js'
import { startJob, completeJob, quickStatusChange } from './workOrderSubmitHandlers.js'
import { matchActiveMachine, matchEditActiveMachine } from './workOrderMachines.js'
import { confirmAndRemoveJob, saveEditJob } from './workOrderEdit.js'
import { WorkOrderTechModal } from './WorkOrderTechModal.jsx'
import { WorkOrdersDashboard } from './WorkOrdersDashboard.jsx'
import { WorkOrdersHeader } from './WorkOrdersHeader.jsx'
import { WorkOrdersPrintModal } from './WorkOrdersPrintModal.jsx'
import { WorkOrdersReportBridge } from './WorkOrdersReportBridge.jsx'
import { WorkOrdersMachineDatalist } from './WorkOrdersMachineDatalist.jsx'
import { WorkOrdersCreateFab } from './WorkOrdersCreateFab.jsx'
import { WorkOrdersCreateModal } from './WorkOrdersCreateModal.jsx'
import { WorkOrdersCancelModal } from './WorkOrdersCancelModal.jsx'
import { WorkOrdersDailyLogModal } from './WorkOrdersDailyLogModal.jsx'
import { WorkOrdersInterruptionModal } from './WorkOrdersInterruptionModal.jsx'
import { WorkOrdersKpiModal } from './WorkOrdersKpiModal.jsx'
import { WorkOrdersEditModal } from './WorkOrdersEditModal.jsx'
import { WorkOrdersCompleteModal } from './WorkOrdersCompleteModal.jsx'
import { WorkOrdersRecords } from './WorkOrdersRecords.jsx'
import { WorkOrdersTechnicians } from './WorkOrdersTechnicians.jsx'
import { WorkOrdersSettings } from './WorkOrdersSettings.jsx'
import {
  Search,
  AlertCircle,
  FileSpreadsheet,
  Hourglass,
  Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../../hooks/useEntity'
import {
  WorkOrderAPI,
  TechnicianAPI,
  AuditLogAPI,
  WO_JOB_TYPE,
  TECH_SKILL_LEVELS,
  TECH_SPECIALIZATIONS,
  calculateSlaPerformance,
} from '../../api/entities'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import useDeviceView from '../../hooks/useDeviceView'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { SHEET_EXPORTS } from '../../utils/sheetExportConfigs'
import RepairRequests from './RepairRequests'
import { notifyLineWorkOrderAssigned } from '../../utils/line'
import { syncPMWorkOrderToMonthlySchedule, removePMWorkOrderFromMonthlySchedule } from '../../components/pm/PMMonthlyScheduleView'

const DEFAULT_KPI_TARGETS = {
  REPAIR: 1.0,
  DESIGN: 3.0,
  PM: 2.0,
  SETUP: 1.0,
}

export const QUICK_INTERRUPTION_PRESETS = [
  { label: '🧵 ไปขึ้นด้าย', template: 'ไปขึ้นด้าย เครื่อง ' },
  { label: '🔧 ไปช่วยงานด่วนเครื่องอื่น', template: 'ไปช่วยงานด่วน เครื่อง ' },
  { label: '📦 รอเบิกอะไหล่ / รอเปิดสโตร์', template: 'รอเบิกอะไหล่ / รอเปิดห้องสโตร์' },
  { label: '⚡ ไฟดับ / ลมตก / สาธารณูปโภค', template: 'ระบบสาธารณูปโภคขัดข้อง (ไฟดับ/ลมตก)' },
  { label: '🧹 ทำความสะอาด / สลับกะ', template: 'ทำความสะอาด / สลับกะงาน' },
]

export const WORK_ORDER_TYPE_OPTIONS = [
  {
    value: 'REPAIR',
    label: 'แก้ไข',
    fullLabel: '🛠️ แก้ไข (Repair)',
    icon: '🛠️',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs',
  },
  {
    value: 'DESIGN',
    label: 'ปรับแบบ',
    fullLabel: '🎨 ปรับแบบ (Design)',
    icon: '🎨',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs',
  },
  {
    value: 'PM',
    label: 'PM / ล้างเครื่อง',
    fullLabel: '🧹 PM / ล้างเครื่อง',
    icon: '🧹',
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs',
  },
  {
    value: 'SETUP',
    label: 'เตรียมเครื่อง',
    fullLabel: '⚙️ เตรียมเครื่อง (Setup)',
    icon: '⚙️',
    activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
  },
]

/**
 * Normalizes any work order status code or Thai label into a standard metadata object.
 * Guarantees 100% backward compatibility with legacy 'IN_PROGRESS', 'COMPLETED', 'กำลังทำ', 'เสร็จสิ้น'.
 */

/**
 * Checks whether a job's type matches the selected type filter (string or array/set of types).
 * Supports multi-select, 100% backward compatible.
 */
export function matchesWorkOrderTypeFilter(jobType, filterValue = 'ALL') {
  if (!filterValue || filterValue === 'ALL') return true
  const norm = (jobType || 'REPAIR').toUpperCase()
  if (Array.isArray(filterValue) || filterValue instanceof Set) {
    const list = Array.isArray(filterValue) ? filterValue : Array.from(filterValue)
    if (list.length === 0 || list.includes('ALL')) return true
    return list.some((f) => (f || '').toUpperCase() === norm)
  }
  return (filterValue || '').toUpperCase() === norm
}

/**
 * Checks whether a job's status matches the selected status filter (string or array/set of statuses).
 * Supports multi-select, 100% backward compatible.
 */
export function matchesWorkOrderStatusFilter(jobStatus, filterValue = 'ALL') {
  if (!filterValue || filterValue === 'ALL') return true
  const jobMeta = getWorkOrderStatusMeta(jobStatus)

  if (Array.isArray(filterValue) || filterValue instanceof Set) {
    const list = Array.isArray(filterValue) ? filterValue : Array.from(filterValue)
    if (list.length === 0 || list.includes('ALL')) return true
    return list.some((f) => getWorkOrderStatusMeta(f).value === jobMeta.value)
  }

  const filterMeta = getWorkOrderStatusMeta(filterValue)
  return jobMeta.value === filterMeta.value
}

/**
 * Checks whether a job's problem cause matches the selected cause filter.
 * Supports: 'ALL' or empty (matches all), specific causes ('คน', 'เครื่องจักร', 'วัตถุดิบ'),
 * or 'UNSPECIFIED' (matches empty or unassigned cause).
 */
export function matchesWorkOrderProblemCauseFilter(jobCause, filterVal) {
  if (!filterVal || filterVal === 'ALL') return true
  const c = String(jobCause || '').trim()
  if (filterVal === 'UNSPECIFIED') {
    return !c
  }
  return c === filterVal
}

/**
 * Computes breakdown metrics and SLA performance by problem cause (คน, เครื่องจักร, วัตถุดิบ, ยังไม่ระบุ).
 * Non-breaking pure calculation helper suitable for dashboard and unit testing.
 */
export function calculateProblemCauseStats(jobs = [], kpiTargets = DEFAULT_KPI_TARGETS) {
  const activeJobs = (jobs || []).filter((j) => !j?.IsDeleted)
  const total = activeJobs.length

  const calcCauseKpi = (causeVal) => {
    const jobsOfCause = activeJobs.filter((j) => {
      const c = String(j?.ProblemCause || j?.problem_cause || '').trim()
      if (causeVal === 'UNSPECIFIED') return !c
      return c === causeVal
    })
    const totalCount = jobsOfCause.length

    let onTimeCount = 0
    let overdueCount = 0
    let totalHours = 0
    let countWithDuration = 0

    jobsOfCause.forEach((j) => {
      const sla = calculateSlaPerformance(j, kpiTargets, 12)
      if (sla.isOnTime) onTimeCount += 1
      else overdueCount += 1

      const durationVal = parseFloat(j?.WorkingHoursDecimal || j?.Duration || sla.netHoursDecimal) || 0
      if (durationVal > 0) {
        totalHours += durationVal
        countWithDuration += 1
      }
    })

    const rate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0
    const percentage = total > 0 ? Math.round((totalCount / total) * 100) : 0
    const exactPercentage = total > 0 ? parseFloat(((totalCount / total) * 100).toFixed(1)) : 0
    const avgHours = countWithDuration > 0 ? (totalHours / countWithDuration).toFixed(1) : '—'
    const avgDurationText = avgHours !== '—' ? `${avgHours} ชม.` : '—'

    return {
      key: causeVal,
      total: totalCount,
      percentage,
      exactPercentage,
      onTime: onTimeCount,
      overdue: overdueCount,
      rate,
      avgDurationText,
    }
  }

  return {
    personnel: calcCauseKpi('คน'),
    machine: calcCauseKpi('เครื่องจักร'),
    material: calcCauseKpi('วัตถุดิบ'),
    unspecified: calcCauseKpi('UNSPECIFIED'),
  }
}

/**
 * Normalizes details text for work orders, safely extracting user-readable description
 * even if stored as JSON or under legacy column aliases (Problem, Detail, Details, etc.).
 */

/**
 * Safely parses and returns daily work progress logs from a work order record.
 * Supports JSON string or array, double-stringified JSON, and fallback metadata in Comment.
 */

/**
 * Returns the most recent daily work log entry, or null if none exist.
 * Sorts chronologically so the latest date/timestamp is consistently returned.
 */

export function buildCancelJobPayload(params = {}) {
  const { job, cancelDate, reason = '', technician = 'ผู้ยกเลิก' } = params || {}
  if (!job) return null
  const dateStr = cancelDate || format(new Date(), 'yyyy-MM-dd')
  const existingLogs = getJobDailyLogs(job)
  const newEntry = {
    id: `DLOG-${Date.now()}`,
    date: dateStr,
    timestamp: new Date().toISOString(),
    status: 'CANCELLED',
    details: `[ยกเลิกใบสั่งงาน]: ${reason.trim()}`,
    hours: null,
    techs: [technician],
    recorded_by: technician,
  }
  const updatedLogs = [...existingLogs, newEntry]
  const logsJson = JSON.stringify(updatedLogs)
  return {
    ...job,
    Status: 'CANCELLED',
    DailyLogs: logsJson,
    daily_logs: logsJson,
    CancellationReason: reason.trim(),
    UpdatedBy: technician,
    updated_at: new Date().toISOString(),
  }
}


/**
 * Maps a system user (e.g. from LINE Login) into technician form fields.
 */
export function buildTechFromUser(user = {}, currentForm = {}) {
  const lineId = user.line_user_id || ''
  const displayName = user.full_name || user.line_display_name || user.username || ''
  return {
    ...currentForm,
    Name: currentForm.Name?.trim() ? currentForm.Name : displayName,
    Line_ID: lineId || currentForm.Line_ID || '',
    Avatar_URL: user.line_picture_url || currentForm.Avatar_URL || '',
    User_ID: user.id || currentForm.User_ID || '',
  }
}

/**
 * Finds users from the system who have logged in via LINE but are not yet registered as technicians.
 */
export function getUnregisteredLineUsers(systemUsers = [], technicians = []) {
  if (!Array.isArray(systemUsers)) return []
  const techLineIds = new Set(
    (technicians || [])
      .map((t) => (t.Line_ID || t.line_id || '').trim().toLowerCase())
      .filter(Boolean)
  )
  const techNames = new Set(
    (technicians || [])
      .map((t) => (t.Name || t.name || '').trim().toLowerCase())
      .filter(Boolean)
  )

  return systemUsers.filter((u) => {
    if (!u || !u.line_user_id) return false
    const normLineId = String(u.line_user_id).trim().toLowerCase()
    const normName = String(u.full_name || u.line_display_name || u.username || '').trim().toLowerCase()
    return !techLineIds.has(normLineId) && !techNames.has(normName)
  })
}


const DEFAULT_TECHS = []

export const WO_FILTER_STORAGE_KEYS = {
  TYPE_OPEN: 'textileops_wo_filter_type_open',
  STATUS_OPEN: 'textileops_wo_filter_status_open',
  CAUSE_OPEN: 'textileops_wo_filter_cause_open',
}

/**
 * Extracts and deduplicates in-use machines (NewMC) from cylinders data.
 * Filters strictly for active running cylinders whose Machine_Ref starts with 'in-use'.
 */
export function extractInUseMachinesFromCylinders(cylinders = []) {
  if (!Array.isArray(cylinders)) return []
  const map = new Map()
  cylinders.forEach((cyl) => {
    const machineRef = String(cyl?.Machine_Ref || '').trim()
    const isRunning = machineRef.toLowerCase().startsWith('in-use')
    const mcCode = String(cyl?.NewMC || '').trim()
    if (isRunning && mcCode && !map.has(mcCode.toUpperCase())) {
      map.set(mcCode.toUpperCase(), {
        code: mcCode,
        machineRef,
        serial: cyl?.Serial_OLD || cyl?.Serial_NOW || '',
        location: cyl?.Location || '',
        standard: cyl?.Standard || '',
        diameter: cyl?.Diameter || '',
        gauge: cyl?.Gauge || '',
        type: cyl?.Type || '',
        raw: cyl,
      })
    }
  })
  return Array.from(map.values()).sort((a, b) =>
    a.code.localeCompare(b.code, 'th', { numeric: true })
  )
}

export default function WorkOrders({ defaultTab = 'records' }) {
  const { t } = useT()
  const { isMobile, isTablet, isDesktop } = useDeviceView()
  const { user } = useAuth()
  const toast = useToast()
  const pagePerms = usePagePerms('workorders')
  const { canAdd, canEdit, canDelete } = resolvePagePerms(pagePerms)

  // Entity Hook for WorkOrders
  const {
    data: rawJobs,
    loading: jobsLoading,
    load: loadJobs,
    save: saveJob,
    remove: removeJob,
  } = useEntity(WorkOrderAPI)

  // Tabs: 'records' | 'repair_requests' | 'dashboard' | 'technicians' | 'settings'
  const [currentTab, setCurrentTab] = useState(defaultTab)

  useDefaultTabSync(defaultTab, setCurrentTab)

  // Technicians State
  const [technicians, setTechnicians] = useState(DEFAULT_TECHS)
  const [techLoading, setTechLoading] = useState(false)
  const [systemUsers, setSystemUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')

  // KPI Settings State
  const [kpiTargets, setKpiTargets] = useState(DEFAULT_KPI_TARGETS)

  // Cylinders State (for in-use machines auto-suggest)
  const [cylinders, setCylinders] = useState(() => {
    if (typeof localStorage === 'undefined') return []
    try {
      const raw =
        localStorage.getItem('textileops_tbl_cylinders') ||
        localStorage.getItem('txops_tbl_cylinders')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [typeFilters, setTypeFilters] = useState([]) // [] = ALL, or ['REPAIR', 'DESIGN', ...]
  // Default: the 5 pending-work statuses pre-ticked, finished / cancelled unticked.
  const [statusFilters, setStatusFilters] = useState(DEFAULT_ACTIVE_STATUS_FILTERS)
  const [causeFilter, setCauseFilter] = useState('') // '' = ALL, 'คน', 'เครื่องจักร', 'วัตถุดิบ', 'UNSPECIFIED'
  const [showDeleted, setShowDeleted] = useState(false)

  // Collapsible Filter Panels with localStorage persistence
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(WO_FILTER_STORAGE_KEYS.TYPE_OPEN)
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(WO_FILTER_STORAGE_KEYS.STATUS_OPEN)
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const [isCauseFilterOpen, setIsCauseFilterOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(WO_FILTER_STORAGE_KEYS.CAUSE_OPEN)
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const toggleTypeFilterOpen = () => {
    setIsTypeFilterOpen((prev) => togglePersistedOpen(prev, WO_FILTER_STORAGE_KEYS.TYPE_OPEN))
  }

  const toggleStatusFilterOpen = () => {
    setIsStatusFilterOpen((prev) => togglePersistedOpen(prev, WO_FILTER_STORAGE_KEYS.STATUS_OPEN))
  }

  const toggleCauseFilterOpen = () => {
    setIsCauseFilterOpen((prev) => togglePersistedOpen(prev, WO_FILTER_STORAGE_KEYS.CAUSE_OPEN))
  }

  // Multi-select toggle helpers for Job Type and Status Cards
  const toggleTypeFilter = (val) => {
    setTypeFilters((prev) => nextMultiFilter(prev, val))
  }

  const toggleStatusFilter = (val) => {
    setStatusFilters((prev) => nextMultiFilter(prev, val))
  }

  // Toggle helper for Problem Cause Filter Cards
  const toggleCauseFilter = (val) => {
    setCauseFilter(nextCauseFilter(causeFilter, val))
  }

  // Interactive Quick Drilldown from Dashboard to Records Tab
  const handleDrilldownByCause = (causeKey) => {
    drilldownByCause({ causeKey, setCauseFilter, setCurrentTab })
  }

  // Deep Link support (?job=JOB-XXXX or ?wo=JOB-XXXX)
  useDeepLinkSearch(setSearch)

  // New Work Order Form State
  const [mc, setMc] = useState('')
  const [ki, setKi] = useState('')
  const [design, setDesign] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [jobType, setJobType] = useState('REPAIR')
  const [problemCause, setProblemCause] = useState('')
  const [selectedTechs, setSelectedTechs] = useState([])
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState('IN_PROGRESS')
  const [submittingStart, setSubmittingStart] = useState(false)

  // In-use machines auto-suggest from Cylinders
  const inUseMachines = useMemo(() => {
    return extractInUseMachinesFromCylinders(cylinders)
  }, [cylinders])

  const matchedActiveMachine = useMemo(() => matchActiveMachine(inUseMachines, mc), [mc, inUseMachines])

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [compJob, setCompJob] = useState(null)
  const [compEndDate, setCompEndDate] = useState('')
  const [compEndTime, setCompEndTime] = useState('')
  const [compSubmitting, setCompSubmitting] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [editTechs, setEditTechs] = useState([])
  const [editSubmitting, setEditSubmitting] = useState(false)

  const matchedEditActiveMachine = useMemo(() => matchEditActiveMachine(inUseMachines, editJob?.MC), [editJob?.MC, inUseMachines])

  const [techModalOpen, setTechModalOpen] = useState(false)
  const [techForm, setTechForm] = useState({ Name: '', Phone: '', SkillLevel: 'Senior', Specialization: '', Status: 'ACTIVE', Line_ID: '', Telegram_ID: '' })
  const [editingTechId, setEditingTechId] = useState(null)

  const [kpiModalOpen, setKpiModalOpen] = useState(false)
  const [draftKpi, setDraftKpi] = useState(DEFAULT_KPI_TARGETS)

  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyJob, setHistoryJob] = useState(null)

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printJob, setPrintJob] = useState(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Daily Work Progress (End of Day Update) Modal State
  const [dailyLogModalOpen, setDailyLogModalOpen] = useState(false)
  const [dailyLogJob, setDailyLogJob] = useState(null)
  const [dailyLogDate, setDailyLogDate] = useState('')
  const [dailyLogStatus, setDailyLogStatus] = useState('IN_PROGRESS')
  const [dailyLogDetails, setDailyLogDetails] = useState('')
  const [dailyLogHours, setDailyLogHours] = useState('')
  const [dailyLogTechs, setDailyLogTechs] = useState([])
  const [dailyLogSubmitting, setDailyLogSubmitting] = useState(false)
  const [cancelJobModalOpen, setCancelJobModalOpen] = useState(false)
  const [cancelJobReason, setCancelJobReason] = useState('')
  const [cancellingJobSubmitting, setCancellingJobSubmitting] = useState(false)

  // Interruption / Lost Time Modal State
  const [interruptionModalOpen, setInterruptionModalOpen] = useState(false)
  const [interruptionJob, setInterruptionJob] = useState(null)
  const [interruptionTaskName, setInterruptionTaskName] = useState('')
  const [interruptionManualMins, setInterruptionManualMins] = useState('')
  const [interruptionManualNotes, setInterruptionManualNotes] = useState('')
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTimerSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Open Interruption Modal
  const openInterruptionModal = (job) => {
    fireOpenInterruptionModal({ setInterruptionJob, setInterruptionTaskName, setInterruptionManualMins, setInterruptionManualNotes, setShowManualAdd, setInterruptionModalOpen, job })
  }

  // Start live interruption timer
  const handleStartInterruption = async (taskNameOrOptions, maybeOptions) => {
    let name = ''
    let selectedTechs = []
    let noTechRemaining = false
    let targetTask = null

    if (typeof taskNameOrOptions === 'string') {
      name = taskNameOrOptions
      if (maybeOptions && typeof maybeOptions === 'object') {
        selectedTechs = maybeOptions.selectedTechs || []
        noTechRemaining = Boolean(maybeOptions.noTechRemaining)
        targetTask = maybeOptions.targetTask || null
      }
    } else if (taskNameOrOptions && typeof taskNameOrOptions === 'object') {
      name = taskNameOrOptions.taskName || ''
      selectedTechs = taskNameOrOptions.selectedTechs || []
      noTechRemaining = Boolean(taskNameOrOptions.noTechRemaining)
      targetTask = taskNameOrOptions.targetTask || null
    }

    let targetJob = null
    if (targetTask && allJobs) {
      targetJob = allJobs.find(
        (j) => (j.id && j.id === targetTask.refId) || (j.Job_ID && j.Job_ID === targetTask.refId)
      ) || targetTask.raw || null
    }

    await startInterruption({
      interruptionJob,
      taskName: name,
      interruptionTaskName,
      selectedTechs,
      noTechRemaining,
      targetJob,
      saveJob,
      setInterruptionJob,
      setInterruptionTaskName,
      toast,
      user,
    })
  }

  // Stop live interruption timer
  const handleStopInterruption = async (logId, options = {}) => {
    const returnTechsToJob = options.returnTechsToJob !== false
    await stopInterruption({
      interruptionJob,
      logId,
      returnTechsToJob,
      saveJob,
      setInterruptionJob,
      toast,
    })
  }

  // Add manual past interruption
  const handleAddManualInterruption = async (options) => {
    const selectedTechs = options?.selectedTechs || []
    const noTechRemaining = Boolean(options?.noTechRemaining)

    await addManualInterruption({
      interruptionJob,
      interruptionTaskName,
      interruptionManualMins,
      interruptionManualNotes,
      selectedTechs,
      noTechRemaining,
      saveJob,
      setInterruptionJob,
      setInterruptionTaskName,
      setInterruptionManualMins,
      setInterruptionManualNotes,
      setShowManualAdd,
      toast,
      user,
    })
  }

  // Delete an interruption record
  const handleDeleteInterruption = async (logId) => {
    await deleteInterruption({ interruptionJob, logId, saveJob, setInterruptionJob, toast })
  }

  // Open Create Work Order modal from Interruption
  const handleOpenCreateWorkOrderFromInterruption = ({ mc: targetMc, comment: initialComment, selectedTechs: initialTechs } = {}) => {
    if (targetMc) setMc(targetMc)
    if (initialComment) setComment(initialComment)
    if (Array.isArray(initialTechs) && initialTechs.length > 0) setSelectedTechs(initialTechs)
    setInterruptionModalOpen(false)
    setCreateModalOpen(true)
  }

  // Load Technicians & KPI Settings from Supabase / Storage
  const loadTechsAndSettings = async () => {
    await loadTechData({ setTechLoading, setSystemUsers, setCylinders, setTechnicians, setKpiTargets, setDraftKpi, defaultKpiTargets: DEFAULT_KPI_TARGETS, defaultTechs: DEFAULT_TECHS })
  }

  useTechLoader(currentTab, loadTechsAndSettings)

  // Real-time & Window Focus Sync for Technicians & KPI Settings across PC and Mobile
  useTechRealtimeSync(loadTechsAndSettings)

  // Active jobs list filter with legacy and new column normalization
  const allJobs = useMemo(() => normalizeAllJobs(rawJobs), [rawJobs])

  // Live counts for Job Types filter cards
  const typeCounts = useMemo(() => computeTypeCounts(allJobs, showDeleted), [allJobs, showDeleted])

  // Live counts for Status filter cards
  const statusCounts = useMemo(() => computeStatusCounts(allJobs, showDeleted), [allJobs, showDeleted])

  // Live counts for Problem Cause filter cards
  const causeCounts = useMemo(() => computeCauseCounts(allJobs, showDeleted), [allJobs, showDeleted])

  const filteredJobs = useMemo(() => filterWorkOrderJobs(allJobs, { showDeleted, typeFilters, statusFilters, causeFilter, search }), [allJobs, typeFilters, statusFilters, showDeleted, search]);

  // KPI Breakdown Calculations
  const kpiStats = useMemo(() => computeKpiStats(allJobs, kpiTargets), [allJobs, kpiTargets])

  // Handle Technician checkbox toggle
  const toggleTechSelection = (techName) => {
    setSelectedTechs((prev) => toggleMultiFilterValue(prev, techName))
  }

  const toggleEditTechSelection = (techName) => {
    setEditTechs((prev) => toggleMultiFilterValue(prev, techName))
  }

  // Submit Start New Job
  const handleStartJob = async (e) => {
    await startJob({ e, submittingStart, mc, ki, selectedTechs, status, comment, design, rollNo, jobType, problemCause, allJobs, user, saveJob, setSubmittingStart, technicians, systemUsers, cylinders, setMc, setKi, setDesign, setRollNo, setJobType, setProblemCause, setSelectedTechs, setComment, setStatus, setCreateModalOpen, toast })
  }

  // Open Complete Modal
  const openCompleteModal = (job) => {
    const state = buildCompleteModalState(job)
    setCompJob(state.compJob)
    setCompEndDate(state.compEndDate)
    setCompEndTime(state.compEndTime)
    setCompleteModalOpen(true)
  }

  // Calculated duration for Complete Modal with Interruption deduction
  const compCalcDuration = useMemo(() => computeCompleteDuration(compJob, compEndDate, compEndTime), [compJob, compEndDate, compEndTime])

  // Submit Complete Job
  const handleCompleteJob = async () => {
    await completeJob({ compSubmitting, compJob, compEndDate, compEndTime, compCalcDuration, saveJob, setCompSubmitting, setCompleteModalOpen, setCompJob, toast, user, cylinders })
  }

  // Open Edit Modal
  const openEditModal = (job) => {
    const state = buildEditModalState(job)
    setEditJob(state.editJob)
    setEditTechs(state.editTechs)
    setEditModalOpen(true)
  }

  // Inline Quick Status Change from Table Column
  const handleQuickStatusChange = async (job, nextStatusCode) => {
    await quickStatusChange({ job, nextStatusCode, canEdit, openCompleteModal, saveJob, toast, user, cylinders })
  }

  // Open Daily Work Progress (End of Day Update) Modal
  const openDailyLogModal = (job) => {
    const state = buildDailyLogModalState(allJobs, job)
    setDailyLogJob(state.freshJob)
    setDailyLogDate(state.date)
    setDailyLogStatus(state.status)
    setDailyLogDetails('')
    setDailyLogHours('')
    setDailyLogTechs(state.techs)
    setDailyLogModalOpen(true)
  }

  // Submit Daily Work Progress Update (Saves in existing record, 100% backward compatible)
  const handleSaveDailyLog = async () => {
    await saveDailyLog({ dailyLogJob, dailyLogDetails, dailyLogDate, dailyLogStatus, dailyLogHours, dailyLogTechs, allJobs, saveJob, setDailyLogSubmitting, setDailyLogModalOpen, setDailyLogJob, toast, user, cylinders })
  }

  // Open 2-Step Confirmation Modal to Cancel Job from Daily Log
  const openCancelJobConfirm = () => {
    setCancelJobReason('')
    setCancelJobModalOpen(true)
  }

  // Confirm Cancellation of Job
  const handleConfirmCancelJob = async () => {
    await confirmCancelJob({ dailyLogJob, cancelJobReason, allJobs, user, saveJob, setCancellingJobSubmitting, setCancelJobModalOpen, setDailyLogModalOpen, setDailyLogJob, toast })
  }

  // Delete a Daily Log Entry (admin / correction)
  const handleDeleteDailyLog = async (logId) => {
    await deleteDailyLog({ dailyLogJob, canDelete, allJobs, logId, saveJob, setDailyLogJob, toast, user })
  }

  // Submit Edit Job
  const handleEditJob = async () => {
    await saveEditJob({ editJob, editTechs, user, saveJob, setEditSubmitting, setEditModalOpen, setEditJob, technicians, systemUsers, notifyFn: notifyLineWorkOrderAssigned, cylinders, toast })
  }

  // Delete Job
  const handleDeleteJob = async (job) => {
    await confirmAndRemoveJob({
      job,
      confirmFn: (msg) => confirm(msg),
      removeJob,
      syncRemoveFn: removePMWorkOrderFromMonthlySchedule,
      cylinders,
      toast,
    })
  }

  // Add / Edit / Delete Technician
  const openAddTech = (userToPreFill = null) => {
    const built = buildAddTechForm(technicians, userToPreFill)
    setEditingTechId(built.editingTechId)
    setSelectedUserId(built.selectedUserId)
    setTechForm(built.form)
    setTechModalOpen(true)
  }

  const openEditTech = (tech) => {
    const built = buildEditTechForm(tech, systemUsers)
    setEditingTechId(built.techId)
    setSelectedUserId(built.selectedUserId)
    setTechForm(built.form)
    setTechModalOpen(true)
  }

  const handleSelectUserForTech = (userId) => {
    selectUserForTech({ userId, systemUsers, setSelectedUserId, setTechForm })
  }


  const handleSaveTech = async () => {
    await saveTech({ techForm, editingTechId, technicians, saveTechFn: TechnicianAPI, setTechnicians, setTechModalOpen, reloadFn: loadTechsAndSettings, toast })
  }

  const handleDeleteTech = async (tech) => {
    await deleteTech({ tech, confirmFn: (msg) => confirm(msg), deleteTechFn: TechnicianAPI, technicians, setTechnicians, reloadFn: loadTechsAndSettings, toast })
  }

  // Save KPI Settings
  const handleSaveKpiSettings = async () => {
    await saveKpiSettings({ draftKpi, setKpiTargets, setKpiModalOpen, toast })
  }

  // Open Print Sheet Modal
  const openPrintModal = (job) => {
    fireOpenPrintModal(setPrintJob, setPrintModalOpen, job)
  }

  const unregisteredLineUsers = useMemo(
    () => getUnregisteredLineUsers(systemUsers, technicians),
    [systemUsers, technicians]
  )

  const exportConfig = SHEET_EXPORTS.find((c) => c.key === 'workorders')

  return (
    <div className="space-y-6">
      {/* ── Top Header & Sub-Tabs Navigation ──────────────────── */}
      <WorkOrdersHeader currentTab={currentTab} setCurrentTab={setCurrentTab} exportConfig={exportConfig} filteredJobs={filteredJobs} allJobs={allJobs} technicians={technicians} jobsLoading={jobsLoading} loadJobs={loadJobs} loadTechsAndSettings={loadTechsAndSettings} setReportModalOpen={setReportModalOpen} workOrderList={WorkOrderAPI.list} />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB: REPAIR REQUESTS (แจ้งซ่อม) ────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'repair_requests' && (
        <RepairRequests />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: DASHBOARD & KPI BREAKDOWN ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'dashboard' && (
        <WorkOrdersDashboard kpiStats={kpiStats} setKpiModalOpen={setKpiModalOpen} handleDrilldownByCause={handleDrilldownByCause} />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: WORK ORDERS & CREATE WORK ORDER ──────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'records' && (
        <WorkOrdersRecords filteredJobs={filteredJobs} jobsLoading={jobsLoading} kpiTargets={kpiTargets} typeCounts={typeCounts} statusCounts={statusCounts} causeCounts={causeCounts} WORK_ORDER_TYPE_OPTIONS={WORK_ORDER_TYPE_OPTIONS} search={search} setSearch={setSearch} typeFilters={typeFilters} setTypeFilters={setTypeFilters} statusFilters={statusFilters} setStatusFilters={setStatusFilters} causeFilter={causeFilter} setCauseFilter={setCauseFilter} showDeleted={showDeleted} setShowDeleted={setShowDeleted} isTypeFilterOpen={isTypeFilterOpen} isStatusFilterOpen={isStatusFilterOpen} isCauseFilterOpen={isCauseFilterOpen} toggleTypeFilterOpen={toggleTypeFilterOpen} toggleStatusFilterOpen={toggleStatusFilterOpen} toggleCauseFilterOpen={toggleCauseFilterOpen} toggleTypeFilter={toggleTypeFilter} toggleStatusFilter={toggleStatusFilter} toggleCauseFilter={toggleCauseFilter} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} isMobile={isMobile} isTablet={isTablet} isDesktop={isDesktop} openEditModal={openEditModal} openCompleteModal={openCompleteModal} openDailyLogModal={openDailyLogModal} openInterruptionModal={openInterruptionModal} openPrintModal={openPrintModal} handleDeleteJob={handleDeleteJob} handleQuickStatusChange={handleQuickStatusChange} setCreateModalOpen={setCreateModalOpen} setReportModalOpen={setReportModalOpen} />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: TECHNICIANS REGISTRY ──────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'technicians' && (
        <WorkOrdersTechnicians technicians={technicians} unregisteredLineUsers={unregisteredLineUsers} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} openAddTech={openAddTech} openEditTech={openEditTech} handleDeleteTech={handleDeleteTech} />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: KPI & SLA SETTINGS ────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'settings' && (
        <WorkOrdersSettings draftKpi={draftKpi} setDraftKpi={setDraftKpi} handleSaveKpiSettings={handleSaveKpiSettings} user={user} />
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODALS SECTION ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* 1. Complete Job Modal */}
      <WorkOrdersCompleteModal completeModalOpen={completeModalOpen} compJob={compJob} compCalcDuration={compCalcDuration} compEndDate={compEndDate} compEndTime={compEndTime} compSubmitting={compSubmitting} setCompEndDate={setCompEndDate} setCompEndTime={setCompEndTime} setCompleteModalOpen={setCompleteModalOpen} handleCompleteJob={handleCompleteJob} openInterruptionModal={openInterruptionModal} canEditDate={isAdminUser(user)} />

      {/* 2. Edit Job Modal */}
      <WorkOrdersEditModal editModalOpen={editModalOpen} editJob={editJob} editTechs={editTechs} editSubmitting={editSubmitting} setEditJob={setEditJob} setEditModalOpen={setEditModalOpen} handleEditJob={handleEditJob} toggleEditTechSelection={toggleEditTechSelection} technicians={technicians} inUseMachines={inUseMachines} matchedEditActiveMachine={matchedEditActiveMachine} />

      {/* 3. Add / Edit Technician Modal */}
      <WorkOrderTechModal techModalOpen={techModalOpen} setTechModalOpen={setTechModalOpen} editingTechId={editingTechId} techForm={techForm} setTechForm={setTechForm} selectedUserId={selectedUserId} systemUsers={systemUsers} technicians={technicians} handleSaveTech={handleSaveTech} handleSelectUserForTech={handleSelectUserForTech} />

      {/* 4. Quick KPI Settings Modal */}
      <WorkOrdersKpiModal kpiModalOpen={kpiModalOpen} draftKpi={draftKpi} setDraftKpi={setDraftKpi} setKpiModalOpen={setKpiModalOpen} handleSaveKpiSettings={handleSaveKpiSettings} />

      {/* 6. Interruption & Lost Time Modal */}
        <WorkOrdersInterruptionModal interruptionModalOpen={interruptionModalOpen} interruptionJob={interruptionJob} setInterruptionModalOpen={setInterruptionModalOpen} interruptionTaskName={interruptionTaskName} setInterruptionTaskName={setInterruptionTaskName} interruptionManualMins={interruptionManualMins} setInterruptionManualMins={setInterruptionManualMins} interruptionManualNotes={interruptionManualNotes} setInterruptionManualNotes={setInterruptionManualNotes} showManualAdd={showManualAdd} setShowManualAdd={setShowManualAdd} handleAddManualInterruption={handleAddManualInterruption} handleDeleteInterruption={handleDeleteInterruption} handleStartInterruption={handleStartInterruption} handleStopInterruption={handleStopInterruption} getJobInterruptions={getJobInterruptions} QUICK_INTERRUPTION_PRESETS={QUICK_INTERRUPTION_PRESETS} allJobs={allJobs} technicians={technicians} onOpenCreateWorkOrder={handleOpenCreateWorkOrderFromInterruption} />

      {/* 5. Print A4 PDF Report Modal */}
      <WorkOrdersPrintModal printModalOpen={printModalOpen} printJob={printJob} setPrintModalOpen={setPrintModalOpen} />

      {/* 6. Filtered Work Orders Print Report Modal */}
      <WorkOrdersReportBridge reportModalOpen={reportModalOpen} setReportModalOpen={setReportModalOpen} filteredJobs={filteredJobs} typeFilters={typeFilters} statusFilters={statusFilters} search={search} showDeleted={showDeleted} kpiTargets={kpiTargets} user={user} />

      {/* 6. Daily Progress Update Modal (อัปเดตงานประจำวัน / บันทึกจบวัน) */}
        <WorkOrdersDailyLogModal dailyLogModalOpen={dailyLogModalOpen} dailyLogJob={dailyLogJob} setDailyLogModalOpen={setDailyLogModalOpen} dailyLogDate={dailyLogDate} setDailyLogDate={setDailyLogDate} dailyLogDetails={dailyLogDetails} setDailyLogDetails={setDailyLogDetails} dailyLogHours={dailyLogHours} setDailyLogHours={setDailyLogHours} dailyLogStatus={dailyLogStatus} setDailyLogStatus={setDailyLogStatus} dailyLogTechs={dailyLogTechs} setDailyLogTechs={setDailyLogTechs} dailyLogSubmitting={dailyLogSubmitting} cancellingJobSubmitting={cancellingJobSubmitting} handleSaveDailyLog={handleSaveDailyLog} handleDeleteDailyLog={handleDeleteDailyLog} openCancelJobConfirm={openCancelJobConfirm} technicians={technicians} allJobs={allJobs} canEdit={canEdit} canDelete={canDelete} canEditDate={isAdminUser(user)} />

      {/* 2-Step Confirmation Modal for Cancelling Job */}
        <WorkOrdersCancelModal cancelJobModalOpen={cancelJobModalOpen} dailyLogJob={dailyLogJob} cancelJobReason={cancelJobReason} setCancelJobReason={setCancelJobReason} cancellingJobSubmitting={cancellingJobSubmitting} setCancelJobModalOpen={setCancelJobModalOpen} handleConfirmCancelJob={handleConfirmCancelJob} />

      {/* ── CREATE WORK ORDER MODAL (ป๊อปอัพเปิดใบสั่งงาน) ── */}
        <WorkOrdersCreateModal createModalOpen={createModalOpen} setCreateModalOpen={setCreateModalOpen} handleStartJob={handleStartJob} submittingStart={submittingStart} mc={mc} setMc={setMc} ki={ki} setKi={setKi} design={design} setDesign={setDesign} jobType={jobType} setJobType={setJobType} status={status} setStatus={setStatus} problemCause={problemCause} setProblemCause={setProblemCause} rollNo={rollNo} setRollNo={setRollNo} comment={comment} setComment={setComment} selectedTechs={selectedTechs} toggleTechSelection={toggleTechSelection} technicians={technicians} inUseMachines={inUseMachines} matchedActiveMachine={matchedActiveMachine} user={user} />

      {/* Shared In-use Machines Datalist for Autocomplete in Create/Edit Work Order */}
      <WorkOrdersMachineDatalist inUseMachines={inUseMachines} />

      {/* Mobile Floating Action Button (FAB) for Opening Work Order (Portaled to document.body to lock viewport position) */}
      <WorkOrdersCreateFab currentTab={currentTab} canAdd={canAdd} setCreateModalOpen={setCreateModalOpen} />
    </div>
  )
}
