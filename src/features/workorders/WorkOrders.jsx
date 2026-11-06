import { useState, useMemo, useEffect } from 'react'
import {
  WORK_ORDER_STATUS_OPTIONS,
  getWorkOrderStatusMeta,
  getWorkOrderDetails,
  getJobDailyLogs,
  getLatestDailyLog,
} from './workOrderNormalize.js'

export { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusMeta, getWorkOrderDetails, getJobDailyLogs, getLatestDailyLog }
import { filterWorkOrderJobs, toggleMultiFilterValue, nextMultiFilter, nextCauseFilter, togglePersistedOpen } from './workOrderFilters.js'
import { normalizeAllJobs, computeTypeCounts, computeStatusCounts, computeCauseCounts, computeKpiStats, saveKpiSettings } from './workOrderStats.js'
import { getJobInterruptions, computeCompleteDuration } from './workOrderInterruptions.js'
import { startInterruption, stopInterruption, addManualInterruption, deleteInterruption } from './workOrderInterruptionHandlers.js'
import { saveDailyLog, confirmCancelJob, deleteDailyLog } from './workOrderDailyLogHandlers.js'
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
  CylinderAPI,
  UserAPI,
  KpiSettingsAPI,
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
import { db } from '../../api/dbClient'
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
  const canAdd = pagePerms.canAdd ?? true
  const canEdit = pagePerms.canEdit ?? true
  const canDelete = pagePerms.canDelete ?? true

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

  useEffect(() => {
    if (defaultTab) setCurrentTab(defaultTab)
  }, [defaultTab])

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
  const [statusFilters, setStatusFilters] = useState([]) // [] = ALL, or ['IN_PROGRESS', 'WAITING_TECH', ...]
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
    setCauseFilter(causeKey)
    setCurrentTab('records')
  }

  // Deep Link support (?job=JOB-XXXX or ?wo=JOB-XXXX)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search)
        const jobParam = params.get('job') || params.get('wo') || params.get('id')
        if (jobParam) {
          setSearch(jobParam)
        }
      }
    } catch {}
  }, [])

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
    setInterruptionJob(job)
    setInterruptionTaskName('')
    setInterruptionManualMins('')
    setInterruptionManualNotes('')
    setShowManualAdd(false)
    setInterruptionModalOpen(true)
  }

  // Start live interruption timer
  const handleStartInterruption = async (taskName) => {
    await startInterruption({ interruptionJob, taskName, interruptionTaskName, saveJob, setInterruptionJob, setInterruptionTaskName, toast, user })
  }

  // Stop live interruption timer
  const handleStopInterruption = async (logId) => {
    await stopInterruption({ interruptionJob, logId, saveJob, setInterruptionJob, toast })
  }

  // Add manual past interruption
  const handleAddManualInterruption = async () => {
    await addManualInterruption({ interruptionJob, interruptionTaskName, interruptionManualMins, interruptionManualNotes, saveJob, setInterruptionJob, setInterruptionTaskName, setInterruptionManualMins, setInterruptionManualNotes, setShowManualAdd, toast, user })
  }

  // Delete an interruption record
  const handleDeleteInterruption = async (logId) => {
    await deleteInterruption({ interruptionJob, logId, saveJob, setInterruptionJob, toast })
  }

  // Load Technicians & KPI Settings from Supabase / Storage
  const loadTechsAndSettings = async () => {
    setTechLoading(true)
    try {
      const [techRes, kpiRes, usersRes, cylRes] = await Promise.allSettled([
        TechnicianAPI.list(),
        KpiSettingsAPI.list(),
        UserAPI.list(),
        CylinderAPI.list(),
      ])

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setSystemUsers(usersRes.value)
      }

      if (cylRes.status === 'fulfilled' && Array.isArray(cylRes.value) && cylRes.value.length > 0) {
        setCylinders(cylRes.value)
      } else {
        const stored =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem('textileops_tbl_cylinders') || localStorage.getItem('txops_tbl_cylinders')
            : null
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCylinders(parsed)
            }
          } catch {}
        }
      }

      if (techRes.status === 'fulfilled' && Array.isArray(techRes.value)) {
        setTechnicians(techRes.value)
      } else {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('txops_tbl_technicians') : null
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTechnicians(parsed)
            } else {
              setTechnicians(DEFAULT_TECHS)
              localStorage.setItem('txops_tbl_technicians', JSON.stringify(DEFAULT_TECHS))
            }
          } catch {
            setTechnicians(DEFAULT_TECHS)
            localStorage.setItem('txops_tbl_technicians', JSON.stringify(DEFAULT_TECHS))
          }
        } else {
          setTechnicians(DEFAULT_TECHS)
          try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(DEFAULT_TECHS)) } catch {}
        }
      }

      if (kpiRes.status === 'fulfilled' && Array.isArray(kpiRes.value)) {
        const map = { ...DEFAULT_KPI_TARGETS }
        kpiRes.value.forEach((item) => {
          if (item.Key === 'kpi_target_repair') map.REPAIR = parseFloat(item.Value) || 1.0
          if (item.Key === 'kpi_target_design') map.DESIGN = parseFloat(item.Value) || 3.0
          if (item.Key === 'kpi_target_pm')     map.PM = parseFloat(item.Value) || 2.0
          if (item.Key === 'kpi_target_setup')  map.SETUP = parseFloat(item.Value) || 1.0
        })
        setKpiTargets(map)
        setDraftKpi(map)
      }
    } catch (err) {
      console.warn('Could not load technicians/settings, using defaults:', err)
      setTechnicians(DEFAULT_TECHS)
    } finally {
      setTechLoading(false)
    }
  }

  useEffect(() => {
    loadTechsAndSettings()
  }, [currentTab])

  // Real-time & Window Focus Sync for Technicians & KPI Settings across PC and Mobile
  useEffect(() => {
    let lastSync = Date.now()
    const handleFocusSync = () => {
      if (Date.now() - lastSync > 3000) {
        lastSync = Date.now()
        loadTechsAndSettings()
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocusSync()
    }

    window.addEventListener('focus', handleFocusSync)
    document.addEventListener('visibilitychange', handleVisibility)

    let channel = null
    try {
      if (db && typeof db.channel === 'function') {
        channel = db
          .channel('workorders_tech_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appconfigs' }, () => {
            loadTechsAndSettings()
          })
          .subscribe()
      }
    } catch {}

    return () => {
      window.removeEventListener('focus', handleFocusSync)
      document.removeEventListener('visibilitychange', handleVisibility)
      try {
        if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe()
      } catch {}
    }
  }, [])

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
    setCompJob(job)
    const now = new Date()
    setCompEndDate(format(now, 'yyyy-MM-dd'))
    setCompEndTime(format(now, 'HH:mm'))
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
    const detailsVal = getWorkOrderDetails(job)
    const statusCode = getWorkOrderStatusMeta(job.Status).value
    setEditJob({
      ...job,
      Comment: detailsVal === '—' ? (job.Comment || '') : detailsVal,
      Details: detailsVal === '—' ? (job.Details || '') : detailsVal,
      ProblemCause: job.ProblemCause || job.problem_cause || '',
      Status: statusCode,
    })
    const techArray = (job.Technicians || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setEditTechs(techArray)
    setEditModalOpen(true)
  }

  // Inline Quick Status Change from Table Column
  const handleQuickStatusChange = async (job, nextStatusCode) => {
    await quickStatusChange({ job, nextStatusCode, canEdit, openCompleteModal, saveJob, toast, user, cylinders })
  }

  // Open Daily Work Progress (End of Day Update) Modal
  const openDailyLogModal = (job) => {
    const freshJob =
      allJobs.find(
        (j) =>
          (j.id && j.id === job.id) ||
          (j.WO_ID && j.WO_ID === (job.WO_ID || job.Job_ID)) ||
          (j.Job_ID && j.Job_ID === (job.Job_ID || job.WO_ID))
      ) || job

    setDailyLogJob(freshJob)
    const now = new Date()
    setDailyLogDate(format(now, 'yyyy-MM-dd'))
    const currentMeta = getWorkOrderStatusMeta(freshJob.Status)
    setDailyLogStatus(currentMeta.value)
    setDailyLogDetails('')
    setDailyLogHours('')
    const currentTechs = (freshJob.Technicians || freshJob.Tech || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setDailyLogTechs(currentTechs)
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
    const maxNum = technicians.reduce((max, t) => {
      const match = String(t.Technician_ID || t.id || '').match(/TECH-(\d+)/i)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const nextId = `TECH-${String(maxNum + 1).padStart(3, '0')}`
    setEditingTechId(null)
    setSelectedUserId(userToPreFill?.id || '')
    const baseForm = {
      id: nextId,
      Technician_ID: nextId,
      Name: '',
      Phone: '',
      SkillLevel: 'Senior',
      Specialization: '',
      Status: 'ACTIVE',
      Line_ID: '',
      Telegram_ID: '',
      Avatar_URL: '',
      User_ID: '',
    }
    setTechForm(userToPreFill ? buildTechFromUser(userToPreFill, baseForm) : baseForm)
    setTechModalOpen(true)
  }

  const openEditTech = (tech) => {
    const techId = tech.id || tech.Technician_ID
    setEditingTechId(techId)
    const matchedUser = systemUsers.find(
      (u) => (u.id && u.id === tech.User_ID) || (u.line_user_id && u.line_user_id === (tech.Line_ID || tech.line_id))
    )
    setSelectedUserId(matchedUser?.id || '')
    setTechForm({
      ...tech,
      id: techId,
      Technician_ID: tech.Technician_ID || techId,
      Name: tech.Name || '',
      Phone: tech.Phone || '',
      SkillLevel: tech.SkillLevel || 'Senior',
      Specialization: tech.Specialization || '',
      Status: tech.Status || 'ACTIVE',
      Line_ID: tech.Line_ID || tech.line_id || '',
      Telegram_ID: tech.Telegram_ID || tech.telegram_id || '',
      Avatar_URL: tech.Avatar_URL || matchedUser?.line_picture_url || '',
      User_ID: tech.User_ID || matchedUser?.id || '',
    })
    setTechModalOpen(true)
  }

  const handleSelectUserForTech = (userId) => {
    setSelectedUserId(userId)
    if (!userId) return
    const userObj = systemUsers.find((u) => u.id === userId)
    if (!userObj) return
    setTechForm((prev) => buildTechFromUser(userObj, prev))
  }

  // Sync Technicians to LINE and Telegram notification settings in Supabase & LocalStorage
  const syncTechToNotifications = async (techList) => {
    try {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(techList)) } catch {}
      }
      const { data: lineData } = await db.from('appconfigs').select('value').eq('key', 'line_settings').maybeSingle()
      let lineCfg = {}
      if (lineData?.value) {
        try { lineCfg = JSON.parse(lineData.value) } catch {}
      } else {
        try { lineCfg = JSON.parse(localStorage.getItem('txops_tbl_line_settings') || '{}') } catch {}
      }
      lineCfg.technicians = techList.map((t) => ({ name: t.Name, user_id: (t.Line_ID || t.line_id || '').trim() }))
      await db.from('appconfigs').upsert({ key: 'line_settings', value: JSON.stringify(lineCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      try { localStorage.setItem('txops_tbl_line_settings', JSON.stringify(lineCfg)) } catch {}

      const { data: tgData } = await db.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
      let tgCfg = {}
      if (tgData?.value) {
        try { tgCfg = JSON.parse(tgData.value) } catch {}
      } else {
        try { tgCfg = JSON.parse(localStorage.getItem('txops_tbl_telegram_settings') || '{}') } catch {}
      }
      tgCfg.technicians = techList.map((t) => ({ name: t.Name, chat_id: (t.Telegram_ID || t.telegram_id || '').trim() }))
      await db.from('appconfigs').upsert({ key: 'telegram_settings', value: JSON.stringify(tgCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      try { localStorage.setItem('txops_tbl_telegram_settings', JSON.stringify(tgCfg)) } catch {}
    } catch (e) {
      console.warn('Sync tech to notifications error:', e)
    }
  }

  const handleSaveTech = async () => {
    if (!techForm.Name.trim()) { toast.error('กรุณาระบุชื่อช่าง'); return }
    const targetId = editingTechId || techForm.id || techForm.Technician_ID || `TECH-${Date.now()}`
    const payload = {
      ...techForm,
      id: targetId,
      Technician_ID: techForm.Technician_ID || targetId,
    }

    try {
      let nextList
      if (editingTechId) {
        await TechnicianAPI.update(editingTechId, payload)
        nextList = technicians.map((t) => (t.id === editingTechId || t.Technician_ID === editingTechId ? { ...t, ...payload } : t))
        setTechnicians(nextList)
        toast.success('อัปเดตข้อมูลช่างเรียบร้อย', payload.Name)
      } else {
        const created = await TechnicianAPI.create(payload)
        const itemToAdd = created || payload
        nextList = [...technicians, itemToAdd]
        setTechnicians(nextList)
        toast.success('เพิ่มช่างใหม่เรียบร้อย', payload.Name)
      }
      setTechModalOpen(false)
      await syncTechToNotifications(nextList)
      await loadTechsAndSettings()
    } catch (err) {
      console.warn('Backend update failed:', err)
      toast.error('ไม่สามารถบันทึกข้อมูลช่างไปยังเซิร์ฟเวอร์ได้', err.message || 'กรุณาตรวจสอบสิทธิ์หรือการเชื่อมต่อ')
    }
  }

  const handleDeleteTech = async (tech) => {
    const techId = tech.id || tech.Technician_ID
    if (!confirm(`ยืนยันการลบช่าง "${tech.Name}" ออกจากระบบหรือไม่?`)) return
    try {
      await TechnicianAPI.delete(techId)
      const nextList = technicians.filter((t) => t.id !== techId && t.Technician_ID !== techId)
      setTechnicians(nextList)
      await syncTechToNotifications(nextList)
      await loadTechsAndSettings()
      toast.success('ลบข้อมูลช่างเรียบร้อย', tech.Name)
    } catch (e) {
      console.warn('Backend delete error:', e)
      toast.error('ไม่สามารถลบข้อมูลช่างได้', e.message || 'กรุณาตรวจสอบสิทธิ์หรือการเชื่อมต่อ')
    }
  }

  // Save KPI Settings
  const handleSaveKpiSettings = async () => {
    await saveKpiSettings({ draftKpi, setKpiTargets, setKpiModalOpen, toast })
  }

  // Open Print Sheet Modal
  const openPrintModal = (job) => {
    setPrintJob(job)
    setPrintModalOpen(true)
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
      <WorkOrdersCompleteModal completeModalOpen={completeModalOpen} compJob={compJob} compCalcDuration={compCalcDuration} compEndDate={compEndDate} compEndTime={compEndTime} compSubmitting={compSubmitting} setCompEndDate={setCompEndDate} setCompEndTime={setCompEndTime} setCompleteModalOpen={setCompleteModalOpen} handleCompleteJob={handleCompleteJob} openInterruptionModal={openInterruptionModal} />

      {/* 2. Edit Job Modal */}
      <WorkOrdersEditModal editModalOpen={editModalOpen} editJob={editJob} editTechs={editTechs} editSubmitting={editSubmitting} setEditJob={setEditJob} setEditModalOpen={setEditModalOpen} handleEditJob={handleEditJob} toggleEditTechSelection={toggleEditTechSelection} technicians={technicians} inUseMachines={inUseMachines} matchedEditActiveMachine={matchedEditActiveMachine} />

      {/* 3. Add / Edit Technician Modal */}
      <WorkOrderTechModal techModalOpen={techModalOpen} setTechModalOpen={setTechModalOpen} editingTechId={editingTechId} techForm={techForm} setTechForm={setTechForm} selectedUserId={selectedUserId} systemUsers={systemUsers} technicians={technicians} handleSaveTech={handleSaveTech} handleSelectUserForTech={handleSelectUserForTech} />

      {/* 4. Quick KPI Settings Modal */}
      <WorkOrdersKpiModal kpiModalOpen={kpiModalOpen} draftKpi={draftKpi} setDraftKpi={setDraftKpi} setKpiModalOpen={setKpiModalOpen} handleSaveKpiSettings={handleSaveKpiSettings} />

      {/* 6. Interruption & Lost Time Modal */}
        <WorkOrdersInterruptionModal interruptionModalOpen={interruptionModalOpen} interruptionJob={interruptionJob} setInterruptionModalOpen={setInterruptionModalOpen} interruptionTaskName={interruptionTaskName} setInterruptionTaskName={setInterruptionTaskName} interruptionManualMins={interruptionManualMins} setInterruptionManualMins={setInterruptionManualMins} interruptionManualNotes={interruptionManualNotes} setInterruptionManualNotes={setInterruptionManualNotes} showManualAdd={showManualAdd} setShowManualAdd={setShowManualAdd} handleAddManualInterruption={handleAddManualInterruption} handleDeleteInterruption={handleDeleteInterruption} handleStartInterruption={handleStartInterruption} handleStopInterruption={handleStopInterruption} getJobInterruptions={getJobInterruptions} QUICK_INTERRUPTION_PRESETS={QUICK_INTERRUPTION_PRESETS} />

      {/* 5. Print A4 PDF Report Modal */}
      <WorkOrdersPrintModal printModalOpen={printModalOpen} printJob={printJob} setPrintModalOpen={setPrintModalOpen} />

      {/* 6. Filtered Work Orders Print Report Modal */}
      <WorkOrdersReportBridge reportModalOpen={reportModalOpen} setReportModalOpen={setReportModalOpen} filteredJobs={filteredJobs} typeFilters={typeFilters} statusFilters={statusFilters} search={search} showDeleted={showDeleted} kpiTargets={kpiTargets} user={user} />

      {/* 6. Daily Progress Update Modal (อัปเดตงานประจำวัน / บันทึกจบวัน) */}
        <WorkOrdersDailyLogModal dailyLogModalOpen={dailyLogModalOpen} dailyLogJob={dailyLogJob} setDailyLogModalOpen={setDailyLogModalOpen} dailyLogDate={dailyLogDate} setDailyLogDate={setDailyLogDate} dailyLogDetails={dailyLogDetails} setDailyLogDetails={setDailyLogDetails} dailyLogHours={dailyLogHours} setDailyLogHours={setDailyLogHours} dailyLogStatus={dailyLogStatus} setDailyLogStatus={setDailyLogStatus} dailyLogTechs={dailyLogTechs} setDailyLogTechs={setDailyLogTechs} dailyLogSubmitting={dailyLogSubmitting} cancellingJobSubmitting={cancellingJobSubmitting} handleSaveDailyLog={handleSaveDailyLog} handleDeleteDailyLog={handleDeleteDailyLog} openCancelJobConfirm={openCancelJobConfirm} technicians={technicians} allJobs={allJobs} canEdit={canEdit} canDelete={canDelete} />

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
