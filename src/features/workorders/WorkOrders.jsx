import { useState, useMemo, useEffect } from 'react'
import { normalizeWorkOrderRow } from './workOrderNormalize.js'
import {
  WORK_ORDER_STATUS_OPTIONS,
  getWorkOrderStatusMeta,
  getWorkOrderDetails,
  getJobDailyLogs,
  getLatestDailyLog,
} from './workOrderNormalize.js'

export { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusMeta, getWorkOrderDetails, getJobDailyLogs, getLatestDailyLog }
import { filterWorkOrderJobs } from './workOrderFilters.js'
import { buildEditJobPayload, resolveNewlyAddedTechs, notifyAddedTechs, confirmAndRemoveJob } from './workOrderEdit.js'
import { WorkOrderTechModal } from './WorkOrderTechModal.jsx'
import { WorkOrdersDashboard } from './WorkOrdersDashboard.jsx'
import { WorkOrdersCancelModal } from './WorkOrdersCancelModal.jsx'
import { WorkOrdersDailyLogModal } from './WorkOrdersDailyLogModal.jsx'
import { WorkOrdersInterruptionModal } from './WorkOrdersInterruptionModal.jsx'
import { WorkOrdersKpiModal } from './WorkOrdersKpiModal.jsx'
import { WorkOrdersEditModal } from './WorkOrdersEditModal.jsx'
import { WorkOrdersCompleteModal } from './WorkOrdersCompleteModal.jsx'
import { WorkOrdersRecords } from './WorkOrdersRecords.jsx'
import { WorkOrdersTechnicians } from './WorkOrdersTechnicians.jsx'
import { WorkOrdersSettings } from './WorkOrdersSettings.jsx'
import { createPortal } from 'react-dom'
import {
  Plus,
  RefreshCw,
  ClipboardList,
  Target,
  Wrench,
  Settings as SettingsIcon,
  Send,
  UserCheck,
  Search,
  Printer,
  X,
  Check,
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
  generateJobId,
  calculateDuration,
  calculateSlaPerformance,
  isSystemWorkOrder,
} from '../../api/entities'
import Modal from '../../components/ui/Modal'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import useDeviceView from '../../hooks/useDeviceView'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'
import { SHEET_EXPORTS } from '../../utils/sheetExportConfigs'
import RepairRequests from './RepairRequests'
import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import WorkOrdersReportModal from '../../components/workorder/WorkOrdersReportModal'
import { db } from '../../api/dbClient'
import { generateWorkOrderPdfProps } from '../../utils/pdfDocGenerators'
import { notifyLineWorkOrderAssigned } from '../../utils/line'
import { PROBLEM_CAUSE_OPTIONS } from '../../constants/problemCause'
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
    setIsTypeFilterOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(WO_FILTER_STORAGE_KEYS.TYPE_OPEN, String(next))
      } catch {}
      return next
    })
  }

  const toggleStatusFilterOpen = () => {
    setIsStatusFilterOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(WO_FILTER_STORAGE_KEYS.STATUS_OPEN, String(next))
      } catch {}
      return next
    })
  }

  const toggleCauseFilterOpen = () => {
    setIsCauseFilterOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(WO_FILTER_STORAGE_KEYS.CAUSE_OPEN, String(next))
      } catch {}
      return next
    })
  }

  // Multi-select toggle helpers for Job Type and Status Cards
  const toggleTypeFilter = (val) => {
    if (val === 'ALL') {
      setTypeFilters([])
      return
    }
    setTypeFilters((prev) => {
      if (prev.includes(val)) {
        return prev.filter((item) => item !== val)
      }
      return [...prev, val]
    })
  }

  const toggleStatusFilter = (val) => {
    if (val === 'ALL') {
      setStatusFilters([])
      return
    }
    setStatusFilters((prev) => {
      if (prev.includes(val)) {
        return prev.filter((item) => item !== val)
      }
      return [...prev, val]
    })
  }

  // Toggle helper for Problem Cause Filter Cards
  const toggleCauseFilter = (val) => {
    if (val === 'ALL' || causeFilter === val) {
      setCauseFilter('')
      return
    }
    setCauseFilter(val)
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

  const matchedActiveMachine = useMemo(() => {
    if (!mc.trim()) return null
    const target = mc.trim().toUpperCase()
    return inUseMachines.find((m) => m.code.toUpperCase() === target) || null
  }, [mc, inUseMachines])

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

  const matchedEditActiveMachine = useMemo(() => {
    const editMc = String(editJob?.MC || '').trim().toUpperCase()
    if (!editMc) return null
    return inUseMachines.find((m) => m.code.toUpperCase() === editMc) || null
  }, [editJob?.MC, inUseMachines])

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

  // Helper to parse/stringify Interruption Logs safely
  const getJobInterruptions = (job) => {
    let logs = job?.Interruption_Logs || job?.interruption_logs || []
    if (typeof logs === 'string') {
      try { logs = JSON.parse(logs) } catch { logs = [] }
    }
    return Array.isArray(logs) ? logs : []
  }

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
    if (!interruptionJob) return
    const name = (taskName || interruptionTaskName).trim()
    if (!name) return toast.warning('กรุณาระบุชื่องานแทรก', 'เช่น ไปขึ้นด้าย เครื่อง 12334')

    const currentLogs = getJobInterruptions(interruptionJob)
    const newEntry = {
      id: `INT-${Date.now()}`,
      task_name: name,
      start_time: new Date().toISOString(),
      end_time: null,
      is_active: true,
      created_by: user?.full_name || user?.username || 'ช่างประจำกะ',
    }

    const updatedLogs = [...currentLogs, newEntry]
    const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

    try {
      await saveJob(updatedJob)
      setInterruptionJob(updatedJob)
      setInterruptionTaskName('')
      toast.info('เริ่มจับเวลางานแทรก', `${name}`)
    } catch (err) {
      toast.error('บันทึกงานแทรกไม่สำเร็จ', err.message)
    }
  }

  // Stop live interruption timer
  const handleStopInterruption = async (logId) => {
    if (!interruptionJob) return
    const currentLogs = getJobInterruptions(interruptionJob)
    const now = new Date()
    const nowIso = now.toISOString()

    const updatedLogs = currentLogs.map((log) => {
      if (log.id === logId || (log.is_active && !log.end_time)) {
        const start = new Date(log.start_time || log.created_at)
        const diffMs = Math.max(0, now.getTime() - start.getTime())
        const duration_minutes = Math.floor(diffMs / (1000 * 60))
        const duration_hours = Math.round((duration_minutes / 60) * 100) / 100
        return {
          ...log,
          end_time: nowIso,
          duration_minutes,
          duration_hours,
          is_active: false,
        }
      }
      return log
    })

    const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }
    try {
      await saveJob(updatedJob)
      setInterruptionJob(updatedJob)
      toast.success('จบงานแทรกเรียบร้อย', 'กลับสู่เวลาทำงานหลัก')
    } catch (err) {
      toast.error('บันทึกจบงานแทรกไม่สำเร็จ', err.message)
    }
  }

  // Add manual past interruption
  const handleAddManualInterruption = async () => {
    if (!interruptionJob) return
    const name = interruptionTaskName.trim()
    const mins = parseInt(interruptionManualMins, 10)
    if (!name) return toast.warning('กรุณาระบุชื่องานแทรก', 'เช่น ไปขึ้นด้าย เครื่อง 12334')
    if (!mins || mins <= 0) return toast.warning('กรุณาระบุจำนวนนาทีที่สูญเสียไป', 'เช่น 30 นาที')

    const currentLogs = getJobInterruptions(interruptionJob)
    const duration_hours = Math.round((mins / 60) * 100) / 100
    const now = new Date()
    const start = new Date(now.getTime() - mins * 60000)

    const newEntry = {
      id: `INT-${Date.now()}`,
      task_name: name,
      start_time: start.toISOString(),
      end_time: now.toISOString(),
      duration_minutes: mins,
      duration_hours,
      notes: interruptionManualNotes.trim(),
      is_active: false,
      created_by: user?.full_name || user?.username || 'ช่างประจำกะ',
    }

    const updatedLogs = [...currentLogs, newEntry]
    const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

    try {
      await saveJob(updatedJob)
      setInterruptionJob(updatedJob)
      setInterruptionTaskName('')
      setInterruptionManualMins('')
      setInterruptionManualNotes('')
      setShowManualAdd(false)
      toast.success('เพิ่มบันทึกงานแทรกย้อนหลังสำเร็จ', `${name} (${mins} นาที)`)
    } catch (err) {
      toast.error('บันทึกงานแทรกไม่สำเร็จ', err.message)
    }
  }

  // Delete an interruption record
  const handleDeleteInterruption = async (logId) => {
    if (!interruptionJob) return
    const currentLogs = getJobInterruptions(interruptionJob)
    const updatedLogs = currentLogs.filter((log) => log.id !== logId)
    const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

    try {
      await saveJob(updatedJob)
      setInterruptionJob(updatedJob)
      toast.success('ลบรายการงานแทรกแล้ว')
    } catch (err) {
      toast.error('ลบไม่สำเร็จ', err.message)
    }
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
  const allJobs = useMemo(() => {
    if (!Array.isArray(rawJobs)) return []
    return rawJobs
      .filter((r) => r && !isSystemWorkOrder(r))
      .map(normalizeWorkOrderRow)
  }, [rawJobs])

  // Live counts for Job Types filter cards
  const typeCounts = useMemo(() => {
    const counts = { ALL: 0, REPAIR: 0, DESIGN: 0, PM: 0, SETUP: 0 }
    const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
    counts.ALL = relevant.length
    relevant.forEach((j) => {
      const t = (j.JobType || 'REPAIR').toUpperCase()
      if (counts[t] !== undefined) counts[t]++
      else counts.REPAIR++
    })
    return counts
  }, [allJobs, showDeleted])

  // Live counts for Status filter cards
  const statusCounts = useMemo(() => {
    const counts = { ALL: 0, IN_PROGRESS: 0, WAITING_TECH: 0, WAITING_PARTS: 0, WAITING_SUMMARY: 0, COMPLETED: 0, CANCELLED: 0 }
    const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
    counts.ALL = relevant.length
    relevant.forEach((j) => {
      const meta = getWorkOrderStatusMeta(j.Status)
      if (counts[meta.value] !== undefined) counts[meta.value]++
    })
    return counts
  }, [allJobs, showDeleted])

  // Live counts for Problem Cause filter cards
  const causeCounts = useMemo(() => {
    const counts = { ALL: 0, คน: 0, เครื่องจักร: 0, วัตถุดิบ: 0, UNSPECIFIED: 0 }
    const relevant = allJobs.filter((j) => (showDeleted ? Boolean(j.IsDeleted) : !j.IsDeleted))
    counts.ALL = relevant.length
    relevant.forEach((j) => {
      const c = String(j?.ProblemCause || j?.problem_cause || '').trim()
      if (!c) {
        counts.UNSPECIFIED++
      } else if (counts[c] !== undefined) {
        counts[c]++
      } else {
        counts.UNSPECIFIED++
      }
    })
    return counts
  }, [allJobs, showDeleted])

  const filteredJobs = useMemo(() => filterWorkOrderJobs(allJobs, { showDeleted, typeFilters, statusFilters, causeFilter, search }), [allJobs, typeFilters, statusFilters, showDeleted, search]);

  // KPI Breakdown Calculations
  const kpiStats = useMemo(() => {
    const activeNonDeleted = allJobs.filter((j) => !j.IsDeleted)
    const total = activeNonDeleted.length
    const completed = activeNonDeleted.filter((j) => getWorkOrderStatusMeta(j.Status).isCompleted).length
    const cancelled = activeNonDeleted.filter((j) => getWorkOrderStatusMeta(j.Status).isCancelled).length
    const active = activeNonDeleted.filter((j) => {
      const m = getWorkOrderStatusMeta(j.Status)
      return !m.isCompleted && !m.isCancelled
    }).length

    const calcJobTypeKpi = (typeKey) => {
      const jobsOfType = activeNonDeleted.filter((j) => (j.JobType || 'REPAIR') === typeKey)
      const targetDays = kpiTargets[typeKey] || 1.0
      const totalCount = jobsOfType.length

      let onTimeCount = 0
      let overdueCount = 0
      let totalHours = 0
      let countWithDuration = 0

      jobsOfType.forEach((j) => {
        const sla = calculateSlaPerformance(j, kpiTargets, 12)
        if (sla.isOnTime) onTimeCount += 1
        else overdueCount += 1

        const durationVal = parseFloat(j.WorkingHoursDecimal || j.Duration || sla.netHoursDecimal) || 0
        if (durationVal > 0) {
          totalHours += durationVal
          countWithDuration += 1
        }
      })

      const rate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0
      const avgHours = countWithDuration > 0 ? (totalHours / countWithDuration).toFixed(1) : '—'
      const avgDurationText = avgHours !== '—' ? `${avgHours} ชม.` : '—'

      return {
        total: totalCount,
        onTime: onTimeCount,
        overdue: overdueCount,
        rate,
        avgDurationText,
        targetDays,
        targetHours: targetDays * 12,
      }
    }

    const repairKpi = calcJobTypeKpi('REPAIR')
    const designKpi = calcJobTypeKpi('DESIGN')
    const pmKpi     = calcJobTypeKpi('PM')
    const setupKpi  = calcJobTypeKpi('SETUP')

    const totalOnTime = repairKpi.onTime + designKpi.onTime + pmKpi.onTime + setupKpi.onTime
    const overallRate = total > 0 ? Math.round((totalOnTime / total) * 100) : 0

    // Problem cause analytics calculation
    const causeStats = calculateProblemCauseStats(activeNonDeleted, kpiTargets)

    // User metrics
    const userMetricsMap = {}
    activeNonDeleted.forEach((j) => {
      const u = j.CreatedBy || j.CompletedBy || 'ช่างประจำกะ'
      userMetricsMap[u] = (userMetricsMap[u] || 0) + 1
    })

    return {
      total,
      active,
      completed,
      cancelled,
      overallRate,
      repair: repairKpi,
      design: designKpi,
      pm: pmKpi,
      setup: setupKpi,
      causeStats,
      userMetrics: Object.entries(userMetricsMap).map(([name, count]) => ({ name, count })),
      recentJobs: activeNonDeleted.slice(0, 5),
    }
  }, [allJobs, kpiTargets])

  // Handle Technician checkbox toggle
  const toggleTechSelection = (techName) => {
    setSelectedTechs((prev) =>
      prev.includes(techName) ? prev.filter((t) => t !== techName) : [...prev, techName]
    )
  }

  const toggleEditTechSelection = (techName) => {
    setEditTechs((prev) =>
      prev.includes(techName) ? prev.filter((t) => t !== techName) : [...prev, techName]
    )
  }

  // Submit Start New Job
  const handleStartJob = async (e) => {
    e?.preventDefault()
    if (submittingStart) return
    if (!mc.trim()) { toast.error('กรุณาระบุรหัสเครื่อง (M/C)'); return }
    if (!ki.trim()) { toast.error('กรุณาระบุรหัสงาน (KI)'); return }
    if (selectedTechs.length === 0) { toast.error('กรุณาเลือกช่างผู้ปฏิบัติงานอย่างน้อย 1 คน'); return }

    setSubmittingStart(true)
    try {
      const now = new Date()
      const startDate = format(now, 'yyyy-MM-dd')
      const startTime = format(now, 'HH:mm:ss')
      const startTimestamp = now.toISOString()
      const jobId = generateJobId(allJobs)

      const isComp = status === 'COMPLETED'
      const detailText = comment.trim() || 'เปิดใบสั่งงาน'

      const payload = {
        // Modern CMMS columns
        Job_ID: jobId,
        StartDate: startDate,
        StartTime: startTimestamp,
        StartTimestamp: startTimestamp,
        MC: mc.trim(),
        KI: ki.trim(),
        Design: design.trim(),
        RollNo: rollNo.trim(),
        roll_no: rollNo.trim(),
        JobType: jobType,
        ProblemCause: problemCause || '',
        Technicians: selectedTechs.join(', '),
        Comment: detailText,
        Details: detailText,
        details: detailText,
        Status: status,
        IsDeleted: false,
        CreatedBy: user?.username || user?.full_name || 'ช่างประจำกะ',

        // If created directly as completed
        ...(isComp ? {
          EndDate: startDate,
          EndTime: startTimestamp,
          EndTimestamp: startTimestamp,
          DateEnd: startTimestamp,
          WorkingDurationText: '0 ชม.',
          WorkingHoursDecimal: 0,
          CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
        } : {}),

        // Legacy compatibility columns
        WO_ID: jobId,
        DateStart: startTimestamp,
        Tech: selectedTechs.join(', '),
        Problem: detailText,
        Detail: detailText,
        Priority: 'MEDIUM',
      }

      await saveJob(payload)
      toast.success('เปิดใบสั่งงานสำเร็จ', `${jobId} (${mc} - ${ki})`)

      // Auto-sync PM work orders to Monthly PM Schedule (non-blocking async)
      if (String(payload.JobType || '').toUpperCase() === 'PM') {
        syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
          console.warn('[WorkOrders] Failed to sync new PM work order to monthly schedule:', e)
        })
      }

      // Notify assigned technicians via LINE (Non-blocking async background)
      try {
        notifyLineWorkOrderAssigned(payload, selectedTechs, { technicians, systemUsers })
          .then((res) => {
            if (res?.ok && res.sentCount > 0) {
              toast.success('แจ้งเตือน LINE สำเร็จ 📲', `ส่งไปยัง ${res.recipientsText}`)
              if (res.techsWithoutLine?.length > 0) {
                toast.info('ช่างบางท่านยังไม่ได้ผูก LINE ID', res.techsWithoutLine.join(', '))
              }
            } else if (res?.reason === 'no_line_id') {
              toast.info('บันทึกใบสั่งงานแล้ว', `ช่างที่เลือก (${res.techsWithoutLine?.join(', ') || ''}) ยังไม่ได้ผูก LINE ID`)
            } else if (res && !res.ok && !res.skipped) {
              toast.error('ส่งแจ้งเตือน LINE ไม่สำเร็จ', res.errors?.[0] || res.error || 'กรุณาตรวจสอบการตั้งค่า LINE OA')
            }
          })
          .catch((err) => {
            console.warn('[WorkOrders] LINE notification background error:', err)
          })
      } catch (e) {
        console.warn('[WorkOrders] LINE notification trigger error:', e)
      }

      // Reset form
      setMc('')
      setKi('')
      setDesign('')
      setRollNo('')
      setJobType('REPAIR')
      setProblemCause('')
      setSelectedTechs([])
      setComment('')
      setStatus('IN_PROGRESS')
      setCreateModalOpen(false)
    } catch (err) {
      toast.error('ไม่สามารถเปิดใบสั่งงานได้', err.message)
    } finally {
      setSubmittingStart(false)
    }
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
  const compCalcDuration = useMemo(() => {
    if (!compJob || !compEndDate || !compEndTime) {
      return {
        hoursDecimal: 0,
        durationText: '—',
        grossHoursDecimal: 0,
        grossDurationText: '—',
        lostHoursDecimal: 0,
        lostDurationText: '0 นาที',
        netHoursDecimal: 0,
        netDurationText: '—',
      }
    }
    const start = compJob.StartTimestamp || compJob.DateStart || (compJob.StartDate && compJob.StartTime ? (compJob.StartTime.includes('T') ? compJob.StartTime : `${compJob.StartDate}T${compJob.StartTime}`) : null) || compJob.created_at
    const end = `${compEndDate}T${compEndTime}:00`
    const interruptions = getJobInterruptions(compJob)
    return calculateDuration(start, end, interruptions)
  }, [compJob, compEndDate, compEndTime])

  // Submit Complete Job
  const handleCompleteJob = async () => {
    if (compSubmitting) return
    if (!compJob || !compEndDate || !compEndTime) return
    setCompSubmitting(true)
    try {
      const endTimestamp = new Date(`${compEndDate}T${compEndTime}:00`).toISOString()
      const durationResult = compCalcDuration

      const payload = {
        ...compJob,
        EndDate: compEndDate,
        EndTime: endTimestamp,
        EndTimestamp: endTimestamp,
        DateEnd: endTimestamp,
        Duration: durationResult.netHoursDecimal,
        WorkingHoursDecimal: durationResult.netHoursDecimal,
        WorkingDurationText: durationResult.netDurationText,
        GrossDurationHours: durationResult.grossHoursDecimal,
        GrossDurationText: durationResult.grossDurationText,
        OffShiftDurationHours: durationResult.offShiftHoursDecimal,
        OffShiftDurationText: durationResult.offShiftDurationText,
        SundayDurationHours: durationResult.sundayHoursDecimal,
        SundayDurationText: durationResult.sundayDurationText,
        LostDurationHours: durationResult.lostHoursDecimal,
        LostDurationText: durationResult.lostDurationText,
        Status: 'COMPLETED',
        CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
      }

      await saveJob(payload)
      toast.success('บันทึกจบงานสำเร็จ', `${compJob.Job_ID || compJob['Job ID']} (${durationResult.netDurationText})`)

      // Auto-sync PM work order completion to Monthly PM Schedule (non-blocking async)
      if (String(payload.JobType || compJob?.JobType || '').toUpperCase() === 'PM') {
        syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
          console.warn('[WorkOrders] Failed to sync completed PM work order to monthly schedule:', e)
        })
      }
      setCompleteModalOpen(false)
      setCompJob(null)
    } catch (err) {
      toast.error('ไม่สามารถบันทึกจบงานได้', err.message)
    } finally {
      setCompSubmitting(false)
    }
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
    if (!job || !canEdit) return
    const nextMeta = getWorkOrderStatusMeta(nextStatusCode)
    const currentMeta = getWorkOrderStatusMeta(job.Status)
    if (nextMeta.value === currentMeta.value) return

    if (nextMeta.isCompleted && !currentMeta.isCompleted) {
      openCompleteModal(job)
      return
    }

    try {
      const payload = {
        ...job,
        Status: nextMeta.value,
        UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
      }
      await saveJob(payload)
      toast.success(`อัปเดตสถานะเป็น "${nextMeta.label}" สำเร็จ`, job.Job_ID || job['Job ID'])

      // Auto-sync status change to Monthly PM Schedule
      if (String(payload.JobType || job?.JobType || '').toUpperCase() === 'PM') {
        syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
          console.warn('[WorkOrders] Failed to sync status change to monthly schedule:', e)
        })
      }
    } catch (err) {
      toast.error('ไม่สามารถอัปเดตสถานะใบสั่งงานได้', err.message)
    }
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
    if (!dailyLogJob) return
    const details = dailyLogDetails.trim()
    if (!details) {
      toast.warning('กรุณาระบุรายละเอียดงานประจำวัน / สิ่งที่ทำได้ในวันนี้')
      return
    }
    setDailyLogSubmitting(true)
    try {
      const currentJob =
        allJobs.find(
          (j) =>
            (j.id && j.id === dailyLogJob.id) ||
            (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
            (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
        ) || dailyLogJob

      const existingLogs = getJobDailyLogs(currentJob)
      const newEntry = {
        id: `DLOG-${Date.now()}`,
        date: dailyLogDate || format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
        status: dailyLogStatus,
        details,
        hours: dailyLogHours ? parseFloat(dailyLogHours) : null,
        techs: dailyLogTechs,
        recorded_by: user?.username || user?.full_name || 'ช่างประจำกะ',
      }
      const updatedLogs = [...existingLogs, newEntry]
      const nextMeta = getWorkOrderStatusMeta(dailyLogStatus)
      const logsJson = JSON.stringify(updatedLogs)
      const techStr = Array.isArray(dailyLogTechs) && dailyLogTechs.length > 0 ? dailyLogTechs.join(', ') : (currentJob.Technicians || currentJob.Tech || '')

      const payload = {
        ...currentJob,
        DailyLogs: logsJson,
        daily_logs: logsJson,
        Status: nextMeta.value,
        Tech: techStr,
        Technicians: techStr,
        UpdatedBy: user?.username || user?.full_name || 'ผู้บันทึกรายวัน',
        updated_at: new Date().toISOString(),
      }

      await saveJob(payload)
      toast.success(
        'บันทึกความคืบหน้ารายวันสำเร็จ',
        `${currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID} • สถานะ: ${nextMeta.label}`
      )

      // Auto-sync daily log PM work order to Monthly PM Schedule
      if (String(payload.JobType || currentJob?.JobType || '').toUpperCase() === 'PM') {
        syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
          console.warn('[WorkOrders] Failed to sync daily log to monthly schedule:', e)
        })
      }
      setDailyLogModalOpen(false)
      setDailyLogJob(null)
    } catch (err) {
      toast.error('บันทึกความคืบหน้าไม่สำเร็จ', err.message)
    } finally {
      setDailyLogSubmitting(false)
    }
  }

  // Open 2-Step Confirmation Modal to Cancel Job from Daily Log
  const openCancelJobConfirm = () => {
    setCancelJobReason('')
    setCancelJobModalOpen(true)
  }

  // Confirm Cancellation of Job
  const handleConfirmCancelJob = async () => {
    if (!dailyLogJob) return
    const reason = cancelJobReason.trim()
    if (!reason) {
      toast.warning('กรุณาระบุเหตุผล', 'กรุณาระบุเหตุผลในการยกเลิกใบสั่งงาน')
      return
    }

    setCancellingJobSubmitting(true)
    try {
      const currentJob =
        allJobs.find(
          (j) =>
            (j.id && j.id === dailyLogJob.id) ||
            (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
            (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
        ) || dailyLogJob

      const userName = user?.full_name || user?.line_display_name || user?.username || user?.Name || 'ช่างผู้ใช้งาน'
      const payload = buildCancelJobPayload({
        job: currentJob,
        cancelDate: format(new Date(), 'yyyy-MM-dd'),
        reason,
        technician: userName,
      })

      await saveJob(payload)

      toast.success(
        'ยกเลิกใบสั่งงานสำเร็จ',
        `${currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID} • สถานะ: ยกเลิก`
      )

      setCancelJobModalOpen(false)
      setDailyLogModalOpen(false)
      setDailyLogJob(null)
    } catch (err) {
      toast.error('ยกเลิกใบสั่งงานไม่สำเร็จ', err.message)
    } finally {
      setCancellingJobSubmitting(false)
    }
  }

  // Delete a Daily Log Entry (admin / correction)
  const handleDeleteDailyLog = async (logId) => {
    if (!dailyLogJob || !canDelete) return
    const currentJob =
      allJobs.find(
        (j) =>
          (j.id && j.id === dailyLogJob.id) ||
          (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
          (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
      ) || dailyLogJob
    const existingLogs = getJobDailyLogs(currentJob)
    const updatedLogs = existingLogs.filter((l) => l.id !== logId)
    const logsJson = JSON.stringify(updatedLogs)
    const payload = {
      ...currentJob,
      DailyLogs: logsJson,
      daily_logs: logsJson,
      UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
      updated_at: new Date().toISOString(),
    }
    try {
      await saveJob(payload)
      setDailyLogJob(payload)
      toast.success('ลบรายการบันทึกรายวันเรียบร้อย')
    } catch (err) {
      toast.error('ลบรายการไม่สำเร็จ', err.message)
    }
  }

  // Submit Edit Job
  const handleEditJob = async () => {
    if (!editJob) return
    setEditSubmitting(true)
    try {
      const payload = buildEditJobPayload(editJob, editTechs, user)
      const newlyAddedTechs = resolveNewlyAddedTechs(editJob, editTechs)

      await saveJob(payload)
      toast.success('แก้ไขข้อมูลใบสั่งงานสำเร็จ', editJob.Job_ID || editJob['Job ID'])

      // Auto-sync edited PM work order to Monthly PM Schedule
      if (String(payload.JobType || editJob?.JobType || '').toUpperCase() === 'PM') {
        syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
          console.warn('[WorkOrders] Failed to sync edited PM work order to monthly schedule:', e)
        })
      }

      notifyAddedTechs({ payload, newlyAddedTechs, technicians, systemUsers, notifyFn: notifyLineWorkOrderAssigned, toast })

      setEditModalOpen(false)
      setEditJob(null)
    } catch (err) {
      toast.error('ไม่สามารถแก้ไขใบสั่งงานได้', err.message)
    } finally {
      setEditSubmitting(false)
    }
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
    try {
      await Promise.all([
        KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_repair', Value: String(draftKpi.REPAIR) }),
        KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_design', Value: String(draftKpi.DESIGN) }),
        KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_pm',     Value: String(draftKpi.PM) }),
        KpiSettingsAPI.upsertBy('Key', { Key: 'kpi_target_setup',  Value: String(draftKpi.SETUP || 1.0) }),
      ])
      setKpiTargets({ ...draftKpi })
      toast.success('บันทึกเป้าหมาย KPI สำเร็จ', 'อัปเดตระบบคำนวณ SLA เรียบร้อย')
      setKpiModalOpen(false)
    } catch (err) {
      setKpiTargets({ ...draftKpi })
      toast.success('บันทึกเป้าหมาย KPI เรียบร้อย (Local)', 'อัปเดตระบบคำนวณ SLA เรียบร้อย')
      setKpiModalOpen(false)
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-900)' }}>
            ระบบบันทึกผลงานช่าง (Work Orders & KPI)
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-500)' }}>
            Gemma Knits Maintenance Management System · Version 55
          </p>
        </div>

        {/* Action Controls & Sync */}
        <div className="flex items-center gap-2">
          {exportConfig && (
            <GoogleSheetSyncButton
              sheetName={exportConfig.sheetName}
              columns={exportConfig.columns}
              fetchRows={WorkOrderAPI.list}
              valueGetters={exportConfig.valueGetters}
            />
          )}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5 shadow-2xs font-bold"
            title="พิมพ์รายงานใบสั่งงานตามตัวกรองที่เลือก"
          >
            <Printer size={14} className="text-blue-500" />
            <span className="hidden sm:inline">พิมพ์รายงาน</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px]">
              {filteredJobs.length}
            </span>
          </button>
          <button
            onClick={() => {
              loadJobs()
              loadTechsAndSettings()
            }}
            className="btn-outline"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={jobsLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* ── 5-Tabs Navigation Bar (Smooth Horizontal Scroll on Mobile) ── */}
      <div
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap pb-2 sm:pb-1.5 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setCurrentTab('records')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'records'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ClipboardList size={16} />
          <span>รายการใบสั่งงาน & เปิดงาน</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            currentTab === 'records' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {allJobs.filter((j) => !j.IsDeleted).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('repair_requests')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'repair_requests'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Wrench size={16} />
          <span>แจ้งซ่อม (Repair Requests)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Target size={16} />
          <span>แดชบอร์ด & สรุป KPI</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('technicians')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'technicians'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <UserCheck size={16} />
          <span>ทะเบียนช่าง</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            currentTab === 'technicians' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {technicians.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('settings')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <SettingsIcon size={16} />
          <span>ตั้งค่าเป้าหมาย KPI</span>
        </button>
      </div>

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
{completeModalOpen && compJob && (
        <WorkOrdersCompleteModal completeModalOpen={completeModalOpen} compJob={compJob} compCalcDuration={compCalcDuration} compEndDate={compEndDate} compEndTime={compEndTime} compSubmitting={compSubmitting} setCompEndDate={setCompEndDate} setCompEndTime={setCompEndTime} setCompleteModalOpen={setCompleteModalOpen} handleCompleteJob={handleCompleteJob} openInterruptionModal={openInterruptionModal} />
      )}

      {/* 2. Edit Job Modal */}
{editModalOpen && editJob && (
        <WorkOrdersEditModal editModalOpen={editModalOpen} editJob={editJob} editTechs={editTechs} editSubmitting={editSubmitting} setEditJob={setEditJob} setEditModalOpen={setEditModalOpen} handleEditJob={handleEditJob} toggleEditTechSelection={toggleEditTechSelection} technicians={technicians} inUseMachines={inUseMachines} matchedEditActiveMachine={matchedEditActiveMachine} />
      )}

      {/* 3. Add / Edit Technician Modal */}
      <WorkOrderTechModal techModalOpen={techModalOpen} setTechModalOpen={setTechModalOpen} editingTechId={editingTechId} techForm={techForm} setTechForm={setTechForm} selectedUserId={selectedUserId} systemUsers={systemUsers} technicians={technicians} handleSaveTech={handleSaveTech} handleSelectUserForTech={handleSelectUserForTech} />

      {/* 4. Quick KPI Settings Modal */}
{kpiModalOpen && (
        <WorkOrdersKpiModal kpiModalOpen={kpiModalOpen} draftKpi={draftKpi} setDraftKpi={setDraftKpi} setKpiModalOpen={setKpiModalOpen} handleSaveKpiSettings={handleSaveKpiSettings} />
      )}

      {/* 6. Interruption & Lost Time Modal */}
        <WorkOrdersInterruptionModal interruptionModalOpen={interruptionModalOpen} interruptionJob={interruptionJob} setInterruptionModalOpen={setInterruptionModalOpen} interruptionTaskName={interruptionTaskName} setInterruptionTaskName={setInterruptionTaskName} interruptionManualMins={interruptionManualMins} setInterruptionManualMins={setInterruptionManualMins} interruptionManualNotes={interruptionManualNotes} setInterruptionManualNotes={setInterruptionManualNotes} showManualAdd={showManualAdd} setShowManualAdd={setShowManualAdd} handleAddManualInterruption={handleAddManualInterruption} handleDeleteInterruption={handleDeleteInterruption} handleStartInterruption={handleStartInterruption} handleStopInterruption={handleStopInterruption} getJobInterruptions={getJobInterruptions} QUICK_INTERRUPTION_PRESETS={QUICK_INTERRUPTION_PRESETS} />

      {/* 5. Print A4 PDF Report Modal */}
      {printModalOpen && printJob && (
        <PdfPreviewModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          {...generateWorkOrderPdfProps({
            ...printJob,
            WONumber: printJob.Job_ID || printJob['Job ID'],
            OrderDate: printJob.StartDate,
            WOType: printJob.JobType === 'DESIGN' ? 'ปรับแบบ (Design)' : printJob.JobType === 'PM' ? 'บำรุงรักษา (PM)' : printJob.JobType === 'SETUP' ? 'เตรียมเครื่อง (Setup)' : 'แก้ไขเครื่อง (Repair)',
            MachineID: printJob.MC,
            KI: printJob.KI,
            Design: printJob.Design,
            RollNo: printJob.RollNo || printJob.roll_no || '',
            AssignedTo: printJob.Technicians,
            Title: printJob.Design ? `งานปรับแบบ: ${printJob.Design}` : `งานซ่อมบำรุง: ${printJob.MC}`,
            Description: printJob.Comment,
            Duration: printJob.WorkingDurationText || printJob.WorkingHoursDecimal,
            StartTime: `${printJob.StartDate || ''} ${printJob.StartTime || ''}`.trim(),
            EndTime: printJob.EndDate ? `${printJob.EndDate} ${printJob.EndTime || ''}`.trim() : 'ยังไม่เสร็จสิ้น',
          })}
        />
      )}

      {/* 6. Filtered Work Orders Print Report Modal */}
      {reportModalOpen && (
        <WorkOrdersReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          items={filteredJobs}
          filterContext={{
            typeFilters,
            statusFilters,
            search,
            showDeleted,
          }}
          kpiTargets={kpiTargets}
          currentUserName={user?.full_name || user?.line_display_name || user?.username || user?.Name || 'ช่างผู้ใช้งาน'}
        />
      )}

      {/* 6. Daily Progress Update Modal (อัปเดตงานประจำวัน / บันทึกจบวัน) */}
        <WorkOrdersDailyLogModal dailyLogModalOpen={dailyLogModalOpen} dailyLogJob={dailyLogJob} setDailyLogModalOpen={setDailyLogModalOpen} dailyLogDate={dailyLogDate} setDailyLogDate={setDailyLogDate} dailyLogDetails={dailyLogDetails} setDailyLogDetails={setDailyLogDetails} dailyLogHours={dailyLogHours} setDailyLogHours={setDailyLogHours} dailyLogStatus={dailyLogStatus} setDailyLogStatus={setDailyLogStatus} dailyLogTechs={dailyLogTechs} setDailyLogTechs={setDailyLogTechs} dailyLogSubmitting={dailyLogSubmitting} cancellingJobSubmitting={cancellingJobSubmitting} handleSaveDailyLog={handleSaveDailyLog} handleDeleteDailyLog={handleDeleteDailyLog} openCancelJobConfirm={openCancelJobConfirm} technicians={technicians} allJobs={allJobs} canEdit={canEdit} canDelete={canDelete} />

      {/* 2-Step Confirmation Modal for Cancelling Job */}
        <WorkOrdersCancelModal cancelJobModalOpen={cancelJobModalOpen} dailyLogJob={dailyLogJob} cancelJobReason={cancelJobReason} setCancelJobReason={setCancelJobReason} cancellingJobSubmitting={cancellingJobSubmitting} setCancelJobModalOpen={setCancelJobModalOpen} handleConfirmCancelJob={handleConfirmCancelJob} />

      {/* ── CREATE WORK ORDER MODAL (ป๊อปอัพเปิดใบสั่งงาน) ── */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => !submittingStart && setCreateModalOpen(false)}
          size="lg"
        >
          <div className="flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2 truncate" style={{ color: 'var(--text-900)' }}>
                  <Plus size={18} className="text-blue-500 shrink-0" />
                  <span className="truncate">บันทึกเริ่มงานซ่อม / เปิดใบสั่งงาน (Create Work Order)</span>
                </h2>
                <div className="text-[11px] sm:text-xs mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                  กรอกข้อมูลเพื่อเริ่มงาน ระบบจะสร้างรหัส Job ID และจับเวลาการทำงานให้อัตโนมัติ
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  ผู้บันทึก: <b className="text-blue-600 dark:text-blue-400 ml-1">{user?.username || user?.full_name || 'admin'}</b>
                </div>
                <button
                  type="button"
                  onClick={() => !submittingStart && setCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleStartJob} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* 1. M/C, KI, Design, Roll No */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label flex items-center justify-between">
                      <span>รหัสเครื่อง (M/C) *</span>
                      {inUseMachines.length > 0 && (
                        <span className="text-[10px] font-normal text-blue-500 dark:text-blue-400">
                          (ในระบบ: {inUseMachines.length} เครื่อง)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      list="wo-inuse-machines"
                      placeholder="เช่น DA-306M หรือพิมพ์ค้นหา"
                      value={mc}
                      onChange={(e) => setMc(e.target.value)}
                      className="input font-mono font-bold uppercase"
                      required
                      autoFocus
                    />
                    {matchedActiveMachine && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50/70 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 animate-fadeIn">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">In-use</span>
                        {matchedActiveMachine.location && (
                          <span>· โซน: <b className="text-slate-800 dark:text-slate-200">{matchedActiveMachine.location}</b></span>
                        )}
                        {matchedActiveMachine.serial && (
                          <span>· ซีเรียล: <span className="font-mono">{matchedActiveMachine.serial}</span></span>
                        )}
                        {(matchedActiveMachine.diameter || matchedActiveMachine.gauge) && (
                          <span>· ขนาด: <span className="font-mono">{matchedActiveMachine.diameter ? `${matchedActiveMachine.diameter}"` : ''} {matchedActiveMachine.gauge ? `${matchedActiveMachine.gauge}G` : ''}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">รหัสงาน (KI) *</label>
                    <input
                      type="text"
                      placeholder="เช่น KI-9012"
                      value={ki}
                      onChange={(e) => setKi(e.target.value)}
                      className="input font-mono font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">แบบงาน (DESIGN)</label>
                    <input
                      type="text"
                      placeholder="ระบุแบบงาน / ลายผ้า"
                      value={design}
                      onChange={(e) => setDesign(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">เลขม้วน (ROLL NO)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="ระบุเลขม้วน"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      className="input font-mono"
                    />
                  </div>
                </div>

                {/* 2. ประเภท, สาเหตุปัญหา, รายละเอียด, สถานะ */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="label">ประเภทงาน (JOB TYPE)</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="select font-semibold"
                    >
                      <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                      <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                      <option value="PM">🧹 PM / ล้างเครื่อง</option>
                      <option value="SETUP">⚙️ เตรียมเครื่อง (Setup)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">สาเหตุปัญหา (ROOT CAUSE)</label>
                    <select
                      value={problemCause}
                      onChange={(e) => setProblemCause(e.target.value)}
                      className="select font-semibold"
                    >
                      <option value="">-- ไม่ระบุ / ระบุภายหลัง --</option>
                      {PROBLEM_CAUSE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="label">รายละเอียด / อาการเสียงานซ่อม</label>
                    <input
                      type="text"
                      placeholder="ระบุอาการเสีย หรือรายละเอียดการปรับแต่ง..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">สถานะ (STATUS)</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select font-semibold"
                    >
                      {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Technicians Multi-Select Checklist */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="label flex items-center gap-1.5">
                      <Wrench size={13} className="text-blue-500" />
                      <span>ช่างปรับผู้ปฏิบัติงาน (เลือกได้มากกว่า 1 คน) *</span>
                    </label>
                    <span className="badge badge-blue text-[11px] font-bold">
                      เลือกแล้ว: {selectedTechs.length} คน
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                    {technicians.filter((t) => t.Status !== 'INACTIVE').map((tech, idx) => {
                      const isChecked = selectedTechs.includes(tech.Name)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTechSelection(tech.Name)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer ${
                            isChecked
                              ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="truncate">{tech.Name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={submittingStart}
                  className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingStart}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Send size={14} />
                  <span>{submittingStart ? 'กำลังบันทึก...' : 'ยืนยันเปิดใบสั่งงาน (เริ่มงาน)'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Shared In-use Machines Datalist for Autocomplete in Create/Edit Work Order */}
      <datalist id="wo-inuse-machines">
        {inUseMachines.map((m) => (
          <option
            key={m.code}
            value={m.code}
          >
            {m.code} ({m.location ? `โซน ${m.location}` : ''}{m.standard ? ` · ${m.standard}` : ''}{m.diameter ? ` · ${m.diameter}"` : ''}{m.gauge ? ` ${m.gauge}G` : ''})
          </option>
        ))}
      </datalist>

      {/* Mobile Floating Action Button (FAB) for Opening Work Order (Portaled to document.body to lock viewport position) */}
      {currentTab === 'records' && canAdd && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn-fab"
          title="เปิดใบสั่งงาน"
          aria-label="เปิดใบสั่งงาน"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>,
        document.body
      )}
    </div>
  )
}
