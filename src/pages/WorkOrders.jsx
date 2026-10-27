import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ClipboardList,
  Target,
  Wrench,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  Send,
  UserCheck,
  Search,
  Printer,
  History,
  RotateCcw,
  Sliders,
  UserPlus,
  X,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Pause,
  Play,
  Hourglass,
  Sparkles,
  CalendarClock,
  Tag,
  ArrowRight,
  PieChart,
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import {
  WorkOrderAPI,
  TechnicianAPI,
  UserAPI,
  KpiSettingsAPI,
  AuditLogAPI,
  WO_JOB_TYPE,
  TECH_SKILL_LEVELS,
  TECH_SPECIALIZATIONS,
  generateJobId,
  calculateDuration,
  calculateSlaPerformance,
  calculateInterruptionTotal,
  formatMinutesToThai,
  isSystemWorkOrder,
} from '../api/entities'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import useDeviceView from '../hooks/useDeviceView'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { SHEET_EXPORTS } from '../utils/sheetExportConfigs'
import RepairRequests from './RepairRequests'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import WorkOrdersReportModal from '../components/workorder/WorkOrdersReportModal'
import { db } from '../api/dbClient'
import { generateWorkOrderPdfProps } from '../utils/pdfDocGenerators'
import { notifyLineWorkOrderAssigned } from '../utils/line'
import { PROBLEM_CAUSE_OPTIONS, getProblemCauseMeta } from '../constants/problemCause'

const DEFAULT_KPI_TARGETS = {
  REPAIR: 1.0,
  DESIGN: 3.0,
  PM: 2.0,
}

const UI_SKILL_LEVELS = [
  { value: 'Junior', label: 'Junior', desc: 'ช่างฝึกหัด / ผู้ช่วยช่าง', icon: '🔰' },
  { value: 'Technician', label: 'Technician', desc: 'ช่างชำนาญงานทั่วไป', icon: '🎖️' },
  { value: 'Senior', label: 'Senior', desc: 'ช่างอาวุโส / ปรับแต่งชำนาญ', icon: '🥈' },
  { value: 'Master', label: 'Master', desc: 'หัวหน้าช่าง / ผู้เชี่ยวชาญพิเศษ', icon: '🥇' },
]

const UI_SPECIALIZATIONS = [
  { value: 'เตรียมเครื่อง', label: 'เตรียมเครื่อง', icon: '🛠️' },
  { value: 'ปรับเครื่อง', label: 'ปรับเครื่อง', icon: '⚄' },
  { value: 'แก้ปัญหาเครื่อง', label: 'แก้ปัญหาเครื่อง', icon: '🔧' },
  { value: 'ตั้งศูนย์เครื่อง', label: 'ตั้งศูนย์เครื่อง', icon: '📐' },
]

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
]

export const WORK_ORDER_STATUS_OPTIONS = [
  {
    value: 'IN_PROGRESS',
    label: 'กำลังทำ',
    fullLabel: '🟡 กำลังทำ (In Progress)',
    icon: '🟡',
    badgeClass: 'badge-orange',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
  },
  {
    value: 'WAITING_TECH',
    label: 'รอช่าง',
    fullLabel: '🟠 รอช่าง (Waiting Tech)',
    icon: '🟠',
    badgeClass: 'badge-yellow',
    activeClass: 'bg-orange-500 text-white border-orange-500 shadow-xs',
  },
  {
    value: 'WAITING_PARTS',
    label: 'รออะไหล่',
    fullLabel: '🟣 รออะไหล่ (Waiting Parts)',
    icon: '🟣',
    badgeClass: 'badge-purple',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs',
  },
  {
    value: 'WAITING_SUMMARY',
    label: 'รอสรุป',
    fullLabel: '🔵 รอสรุป (Waiting Summary)',
    icon: '🔵',
    badgeClass: 'badge-blue',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs',
  },
  {
    value: 'COMPLETED',
    label: 'เสร็จสิ้น',
    fullLabel: '🟢 เสร็จสิ้น (Completed)',
    icon: '🟢',
    badgeClass: 'badge-green',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
]

/**
 * Normalizes any work order status code or Thai label into a standard metadata object.
 * Guarantees 100% backward compatibility with legacy 'IN_PROGRESS', 'COMPLETED', 'กำลังทำ', 'เสร็จสิ้น'.
 */
export function getWorkOrderStatusMeta(status) {
  const raw = String(status || '').trim()
  const upper = raw.toUpperCase()

  if (upper === 'COMPLETED' || raw === 'เสร็จสิ้น') {
    return { ...WORK_ORDER_STATUS_OPTIONS[4], isCompleted: true }
  }
  if (upper === 'WAITING_TECH' || raw === 'รอช่าง') {
    return { ...WORK_ORDER_STATUS_OPTIONS[1], isCompleted: false }
  }
  if (upper === 'WAITING_PARTS' || raw === 'รออะไหล่') {
    return { ...WORK_ORDER_STATUS_OPTIONS[2], isCompleted: false }
  }
  if (upper === 'WAITING_SUMMARY' || raw === 'รอสรุป') {
    return { ...WORK_ORDER_STATUS_OPTIONS[3], isCompleted: false }
  }
  return { ...WORK_ORDER_STATUS_OPTIONS[0], isCompleted: false }
}

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
export function getWorkOrderDetails(job = {}) {
  if (!job) return '—'
  const comment = job.Comment || job.comment || ''
  if (comment && typeof comment === 'string') {
    if (comment.trim().startsWith('{') && comment.includes('synced_from_repair')) {
      return job.Problem || job.problem || job.Details || job.details || job.Detail || job.Solution || '—'
    }
    return comment
  }
  return job.Details || job.details || job.Problem || job.problem || job.Detail || job.Description || '—'
}

/**
 * Safely parses and returns daily work progress logs from a work order record.
 * Supports JSON string or array, double-stringified JSON, and fallback metadata in Comment.
 */
export function getJobDailyLogs(job = {}) {
  if (!job) return []
  const raw = job.DailyLogs || job.daily_logs || job.dailyLogs
  if (!raw) {
    const comment = job.Comment || job.comment || ''
    if (typeof comment === 'string' && comment.trim().startsWith('{') && comment.includes('daily_logs')) {
      try {
        const parsed = JSON.parse(comment)
        if (Array.isArray(parsed.daily_logs)) return parsed.daily_logs
      } catch {}
    }
    return []
  }
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      let parsed = JSON.parse(raw)
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed) } catch {}
      }
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Returns the most recent daily work log entry, or null if none exist.
 * Sorts chronologically so the latest date/timestamp is consistently returned.
 */
export function getLatestDailyLog(job = {}) {
  const logs = getJobDailyLogs(job)
  if (!Array.isArray(logs) || logs.length === 0) return null
  const sorted = [...logs].sort((a, b) => {
    const tA = new Date(a.timestamp || a.date).getTime() || 0
    const tB = new Date(b.timestamp || b.date).getTime() || 0
    return tA - tB
  })
  return sorted[sorted.length - 1]
}

export function getTechSkillInfo(skillLevel = 'Senior') {
  const norm = String(skillLevel || '').trim().toLowerCase()
  if (norm.includes('master')) {
    return {
      level: 4,
      maxLevel: 4,
      percent: 100,
      label: 'Master',
      sublabel: 'หัวหน้าช่าง / ผู้เชี่ยวชาญ',
      icon: '🥇',
      gradient: 'from-purple-500 to-indigo-600',
      activeBg: 'bg-purple-600',
      textColor: 'text-purple-600 dark:text-purple-400',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    }
  }
  if (norm.includes('senior')) {
    return {
      level: 3,
      maxLevel: 4,
      percent: 75,
      label: 'Senior',
      sublabel: 'ช่างอาวุโส / ปรับแต่งชำนาญ',
      icon: '🥈',
      gradient: 'from-blue-500 to-indigo-500',
      activeBg: 'bg-blue-600',
      textColor: 'text-blue-600 dark:text-blue-400',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    }
  }
  if (norm.includes('tech') || norm.includes('mid')) {
    return {
      level: 2,
      maxLevel: 4,
      percent: 50,
      label: 'Technician',
      sublabel: 'ช่างชำนาญงานทั่วไป',
      icon: '🎖️',
      gradient: 'from-sky-400 to-blue-500',
      activeBg: 'bg-sky-500',
      textColor: 'text-sky-600 dark:text-sky-400',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    }
  }
  return {
    level: 1,
    maxLevel: 4,
    percent: 25,
    label: 'Junior',
    sublabel: 'ช่างฝึกหัด / ผู้ช่วยช่าง',
    icon: '🔰',
    gradient: 'from-emerald-400 to-teal-500',
    activeBg: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  }
}

export function TechSkillBar({ skillLevel = 'Senior' }) {
  const info = getTechSkillInfo(skillLevel)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200">
          <span>{info.icon}</span>
          <span className={info.textColor}>{info.label}</span>
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{info.sublabel}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((step) => {
          const isFilled = step <= info.level
          return (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                isFilled ? info.activeBg : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
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

function WorkOrderCard({
  job,
  kpiTargets,
  canEdit,
  canDelete,
  onInterruption,
  onComplete,
  onPrint,
  onEdit,
  onDelete,
  onDailyLog,
}) {
  const statusMeta = getWorkOrderStatusMeta(job.Status)
  const isCompleted = statusMeta.isCompleted
  const sla = calculateSlaPerformance(job, kpiTargets)
  const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`
  const detailsDisplay = getWorkOrderDetails(job)
  const dailyLogs = getJobDailyLogs(job)
  const latestDailyLog = getLatestDailyLog(job)

  return (
    <div
      className={`card p-3.5 border transition-all active:scale-[0.99] cursor-pointer shadow-xs hover:shadow-md ${
        isCompleted
          ? 'border-emerald-500/30 bg-white dark:bg-slate-900/90'
          : sla.activeInterruption
          ? 'border-amber-500/50 bg-amber-50/20 dark:bg-slate-900/90'
          : 'border-blue-500/30 bg-white dark:bg-slate-900/90'
      }`}
    >
      {/* Header: Job ID + Type Badge + Status Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight truncate">
            {jobIdDisplay}
          </span>
          <span
            className={`badge text-[10px] ${
              job.JobType === 'DESIGN'
                ? 'badge-purple'
                : job.JobType === 'PM'
                ? 'badge-yellow'
                : 'badge-blue'
            }`}
          >
            {job.JobType === 'DESIGN' ? '🎨 ปรับแบบ' : job.JobType === 'PM' ? '🧹 PM' : '🛠️ แก้ไข'}
          </span>
          {(job.ProblemCause || job.problem_cause) && (() => {
            const causeMeta = getProblemCauseMeta(job.ProblemCause || job.problem_cause)
            return (
              <span className={`badge text-[10px] font-bold ${causeMeta.badgeClass}`} title={`สาเหตุปัญหา: ${causeMeta.label}`}>
                {causeMeta.icon} {causeMeta.label}
              </span>
            )
          })()}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`badge text-[10px] ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Machine & Production Info */}
      <div className="flex items-center justify-between gap-2 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
            {job.MC || '—'}
          </span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            KI: {job.KI || '—'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {job.RollNo ? `ม้วน #${job.RollNo}` : ''}
        </div>
      </div>

      {/* Design and Details */}
      {(job.Design || detailsDisplay !== '—' || latestDailyLog) && (
        <div className="text-xs space-y-1.5 py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-2">
          {job.Design && (
            <div className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              {job.Design}
            </div>
          )}
          {detailsDisplay !== '—' && (
            <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px]">
              {detailsDisplay}
            </div>
          )}
          {latestDailyLog && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                onDailyLog?.(job)
              }}
              className="mt-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold cursor-pointer active:scale-[0.98] transition-transform"
              title={`อัปเดตงานล่าสุด (${latestDailyLog.date}): ${latestDailyLog.details} (แตะเพื่อดูประวัติหรืออัปเดต)`}
            >
              <CalendarClock size={12} className="flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="flex-shrink-0">ล่าสุด ({latestDailyLog.date}):</span>
              <span className="truncate flex-1 font-normal text-slate-700 dark:text-slate-300">{latestDailyLog.details}</span>
              {dailyLogs.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 dark:bg-indigo-900 text-[10px] flex-shrink-0">
                  +{dailyLogs.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Technicians, Time & SLA */}
      <div className="grid grid-cols-2 gap-2 text-xs py-1.5 text-slate-600 dark:text-slate-400">
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-medium">ช่างผู้ปฏิบัติงาน:</div>
          <div className="font-semibold truncate text-slate-700 dark:text-slate-300">
            {job.Technicians || '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-medium">ระยะเวลา & SLA:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {job.WorkingDurationText || (isCompleted ? `${job.WorkingHoursDecimal} ชม.` : 'กำลังทำ...')}
            </span>
            <span className={`badge text-[9px] px-1.5 py-0 ${sla.badgeClass}`}>
              {sla.label}
            </span>
          </div>
        </div>
      </div>

      {/* Interruption banner if active */}
      {sla.activeInterruption && (
        <div className="mt-1 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Pause size={12} className="animate-pulse" />
            <span>พักงาน: {sla.activeInterruption.task_name}</span>
          </div>
          <span className="text-[10px] font-mono">กำลังจับเวลาแทรก</span>
        </div>
      )}

      {/* Footer: Quick Action Buttons (min 40-44px touch target) */}
      <div
        className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-mono text-slate-400">
          {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}` : ''}
        </span>

        <div className="flex items-center gap-1">
          {/* Interruption / Lost Time */}
          {!job.IsDeleted && (
            <button
              type="button"
              onClick={() => onInterruption(job)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 min-h-[36px] ${
                sla.activeInterruption
                  ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30'
                  : sla.lostHoursDecimal > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600'
              }`}
              title={sla.activeInterruption ? 'คลิกเพื่อจบงานแทรก' : 'บันทึกงานแทรก'}
            >
              {sla.activeInterruption ? <Pause size={14} /> : <Clock size={14} />}
              {sla.activeInterruption && <span className="text-[11px]">พักงาน</span>}
            </button>
          )}

          {/* Complete Job */}
          {!isCompleted && !job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onComplete(job)}
              className="btn-success px-3 py-1.5 text-xs font-bold flex items-center gap-1 rounded-xl min-h-[36px]"
              title="บันทึกจบงาน"
            >
              <CheckCircle2 size={14} />
              <span>จบงาน</span>
            </button>
          )}

          {/* Daily Work Progress Update Button */}
          {!job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onDailyLog?.(job)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 min-h-[36px] ${
                dailyLogs.length > 0
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600'
              }`}
              title="อัปเดตงานแต่ละวัน / บันทึกจบวัน (ความคืบหน้า & สถานะ)"
            >
              <CalendarClock size={15} />
              {dailyLogs.length > 0 && (
                <span className="text-[10px] font-mono px-1 rounded-full bg-indigo-600 text-white">
                  {dailyLogs.length}
                </span>
              )}
            </button>
          )}

          {/* Print PDF */}
          <button
            type="button"
            onClick={() => onPrint(job)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 min-h-[36px]"
            title="พิมพ์ใบสั่งงาน A4"
          >
            <Printer size={15} />
          </button>

          {/* Edit */}
          {!job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onEdit(job)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 min-h-[36px]"
              title="แก้ไข"
            >
              <Pencil size={15} />
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 min-h-[36px]"
              title="ลบ"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_TECHS = []

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

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [typeFilters, setTypeFilters] = useState([]) // [] = ALL, or ['REPAIR', 'DESIGN', ...]
  const [statusFilters, setStatusFilters] = useState([]) // [] = ALL, or ['IN_PROGRESS', 'WAITING_TECH', ...]
  const [causeFilter, setCauseFilter] = useState('') // '' = ALL, 'คน', 'เครื่องจักร', 'วัตถุดิบ', 'UNSPECIFIED'
  const [showDeleted, setShowDeleted] = useState(false)

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

  // Modals State
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [compJob, setCompJob] = useState(null)
  const [compEndDate, setCompEndDate] = useState('')
  const [compEndTime, setCompEndTime] = useState('')
  const [compSubmitting, setCompSubmitting] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [editTechs, setEditTechs] = useState([])
  const [editSubmitting, setEditSubmitting] = useState(false)

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
      const [techRes, kpiRes, usersRes] = await Promise.allSettled([
        TechnicianAPI.list(),
        KpiSettingsAPI.list(),
        UserAPI.list(),
      ])

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setSystemUsers(usersRes.value)
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
      .map((r) => {
      const jobId = r.Job_ID || r['Job ID'] || r.WO_ID || (r.id ? `JOB-${String(r.id).slice(0, 8)}` : 'JOB-00000000-0000')
      const technicians = r.Technicians || r['Technicians'] || r.Tech || ''
      const comment = r.Comment || r['Comment'] || r.Problem || r.Detail || ''
      const rawDailyLogs = r.DailyLogs || r.daily_logs || r['Daily Logs'] || r.dailyLogs || null
      const normalizedDailyLogs = typeof rawDailyLogs === 'object' && rawDailyLogs !== null ? JSON.stringify(rawDailyLogs) : (rawDailyLogs || '')
      const startTimestamp = r.StartTimestamp || r['Start Timestamp'] || r.DateStart || r.StartTime || ''
      const endTimestamp = r.EndTimestamp || r['End Timestamp'] || r.DateEnd || r.EndTime || ''
      const startDate = r.StartDate || r['Start Date'] || (typeof startTimestamp === 'string' && startTimestamp.includes('T') ? startTimestamp.slice(0, 10) : (r.StartDate || ''))
      const startTime = r.StartTime || r['Start Time'] || (typeof startTimestamp === 'string' && startTimestamp.includes('T') ? startTimestamp.slice(11, 19) : (r.StartTime || ''))
      const endDate = r.EndDate || r['End Date'] || (typeof endTimestamp === 'string' && endTimestamp.includes('T') ? endTimestamp.slice(0, 10) : (r.EndDate || ''))
      const endTime = r.EndTime || r['End Time'] || (typeof endTimestamp === 'string' && endTimestamp.includes('T') ? endTimestamp.slice(11, 19) : (r.EndTime || ''))
      const workingDurationText = r.WorkingDurationText || r['Working Duration Text'] || r.Duration || ''

      return {
        ...r,
        Job_ID: jobId,
        Technicians: technicians,
        Comment: comment,
        DailyLogs: normalizedDailyLogs,
        daily_logs: normalizedDailyLogs,
        StartDate: startDate,
        StartTime: startTime,
        StartTimestamp: startTimestamp,
        EndDate: endDate,
        EndTime: endTime,
        EndTimestamp: endTimestamp,
        WorkingDurationText: workingDurationText,
      }
    })
  }, [rawJobs])

  // Live counts for Job Types filter cards
  const typeCounts = useMemo(() => {
    const counts = { ALL: 0, REPAIR: 0, DESIGN: 0, PM: 0 }
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
    const counts = { ALL: 0, IN_PROGRESS: 0, WAITING_TECH: 0, WAITING_PARTS: 0, WAITING_SUMMARY: 0, COMPLETED: 0 }
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

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const isDel = Boolean(job.IsDeleted)
      if (!showDeleted && isDel) return false
      if (showDeleted && !isDel) return false

      if (!matchesWorkOrderTypeFilter(job.JobType, typeFilters)) return false
      if (!matchesWorkOrderStatusFilter(job.Status, statusFilters)) return false
      if (!matchesWorkOrderProblemCauseFilter(job.ProblemCause || job.problem_cause, causeFilter)) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          String(job.Job_ID || job['Job ID'] || '').toLowerCase().includes(q) ||
          String(job.MC || '').toLowerCase().includes(q) ||
          String(job.KI || '').toLowerCase().includes(q) ||
          String(job.Design || '').toLowerCase().includes(q) ||
          String(job.Technicians || '').toLowerCase().includes(q) ||
          String(job.ProblemCause || job.problem_cause || '').toLowerCase().includes(q) ||
          String(job.CreatedBy || '').toLowerCase().includes(q) ||
          String(getWorkOrderDetails(job) || '').toLowerCase().includes(q) ||
          String(job.Details || '').toLowerCase().includes(q) ||
          String(job.Comment || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [allJobs, typeFilters, statusFilters, showDeleted, search, causeFilter])

  // KPI Breakdown Calculations
  const kpiStats = useMemo(() => {
    const activeNonDeleted = allJobs.filter((j) => !j.IsDeleted)
    const total = activeNonDeleted.length
    const completed = activeNonDeleted.filter((j) => getWorkOrderStatusMeta(j.Status).isCompleted).length
    const active = activeNonDeleted.filter((j) => !getWorkOrderStatusMeta(j.Status).isCompleted).length

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

    const totalOnTime = repairKpi.onTime + designKpi.onTime + pmKpi.onTime
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
      overallRate,
      repair: repairKpi,
      design: designKpi,
      pm: pmKpi,
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
        SundayDurationHours: durationResult.sundayHoursDecimal,
        SundayDurationText: durationResult.sundayDurationText,
        LostDurationHours: durationResult.lostHoursDecimal,
        LostDurationText: durationResult.lostDurationText,
        Status: 'COMPLETED',
        CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
      }

      await saveJob(payload)
      toast.success('บันทึกจบงานสำเร็จ', `${compJob.Job_ID || compJob['Job ID']} (${durationResult.netDurationText})`)
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
      setDailyLogModalOpen(false)
      setDailyLogJob(null)
    } catch (err) {
      toast.error('บันทึกความคืบหน้าไม่สำเร็จ', err.message)
    } finally {
      setDailyLogSubmitting(false)
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
      const isComp = editJob.Status === 'COMPLETED' || editJob.Status === 'เสร็จสิ้น'
      const detailVal = editJob.Comment || editJob.Details || ''
      const payload = {
        ...editJob,
        Comment: detailVal,
        Details: detailVal,
        details: detailVal,
        Problem: detailVal,
        Detail: detailVal,
        Status: editJob.Status || 'IN_PROGRESS',
        Technicians: editTechs.join(', '),
        Tech: editTechs.join(', '),
        UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
        ...(isComp && !editJob.EndDate ? {
          EndDate: format(new Date(), 'yyyy-MM-dd'),
          EndTime: new Date().toISOString(),
          EndTimestamp: new Date().toISOString(),
          DateEnd: new Date().toISOString(),
          CompletedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
        } : {}),
      }
      const prevTechs = (editJob.Technicians || editJob.Tech || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const newlyAddedTechs = editTechs.filter((t) => !prevTechs.includes(t))

      await saveJob(payload)
      toast.success('แก้ไขข้อมูลใบสั่งงานสำเร็จ', editJob.Job_ID || editJob['Job ID'])

      // Notify newly assigned technicians via LINE (Non-blocking async background)
      if (newlyAddedTechs.length > 0) {
        try {
          notifyLineWorkOrderAssigned(payload, newlyAddedTechs, { technicians, systemUsers })
            .then((res) => {
              if (res?.ok && res.sentCount > 0) {
                toast.success('แจ้งเตือน LINE สำเร็จ 📲', `ส่งไปยัง ${res.recipientsText}`)
                if (res.techsWithoutLine?.length > 0) {
                  toast.info('ช่างบางท่านยังไม่ได้ผูก LINE ID', res.techsWithoutLine.join(', '))
                }
              } else if (res?.reason === 'no_line_id') {
                toast.info('บันทึกใบสั่งงานแล้ว', `ช่างที่เพิ่ม (${res.techsWithoutLine?.join(', ') || ''}) ยังไม่ได้ผูก LINE ID`)
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
      }

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
    const id = job.id || job._id
    if (!id) return toast.error('ลบใบสั่งงานไม่สำเร็จ', 'ไม่พบ ID ของรายการ')
    if (!confirm(`ยืนยันการลบใบสั่งงาน ${job.Job_ID || job['Job ID'] || id} หรือไม่?`)) return
    try {
      await removeJob(id)
      toast.success('ลบใบสั่งงานสำเร็จ', job.Job_ID || job['Job ID'] || id)
    } catch (err) {
      toast.error('ลบใบสั่งงานไม่สำเร็จ', err.message)
    }
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
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
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md flex-shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black truncate" style={{ color: 'var(--text-900)' }}>
                  {kpiStats.total}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  งานทั้งหมด
                </div>
                <div className="stat-sub text-[10px] text-blue-500 font-bold truncate">Total Work Orders</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md flex-shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-amber-500 truncate">
                  {kpiStats.active}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  กำลังปฏิบัติงาน
                </div>
                <div className="stat-sub text-[10px] text-amber-500 font-bold truncate">In Progress</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-emerald-500 truncate">
                  {kpiStats.completed}
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  งานเสร็จสิ้นแล้ว
                </div>
                <div className="stat-sub text-[10px] text-emerald-500 font-bold truncate">Completed</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md flex-shrink-0">
                <Target size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="stat-val text-xl sm:text-2xl font-black text-purple-500 truncate">
                  {kpiStats.overallRate}%
                </div>
                <div className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-500)' }}>
                  อัตราผ่าน KPI รวม
                </div>
                <div className="stat-sub text-[10px] text-purple-500 font-bold truncate">Overall SLA Rate</div>
              </div>
            </div>
          </div>

          {/* 🌟 3-JOB-TYPE KPI PERFORMANCE BREAKDOWN 🌟 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                <Target size={16} className="text-blue-500" />
                <span>สรุปประสิทธิภาพตามประเภทงาน (KPI Breakdown by Job Type)</span>
              </h2>
              <button
                onClick={() => setKpiModalOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sliders size={13} /> ปรับเป้าหมาย SLA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Repair Card */}
              <div className="card p-5 space-y-3.5 border border-blue-500/25">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                      🛠️
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        งานแก้ไข (Repair)
                      </h3>
                      <p className="text-[11px] font-mono text-blue-500 font-semibold">
                        เป้าหมาย SLA: <b>{kpiStats.repair.targetDays} วัน</b>
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-green text-xs font-bold">
                    {kpiStats.repair.rate}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-500)' }}>
                    <span>ความสำเร็จทันเป้าหมาย (On-Time)</span>
                    <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                      {kpiStats.repair.rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${kpiStats.repair.rate}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                    <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                      {kpiStats.repair.total}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <div className="text-[10px]">ทันเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.repair.onTime}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <div className="text-[10px]">เกินเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.repair.overdue}</div>
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                  <span>ระยะเวลาเฉลี่ย:</span>
                  <b className="font-mono" style={{ color: 'var(--text-900)' }}>
                    {kpiStats.repair.avgDurationText}
                  </b>
                </div>
              </div>

              {/* 2. Design Card */}
              <div className="card p-5 space-y-3.5 border border-amber-500/25">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base">
                      🎨
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        งานปรับแบบ (Design)
                      </h3>
                      <p className="text-[11px] font-mono text-amber-500 font-semibold">
                        เป้าหมาย SLA: <b>{kpiStats.design.targetDays} วัน</b>
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-yellow text-xs font-bold">
                    {kpiStats.design.rate}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-500)' }}>
                    <span>ความสำเร็จทันเป้าหมาย (On-Time)</span>
                    <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                      {kpiStats.design.rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${kpiStats.design.rate}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                    <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                      {kpiStats.design.total}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <div className="text-[10px]">ทันเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.design.onTime}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <div className="text-[10px]">เกินเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.design.overdue}</div>
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                  <span>ระยะเวลาเฉลี่ย:</span>
                  <b className="font-mono" style={{ color: 'var(--text-900)' }}>
                    {kpiStats.design.avgDurationText}
                  </b>
                </div>
              </div>

              {/* 3. PM Card */}
              <div className="card p-5 space-y-3.5 border border-emerald-500/25">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                      🧹
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        PM / ล้างเครื่อง
                      </h3>
                      <p className="text-[11px] font-mono text-emerald-500 font-semibold">
                        เป้าหมาย SLA: <b>{kpiStats.pm.targetDays} วัน</b>
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-green text-xs font-bold">
                    {kpiStats.pm.rate}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-500)' }}>
                    <span>ความสำเร็จทันเป้าหมาย (On-Time)</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {kpiStats.pm.rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${kpiStats.pm.rate}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                    <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                      {kpiStats.pm.total}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <div className="text-[10px]">ทันเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.pm.onTime}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <div className="text-[10px]">เกินเป้า</div>
                    <div className="font-bold text-sm">{kpiStats.pm.overdue}</div>
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                  <span>ระยะเวลาเฉลี่ย:</span>
                  <b className="font-mono" style={{ color: 'var(--text-900)' }}>
                    {kpiStats.pm.avgDurationText}
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ── 📊 PROBLEM CAUSE & ROOT CAUSE ANALYTICS ─────────────── */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <PieChart size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                    <span>สรุปการวิเคราะห์สาเหตุปัญหา (Problem Cause & Root Cause Analytics)</span>
                  </h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-500)' }}>
                    สถิติแยกตาม คน (Man), เครื่องจักร (Machine), วัตถุดิบ (Material) และงานที่รอระบุสาเหตุ
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                รวม {kpiStats.total} รายการ
              </div>
            </div>

            {/* Stacked 100% Proportion Bar Card */}
            <div className="card p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-700)' }}>
                  <span>สัดส่วนสาเหตุปัญหาภาพรวม (Overall Distribution)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">100% Total Jobs</span>
              </div>

              {/* The Multi-Segment Bar */}
              <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5 shadow-inner">
                {kpiStats.causeStats.personnel.total > 0 && (
                  <div
                    className="h-full bg-amber-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.personnel.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`คน: ${kpiStats.causeStats.personnel.total} งาน (${kpiStats.causeStats.personnel.percentage}%)`}
                    onClick={() => handleDrilldownByCause('คน')}
                  />
                )}
                {kpiStats.causeStats.machine.total > 0 && (
                  <div
                    className="h-full bg-blue-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.machine.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`เครื่องจักร: ${kpiStats.causeStats.machine.total} งาน (${kpiStats.causeStats.machine.percentage}%)`}
                    onClick={() => handleDrilldownByCause('เครื่องจักร')}
                  />
                )}
                {kpiStats.causeStats.material.total > 0 && (
                  <div
                    className="h-full bg-emerald-500 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.material.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`วัตถุดิบ: ${kpiStats.causeStats.material.total} งาน (${kpiStats.causeStats.material.percentage}%)`}
                    onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                  />
                )}
                {kpiStats.causeStats.unspecified.total > 0 && (
                  <div
                    className="h-full bg-slate-400 dark:bg-slate-600 rounded-sm transition-all duration-500 hover:opacity-90 cursor-pointer"
                    style={{ width: `${(kpiStats.causeStats.unspecified.total / (kpiStats.total || 1)) * 100}%` }}
                    title={`ยังไม่ระบุ: ${kpiStats.causeStats.unspecified.total} งาน (${kpiStats.causeStats.unspecified.percentage}%)`}
                    onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                  />
                )}
              </div>

              {/* Bar Legend Labels */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('คน')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>👤 คน:</span>
                    <b className="font-mono text-amber-600 dark:text-amber-400">{kpiStats.causeStats.personnel.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.personnel.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('เครื่องจักร')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>⚙️ เครื่องจักร:</span>
                    <b className="font-mono text-blue-600 dark:text-blue-400">{kpiStats.causeStats.machine.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.machine.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>🧵 วัตถุดิบ:</span>
                    <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.material.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.material.percentage}%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 inline-block flex-shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--text-800)' }}>❓ ยังไม่ระบุ:</span>
                    <b className="font-mono text-slate-600 dark:text-slate-400">{kpiStats.causeStats.unspecified.total} งาน</b>
                    <span className="text-[11px] text-slate-400 font-mono">({kpiStats.causeStats.unspecified.percentage}%)</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  *คลิกที่สาเหตุเพื่อเจาะจงดูรายการใบสั่งงาน (Quick Drilldown)
                </div>
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Card 1: คน */}
              <div
                onClick={() => handleDrilldownByCause('คน')}
                className="card p-4 space-y-3 border border-amber-500/25 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        👤
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          คน (Personnel)
                        </h3>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          การปฏิบัติงาน / พนักงาน
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-amber text-xs font-bold font-mono">
                      {kpiStats.causeStats.personnel.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.personnel.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.personnel.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.personnel.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.personnel.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.personnel.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.personnel.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 2: เครื่องจักร */}
              <div
                onClick={() => handleDrilldownByCause('เครื่องจักร')}
                className="card p-4 space-y-3 border border-blue-500/25 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        ⚙️
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          เครื่องจักร (Machine)
                        </h3>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          อุปกรณ์ / ความสึกหรอ
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-blue text-xs font-bold font-mono">
                      {kpiStats.causeStats.machine.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.machine.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.machine.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.machine.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.machine.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.machine.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.machine.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 3: วัตถุดิบ */}
              <div
                onClick={() => handleDrilldownByCause('วัตถุดิบ')}
                className="card p-4 space-y-3 border border-emerald-500/25 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        🧵
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          วัตถุดิบ (Material)
                        </h3>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          เส้นด้าย / สารเคมี / ผ้า
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-green text-xs font-bold font-mono">
                      {kpiStats.causeStats.material.percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                      <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                        {kpiStats.causeStats.material.total}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">ทัน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.material.onTime}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <div className="text-[10px]">เกิน SLA</div>
                      <div className="font-bold text-sm">{kpiStats.causeStats.material.overdue}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-500)' }}>
                    <div className="flex justify-between">
                      <span>อัตราทันเป้า SLA:</span>
                      <b className="font-mono text-emerald-600 dark:text-emerald-400">{kpiStats.causeStats.material.rate}%</b>
                    </div>
                    <div className="flex justify-between">
                      <span>ระยะเวลาเฉลี่ย:</span>
                      <b className="font-mono" style={{ color: 'var(--text-900)' }}>{kpiStats.causeStats.material.avgDurationText}</b>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูรายการงาน ({kpiStats.causeStats.material.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Card 4: ยังไม่ระบุสาเหตุ (Pending) */}
              <div
                onClick={() => handleDrilldownByCause('UNSPECIFIED')}
                className="card p-4 space-y-3 border border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/30"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                        ❓
                      </div>
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
                          ยังไม่ระบุ (Pending)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          รอการระบุสาเหตุ
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {kpiStats.causeStats.unspecified.percentage}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 font-medium">งานที่ยังไม่ได้ระบุสาเหตุ</div>
                    <div className="font-black text-xl text-slate-700 dark:text-slate-300 mt-0.5">
                      {kpiStats.causeStats.unspecified.total} <span className="text-xs font-normal">รายการ</span>
                    </div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                      {kpiStats.causeStats.unspecified.total > 0
                        ? '⚠️ ต้องติดตามช่างเพื่อสรุปสาเหตุ'
                        : '✅ บันทึกสาเหตุครบทุกงาน'}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    ช่วยหัวหน้างานติดตามใบสั่งงานที่เสร็จสิ้นหรือกำลังทำอยู่แต่ยังไม่ระบุสาเหตุ
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>ดูงานค้างระบุ ({kpiStats.causeStats.unspecified.total})</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>

          {/* Operational Metrics by User */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                <UserCheck size={16} className="text-emerald-500" />
                <span>สถิติการทำรายการแยกตามผู้ปฏิบัติงาน (Operational Metrics)</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
              {kpiStats.userMetrics.map((u, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--text-900)' }}>
                      {u.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-500)' }}>
                      รายการที่ดูแล
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">
                    {u.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: WORK ORDERS & CREATE WORK ORDER ──────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'records' && (
        <div className="space-y-6">
          {/* WORK ORDER ENTRY FORM (เปิดใบสั่งงาน) */}
          {canAdd && (
            <div className="card p-5 space-y-4 border border-blue-500/25 bg-blue-500/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                    <Plus size={16} className="text-blue-500" />
                    <span>บันทึกเริ่มงานซ่อม / เปิดใบสั่งงาน (Create Work Order)</span>
                  </h2>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-500)' }}>
                    กรอกข้อมูลเพื่อเริ่มงาน ระบบจะสร้างรหัส Job ID และจับเวลาการทำงานให้อัตโนมัติ
                  </div>
                </div>
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  ผู้บันทึก: <b className="text-blue-600 dark:text-blue-400">{user?.username || user?.full_name || 'ช่างประจำกะ'}</b>
                </div>
              </div>

              <form onSubmit={handleStartJob} className="space-y-4 text-xs">
                {/* 1. M/C, KI, Design, Roll No */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label">รหัสเครื่อง (M/C) *</label>
                    <input
                      type="text"
                      placeholder="เช่น MC-01"
                      value={mc}
                      onChange={(e) => setMc(e.target.value)}
                      className="input font-mono font-bold uppercase"
                      required
                    />
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
                    <label className="label">แบบงาน (Design)</label>
                    <input
                      type="text"
                      placeholder="ระบุแบบงาน / ลายผ้า"
                      value={design}
                      onChange={(e) => setDesign(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">เลขม้วน (Roll No)</label>
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
                    <label className="label">ประเภทงาน (Job Type)</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="select font-semibold"
                    >
                      <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                      <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                      <option value="PM">🧹 PM / ล้างเครื่อง</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">สาเหตุปัญหา (Root Cause)</label>
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
                    <label className="label">สถานะ (Status)</label>
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto">
                    {technicians.filter((t) => t.Status !== 'INACTIVE').map((tech, idx) => {
                      const isChecked = selectedTechs.includes(tech.Name)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTechSelection(tech.Name)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                            isChecked
                              ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
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

                {/* Submit Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingStart}
                    className="btn-primary w-full sm:w-auto"
                  >
                    <Send size={14} />
                    <span>{submittingStart ? 'กำลังบันทึก...' : 'ยืนยันเปิดใบสั่งงาน (เริ่มงาน)'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="card p-3.5 sm:p-4 space-y-3 text-xs shadow-xs">
            {/* Top Row: Search Input + Deleted Items Checkbox + Reset Button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex-1 min-w-[220px]">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="ค้นหา Job ID, M/C, KI, ช่าง, ผู้ทำรายการ..."
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors font-bold text-xs shadow-2xs"
                  title="พิมพ์รายงานใบสั่งงานตามเงื่อนไขที่กรองบนหน้าเว็บ"
                >
                  <Printer size={13} />
                  <span>พิมพ์รายงาน</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-200/80 dark:bg-blue-900/70 text-[10px]">
                    {filteredJobs.length}
                  </span>
                </button>

                {(typeFilters.length > 0 || statusFilters.length > 0 || Boolean(causeFilter) || search.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilters([])
                      setStatusFilters([])
                      setCauseFilter('')
                      setSearch('')
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-bold text-xs"
                    title="ล้างตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น"
                  >
                    <RotateCcw size={12} />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}

                <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>รายการที่ลบ</span>
                </label>
              </div>
            </div>

            {/* Filter Cards Section */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
              {/* Row 1: ประเภทงาน (Job Type Cards) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 min-w-[70px] flex-shrink-0">
                  <Tag size={13} className="text-blue-500" />
                  <span>ประเภท:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {/* All Types Card */}
                  <button
                    type="button"
                    onClick={() => setTypeFilters([])}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      typeFilters.length === 0
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>ทุกประเภท</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        typeFilters.length === 0
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {typeCounts.ALL}
                    </span>
                  </button>

                  {/* Individual Job Type Cards */}
                  {WORK_ORDER_TYPE_OPTIONS.map((opt) => {
                    const isSelected = typeFilters.includes(opt.value)
                    const count = typeCounts[opt.value] || 0
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleTypeFilter(opt.value)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? opt.activeClass
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        title="คลิกเพื่อเลือกหรือยกเลิก (เลือกได้มากกว่า 1 ประเภท)"
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            isSelected
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Row 2: สถานะงาน (Status Cards) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 min-w-[70px] flex-shrink-0">
                  <Clock size={13} className="text-amber-500" />
                  <span>สถานะ:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {/* All Statuses Card */}
                  <button
                    type="button"
                    onClick={() => setStatusFilters([])}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      statusFilters.length === 0
                        ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>ทั้งหมด</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        statusFilters.length === 0
                          ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {statusCounts.ALL}
                    </span>
                  </button>

                  {/* Individual Status Cards */}
                  {WORK_ORDER_STATUS_OPTIONS.map((opt) => {
                    const isSelected = statusFilters.includes(opt.value)
                    const count = statusCounts[opt.value] || 0
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleStatusFilter(opt.value)}
                        className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? opt.activeClass
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        title="คลิกเพื่อเลือกหรือยกเลิก (เลือกได้มากกว่า 1 สถานะ)"
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            isSelected
                              ? 'bg-white/25 text-white'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Row 3: สาเหตุปัญหา (Problem Cause Cards) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 min-w-[70px] flex-shrink-0">
                  <PieChart size={13} className="text-indigo-500" />
                  <span>สาเหตุ:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {/* All Causes Card */}
                  <button
                    type="button"
                    onClick={() => setCauseFilter('')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      !causeFilter
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>ทุกสาเหตุ</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        !causeFilter
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {causeCounts.ALL}
                    </span>
                  </button>

                  {/* 1. คน */}
                  <button
                    type="button"
                    onClick={() => toggleCauseFilter('คน')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      causeFilter === 'คน'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {causeFilter === 'คน' && <Check size={12} strokeWidth={3} />}
                    <span>👤</span>
                    <span>คน</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        causeFilter === 'คน'
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {causeCounts.คน}
                    </span>
                  </button>

                  {/* 2. เครื่องจักร */}
                  <button
                    type="button"
                    onClick={() => toggleCauseFilter('เครื่องจักร')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      causeFilter === 'เครื่องจักร'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {causeFilter === 'เครื่องจักร' && <Check size={12} strokeWidth={3} />}
                    <span>⚙️</span>
                    <span>เครื่องจักร</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        causeFilter === 'เครื่องจักร'
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {causeCounts.เครื่องจักร}
                    </span>
                  </button>

                  {/* 3. วัตถุดิบ */}
                  <button
                    type="button"
                    onClick={() => toggleCauseFilter('วัตถุดิบ')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      causeFilter === 'วัตถุดิบ'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {causeFilter === 'วัตถุดิบ' && <Check size={12} strokeWidth={3} />}
                    <span>🧵</span>
                    <span>วัตถุดิบ</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        causeFilter === 'วัตถุดิบ'
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {causeCounts.วัตถุดิบ}
                    </span>
                  </button>

                  {/* 4. ยังไม่ระบุ */}
                  <button
                    type="button"
                    onClick={() => toggleCauseFilter('UNSPECIFIED')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border text-xs min-h-[32px] cursor-pointer active:scale-[0.98] ${
                      causeFilter === 'UNSPECIFIED'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {causeFilter === 'UNSPECIFIED' && <Check size={12} strokeWidth={3} />}
                    <span>❓</span>
                    <span>ยังไม่ระบุ</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        causeFilter === 'UNSPECIFIED'
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {causeCounts.UNSPECIFIED}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Cause Filter Banner */}
            {causeFilter && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-200 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold">⚡ กำลังกรองตามสาเหตุปัญหา:</span>
                  <span className="px-2 py-0.5 rounded-lg font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-indigo-500/40 shadow-xs">
                    {causeFilter === 'UNSPECIFIED' ? '❓ ยังไม่ระบุ (Pending)' : getProblemCauseMeta(causeFilter)?.fullLabel || causeFilter}
                  </span>
                  <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                    (พบ {filteredJobs.length} รายการ)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCauseFilter('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-950 dark:text-indigo-100 font-bold text-xs transition-colors cursor-pointer"
                  title="ยกเลิกตัวกรองสาเหตุปัญหา"
                >
                  <X size={13} />
                  <span>ยกเลิกกรองสาเหตุ</span>
                </button>
              </div>
            )}
          </div>

          {/* ── WORK ORDERS PRESENTATION (Tri-View ADR-0002) ─────────── */}
          {/* 1. Mobile View: Single-Column Work Order Cards */}
          {isMobile && (
            <div className="space-y-3 pb-24">
              {filteredJobs.map((job, idx) => (
                <WorkOrderCard
                  key={job.id || idx}
                  job={job}
                  kpiTargets={kpiTargets}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onInterruption={openInterruptionModal}
                  onComplete={openCompleteModal}
                  onPrint={openPrintModal}
                  onEdit={openEditModal}
                  onDelete={handleDeleteJob}
                  onDailyLog={openDailyLogModal}
                />
              ))}

              {filteredJobs.length === 0 && (
                <div className="card p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                    {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                  </p>
                </div>
              )}

              {/* Floating Action Button (FAB) for Mobile Work Order Creation */}
              {canAdd && (
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                  title="สร้างใบสั่งงานใหม่"
                  aria-label="สร้างใบสั่งงานใหม่"
                >
                  <Plus size={26} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          {/* 2. Tablet View: 2-Column Responsive Card Grid */}
          {isTablet && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredJobs.map((job, idx) => (
                  <WorkOrderCard
                    key={job.id || idx}
                    job={job}
                    kpiTargets={kpiTargets}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onInterruption={openInterruptionModal}
                    onComplete={openCompleteModal}
                    onPrint={openPrintModal}
                    onEdit={openEditModal}
                    onDelete={handleDeleteJob}
                    onDailyLog={openDailyLogModal}
                  />
                ))}
              </div>

              {filteredJobs.length === 0 && (
                <div className="card p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList size={36} className="mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">
                    {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Desktop View: Full High-Density Data Table */}
          {isDesktop && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>M/C</th>
                    <th>KI</th>
                    <th>Design</th>
                    <th>เลขม้วน</th>
                    <th>ประเภท</th>
                    <th>สาเหตุปัญหา</th>
                    <th>รายละเอียด</th>
                    <th>สถานะ</th>
                    <th>ช่างผู้ปฏิบัติงาน</th>
                    <th>เวลาเริ่ม</th>
                    <th>ระยะเวลา</th>
                    <th>SLA Performance</th>
                    <th>ผู้บันทึก</th>
                    <th className="text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, idx) => {
                    const statusMeta = getWorkOrderStatusMeta(job.Status)
                    const isCompleted = statusMeta.isCompleted
                    const sla = calculateSlaPerformance(job, kpiTargets)
                    const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`
                    const detailsDisplay = getWorkOrderDetails(job)
                    const dailyLogs = getJobDailyLogs(job)
                    const latestDailyLog = getLatestDailyLog(job)

                    return (
                      <tr key={job.id || idx}>
                        {/* Job ID */}
                        <td className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {jobIdDisplay}
                        </td>

                        {/* M/C */}
                        <td className="font-bold" style={{ color: 'var(--text-900)' }}>
                          {job.MC || '—'}
                        </td>

                        {/* KI */}
                        <td className="font-mono font-semibold" style={{ color: 'var(--text-700)' }}>
                          {job.KI || '—'}
                        </td>

                        {/* Design */}
                        <td className="max-w-[140px] truncate" style={{ color: 'var(--text-600)' }}>
                          {job.Design || '—'}
                        </td>

                        {/* Roll No */}
                        <td className="font-mono" style={{ color: 'var(--text-700)' }}>
                          {job.RollNo || job.roll_no || '—'}
                        </td>

                        {/* Job Type */}
                        <td>
                          <span
                            className={`badge ${
                              job.JobType === 'DESIGN'
                                ? 'badge-purple'
                                : job.JobType === 'PM'
                                ? 'badge-yellow'
                                : 'badge-blue'
                            }`}
                          >
                            {job.JobType === 'DESIGN' ? '🎨 ปรับแบบ' : job.JobType === 'PM' ? '🧹 PM' : '🛠️ แก้ไข'}
                          </span>
                        </td>

                        {/* สาเหตุปัญหา */}
                        <td>
                          {job.ProblemCause || job.problem_cause ? (
                            (() => {
                              const meta = getProblemCauseMeta(job.ProblemCause || job.problem_cause)
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}
                                  title={`สาเหตุปัญหา: ${meta.label}`}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              )
                            })()
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* รายละเอียด */}
                        <td className="max-w-[240px] min-w-[130px]" style={{ color: 'var(--text-700)' }}>
                          <div className="truncate text-xs font-medium" title={detailsDisplay}>
                            {detailsDisplay}
                          </div>
                          {latestDailyLog && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                openDailyLogModal(job)
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 cursor-pointer transition-colors max-w-full truncate"
                              title={`อัปเดตงานล่าสุด (${latestDailyLog.date}): ${latestDailyLog.details} (คลิกเพื่อดูประวัติหรืออัปเดต)`}
                            >
                              <span className="flex-shrink-0">📝 {latestDailyLog.date?.slice(5) || latestDailyLog.date}:</span>
                              <span className="truncate font-normal text-slate-600 dark:text-slate-300">{latestDailyLog.details}</span>
                              {dailyLogs.length > 1 && (
                                <span className="px-1 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-[9px] flex-shrink-0">
                                  +{dailyLogs.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* สถานะ */}
                        <td>
                          {canEdit && !job.IsDeleted ? (
                            <select
                              value={statusMeta.value}
                              onChange={(e) => handleQuickStatusChange(job, e.target.value)}
                              className={`badge ${statusMeta.badgeClass} cursor-pointer font-bold border-0 pr-5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                              title="คลิกเพื่อเปลี่ยนสถานะใบสั่งงาน"
                            >
                              {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                                >
                                  {opt.icon} {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`badge ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          )}
                        </td>

                        {/* Technicians */}
                        <td className="max-w-[180px] truncate" style={{ color: 'var(--text-700)' }}>
                          {job.Technicians || '—'}
                        </td>

                        {/* Start Time */}
                        <td className="text-xs font-mono" style={{ color: 'var(--text-500)' }}>
                          {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}` : '—'}
                        </td>

                        {/* Duration */}
                        <td className="font-mono" style={{ color: isCompleted ? 'var(--text-900)' : 'var(--text-400)' }}>
                          <div className="font-bold text-xs">
                            {job.WorkingDurationText || (isCompleted ? `${job.WorkingHoursDecimal} ชม.` : 'กำลังจับเวลา...')}
                          </div>
                          {sla.sundayHoursDecimal > 0 && (
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 flex items-center gap-0.5 mt-0.5 font-semibold">
                              <span>🏖️ หักวันอาทิตย์ {sla.sundayDurationText}</span>
                            </div>
                          )}
                          {sla.lostHoursDecimal > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
                              <Clock size={10} />
                              <span>หักงานแทรก {sla.lostDurationText}</span>
                            </div>
                          )}
                          {sla.activeInterruption && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse mt-0.5">
                              ⏸️ กำลังพักงาน
                            </span>
                          )}
                        </td>

                        {/* SLA Performance */}
                        <td>
                          <span className={`badge ${sla.badgeClass}`}>
                            {sla.label}
                          </span>
                        </td>

                        {/* Created By */}
                        <td className="text-xs" style={{ color: 'var(--text-500)' }}>
                          {job.CreatedBy || '—'}
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Interruption / Lost Time Button */}
                            {!job.IsDeleted && (
                              <button
                                type="button"
                                onClick={() => openInterruptionModal(job)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  sla.activeInterruption
                                    ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30'
                                    : sla.lostHoursDecimal > 0
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600'
                                }`}
                                title={sla.activeInterruption ? `กำลังทำงานแทรก: ${sla.activeInterruption.task_name} (คลิกเพื่อจบงานแทรก)` : 'บันทึกงานแทรก / เวลาที่สูญเสียไป'}
                              >
                                {sla.activeInterruption ? (
                                  <>
                                    <Pause size={13} />
                                    <span className="hidden sm:inline">พักงานอยู่</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={13} />
                                    {sla.lostHoursDecimal > 0 && <span className="text-[10px]">({sla.lostHoursDecimal}ช.)</span>}
                                  </>
                                )}
                              </button>
                            )}

                            {/* Complete Job Button (if in progress) */}
                            {!isCompleted && !job.IsDeleted && canEdit && (
                              <button
                                onClick={() => openCompleteModal(job)}
                                className="btn-success px-2.5 py-1 text-xs"
                                title="บันทึกจบงาน"
                              >
                                <CheckCircle2 size={13} />
                                <span>จบงาน</span>
                              </button>
                            )}

                            {/* Daily Work Progress Update Button */}
                            {!job.IsDeleted && canEdit && (
                              <button
                                type="button"
                                onClick={() => openDailyLogModal(job)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  dailyLogs.length > 0
                                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600'
                                }`}
                                title="อัปเดตงานประจำวัน / บันทึกจบวัน (ความคืบหน้า & สถานะ)"
                              >
                                <CalendarClock size={14} />
                                <span className="hidden xl:inline text-[11px]">อัปเดต</span>
                                {dailyLogs.length > 0 && (
                                  <span className="text-[10px] font-mono px-1 rounded-full bg-indigo-600 text-white">
                                    {dailyLogs.length}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Print A4 Report */}
                            <button
                              onClick={() => openPrintModal(job)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                              title="พิมพ์ใบสั่งงาน A4"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Edit Job */}
                            {!job.IsDeleted && canEdit && (
                              <button
                                onClick={() => openEditModal(job)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors"
                                title="แก้ไขใบสั่งงาน"
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {/* Delete Job */}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteJob(job)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="ลบใบสั่งงาน"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={15} className="text-center py-12 text-slate-400">
                        {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: TECHNICIANS REGISTRY ──────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'technicians' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-900)' }}>
                ทะเบียนช่างปรับ & ซ่อมบำรุง (Technicians Registry)
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-500)' }}>
                รายชื่อช่าง เลือกระดับทักษะ และความถนัดเฉพาะทาง
              </p>
            </div>
            {canAdd && (
              <button onClick={() => openAddTech()} className="btn-primary">
                <UserPlus size={15} />
                <span>เพิ่มช่างใหม่</span>
              </button>
            )}
          </div>

          {/* Quick-Add Panel for Users logged in with LINE who aren't in Technicians yet */}
          {unregisteredLineUsers.length > 0 && canAdd && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    พบบัญชี LINE Login ที่ยังไม่ได้เพิ่มในทะเบียนช่าง ({unregisteredLineUsers.length} บัญชี)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  คลิก "+ เพิ่มเป็นช่าง" เพื่อดึงชื่อและ LINE User ID ให้อัตโนมัติ
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {unregisteredLineUsers.map((u) => {
                  const dispName = u.full_name || u.line_display_name || u.username
                  return (
                    <div
                      key={u.id || u.line_user_id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {u.line_picture_url ? (
                            <img src={u.line_picture_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            dispName[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {dispName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            LINE: {u.line_display_name || u.username}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddTech(u)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 shrink-0 transition-colors"
                      >
                        + เพิ่มเป็นช่าง
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {technicians.length === 0 ? (
            <div className="card p-12 text-center space-y-4 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
                <UserCheck size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  ยังไม่มีรายชื่อในทะเบียนช่าง
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  คุณสามารถเพิ่มรายชื่อช่าง (เช่น ช.ต๋อง, ช.หนุ่ม) พร้อมระบุ LINE ID และ Telegram ID เพื่อรับการแจ้งเตือนงานซ่อมโดยตรง
                </p>
              </div>
              <div>
                <button
                  onClick={() => openAddTech()}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-md text-sm font-bold"
                >
                  <UserPlus size={16} />
                  <span>+ เพิ่มช่างคนแรก</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicians.map((tech, idx) => {
                const isActive = tech.Status !== 'INACTIVE'
                const specList = tech.Specialization
                  ? String(tech.Specialization).split(',').map((s) => s.trim()).filter(Boolean)
                  : []

                return (
                  <div
                    key={tech.id || tech.Technician_ID || idx}
                    className="card p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-black font-mono overflow-hidden">
                          {tech.Avatar_URL ? (
                            <img src={tech.Avatar_URL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (tech?.Name || '?')[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                            {tech.Name}
                          </h3>
                          <div className="text-xs font-mono text-slate-500 mt-0.5">
                            {tech.Phone || '—'}
                          </div>
                        </div>
                      </div>

                      <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                        {isActive ? 'พร้อมทำงาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>

                    {/* Visual Skill Level Bar */}
                    <TechSkillBar skillLevel={tech.SkillLevel} />

                    {/* Specializations Tags */}
                    <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 block">ความถนัด:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {specList.length > 0 ? (
                          specList.map((item, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              <span>{item}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">งานซ่อมบำรุงทั่วไป</span>
                        )}
                      </div>
                    </div>

                    {/* Notification IDs Badges */}
                    <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-500 block">การแจ้งเตือนงานซ่อม:</span>
                      <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-sans">
                            <span>🟢 LINE ID</span>
                          </span>
                          <span className="truncate max-w-[170px] text-right font-medium text-slate-700 dark:text-slate-200">
                            {tech.Line_ID || tech.line_id || <span className="text-slate-400 font-sans italic">ยังไม่ได้ระบุ</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1 font-sans">
                            <span>✈️ Telegram</span>
                          </span>
                          <span className="truncate max-w-[170px] text-right font-medium text-slate-700 dark:text-slate-200">
                            {tech.Telegram_ID || tech.telegram_id || <span className="text-slate-400 font-sans italic">ยังไม่ได้ระบุ</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openEditTech(tech)}
                            className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                          >
                            <Pencil size={13} />
                            <span>แก้ไขข้อมูล</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteTech(tech)}
                            className="btn-outline px-2.5 py-1.5 text-xs flex items-center gap-1 font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                            title="ลบรายชื่อช่าง"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: KPI & SLA SETTINGS ────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {currentTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* KPI SLA Target Configuration */}
          <div className="card p-6 space-y-5 border border-blue-500/25">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                  <Target size={18} className="text-blue-500" />
                  <span>ตั้งค่าเป้าหมาย KPI (SLA Target Days)</span>
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-500)' }}>
                  กำหนดจำนวนวันเป้าหมายสำหรับงานแต่ละประเภทเพื่อนำไปประเมินความสำเร็จ
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">🛠️ เป้าหมายงานแก้ไข (Repair) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.REPAIR}
                    onChange={(e) => setDraftKpi({ ...draftKpi, REPAIR: parseFloat(e.target.value) || 1.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div>
                <label className="label">🎨 เป้าหมายงานปรับแบบ (Design) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.DESIGN}
                    onChange={(e) => setDraftKpi({ ...draftKpi, DESIGN: parseFloat(e.target.value) || 3.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div>
                <label className="label">🧹 เป้าหมายงาน PM / ล้างเครื่อง (PM) (จำนวนวัน)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draftKpi.PM}
                    onChange={(e) => setDraftKpi({ ...draftKpi, PM: parseFloat(e.target.value) || 2.0 })}
                    className="input font-mono font-bold text-sm"
                  />
                  <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveKpiSettings}
                  className="btn-primary w-full py-2.5"
                >
                  <Check size={14} />
                  <span>บันทึกเป้าหมาย KPI ทั้งหมด</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Information Card */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-extrabold pb-3 border-b border-slate-200 dark:border-slate-800" style={{ color: 'var(--text-900)' }}>
              ข้อมูลระบบ & สิทธิ์การใช้งาน
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>ผู้ใช้งานปัจจุบัน</span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-900)' }}>
                  {user?.username || user?.full_name || 'Admin'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>ระบบฐานข้อมูลหลัก</span>
                <span className="badge badge-green">Supabase PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>Google Sheets Export Sync</span>
                <span className="badge badge-blue">พร้อมใช้งาน</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <span style={{ color: 'var(--text-500)' }}>SLA Calculation Engine</span>
                <span className="badge badge-purple">Active (Server Timestamp)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODALS SECTION ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* 1. Complete Job Modal */}
      {completeModalOpen && compJob && (
        <Modal
          open={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="บันทึกจบงานซ่อม (Complete Job)"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>รหัสงาน (Job ID):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {compJob.Job_ID || compJob['Job ID']}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>เครื่องจักร & งาน:</span>
                <span className="font-bold" style={{ color: 'var(--text-900)' }}>
                  {compJob.MC} (KI: {compJob.KI})
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>เวลาเริ่มงาน:</span>
                <span className="font-mono" style={{ color: 'var(--text-700)' }}>
                  {compJob.StartDate} {compJob.StartTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">วันที่จบงาน *</label>
                <input
                  type="date"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  className="input font-mono"
                  required
                />
              </div>
              <div>
                <label className="label">เวลาจบงาน *</label>
                <input
                  type="time"
                  value={compEndTime}
                  onChange={(e) => setCompEndTime(e.target.value)}
                  className="input font-mono"
                  required
                />
              </div>
            </div>

            {/* Duration Breakdown with Sunday & Interruption Deduction */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">เวลารวมทั้งหมด (Gross):</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{compCalcDuration.grossDurationText || '—'}</span>
              </div>
              {compCalcDuration.sundayMinutes > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
                    <span>🏖️ หักวันอาทิตย์ (วันหยุดโรงงาน):</span>
                  </span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    - {compCalcDuration.sundayDurationText}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  <Clock size={12} />
                  <span>เวลาที่สูญเสียไป (งานแทรก):</span>
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  - {compCalcDuration.lostDurationText || '0 นาที'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>👉 เวลาทำงานสุทธิ (ใช้คิด KPI):</span>
                </span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {compCalcDuration.netDurationText || compCalcDuration.durationText}
                </span>
              </div>
            </div>

            {/* Quick Button to manage interruptions right inside complete modal */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => openInterruptionModal(compJob)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
              >
                <Clock size={13} />
                <span>+ จัดการงานแทรก / เวลาที่เสียไป</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCompleteJob}
                disabled={compSubmitting}
                className="btn-success"
              >
                <Check size={14} />
                <span>{compSubmitting ? 'กำลังบันทึก...' : 'ยืนยันจบงาน'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Edit Job Modal */}
      {editModalOpen && editJob && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`แก้ไขใบสั่งงาน ${editJob.Job_ID || editJob['Job ID']}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">รหัสเครื่อง (M/C)</label>
                <input
                  type="text"
                  value={editJob.MC || ''}
                  onChange={(e) => setEditJob({ ...editJob, MC: e.target.value })}
                  className="input font-mono font-bold"
                />
              </div>
              <div>
                <label className="label">รหัสงาน (KI)</label>
                <input
                  type="text"
                  value={editJob.KI || ''}
                  onChange={(e) => setEditJob({ ...editJob, KI: e.target.value })}
                  className="input font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">แบบงาน (Design)</label>
                <input
                  type="text"
                  value={editJob.Design || ''}
                  onChange={(e) => setEditJob({ ...editJob, Design: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">เลขม้วน (Roll No)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editJob.RollNo || editJob.roll_no || ''}
                  onChange={(e) => setEditJob({ ...editJob, RollNo: e.target.value, roll_no: e.target.value })}
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="label">สาเหตุปัญหา (Root Cause)</label>
                <select
                  value={editJob.ProblemCause || editJob.problem_cause || ''}
                  onChange={(e) => setEditJob({ ...editJob, ProblemCause: e.target.value })}
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
              <div>
                <label className="label">ประเภทงาน (Job Type)</label>
                <select
                  value={editJob.JobType || 'REPAIR'}
                  onChange={(e) => setEditJob({ ...editJob, JobType: e.target.value })}
                  className="select font-semibold"
                >
                  <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                  <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                  <option value="PM">🧹 PM / ล้างเครื่อง</option>
                </select>
              </div>
              <div>
                <label className="label">สถานะ (Status)</label>
                <select
                  value={getWorkOrderStatusMeta(editJob.Status).value}
                  onChange={(e) => setEditJob({ ...editJob, Status: e.target.value })}
                  className="select font-semibold"
                >
                  {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.fullLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">รายละเอียด / อาการเสียงานซ่อม</label>
              <input
                type="text"
                placeholder="ระบุอาการเสีย หรือรายละเอียดการปรับแต่ง..."
                value={editJob.Comment || editJob.Details || editJob.details || editJob.Problem || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setEditJob({
                    ...editJob,
                    Comment: val,
                    Details: val,
                    details: val,
                    Problem: val,
                    Detail: val,
                  })
                }}
                className="input"
              />
            </div>

            {/* Technicians Checklist */}
            <div className="space-y-1.5">
              <label className="label">ช่างปรับผู้ปฏิบัติงาน</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                {technicians.map((t, idx) => {
                  const isChecked = editTechs.includes(t.Name)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEditTechSelection(t.Name)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                        isChecked
                          ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{t.Name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleEditJob}
                disabled={editSubmitting}
                className="btn-primary"
              >
                <Check size={14} />
                <span>{editSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Add / Edit Technician Modal */}
      {techModalOpen && (
        <Modal
          open={techModalOpen}
          onClose={() => setTechModalOpen(false)}
          title={editingTechId ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มข้อมูลช่าง'}
        >
          <div className="space-y-4 text-xs pb-1">
            {/* User Quick-Select from System Users (LINE Login) */}
            {systemUsers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-slate-50 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900/60 border border-emerald-500/25 dark:border-emerald-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="label font-bold flex items-center gap-1.5 mb-0 text-slate-800 dark:text-slate-200">
                    <span className="text-emerald-500 font-bold">🟢</span>
                    <span>เลือกจากรายชื่อผู้ใช้งาน (ดึงชื่อ & LINE User ID อัตโนมัติ)</span>
                  </label>
                  {techForm.Line_ID && (
                    <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      ✓ ผูก LINE ID แล้ว
                    </span>
                  )}
                </div>

                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectUserForTech(e.target.value)}
                  className="select text-xs font-medium"
                >
                  <option value="">-- พิมพ์เอง หรือเลือกผู้ใช้เพื่อเติมข้อมูลอัตโนมัติ --</option>
                  {systemUsers.map((u) => {
                    const hasLine = Boolean(u.line_user_id)
                    const isRegistered = technicians.some(
                      (t) =>
                        (t.id !== editingTechId && t.Technician_ID !== editingTechId) &&
                        ((t.Line_ID && t.Line_ID === u.line_user_id) ||
                         (t.Name && t.Name.toLowerCase() === (u.full_name || u.line_display_name || '').toLowerCase()))
                    )
                    const label = `${u.full_name || u.line_display_name || u.username} (${u.role || 'user'})${hasLine ? ' [🟢 LINE]' : ''}${isRegistered ? ' (มีในทะเบียนช่างแล้ว)' : ''}`
                    return (
                      <option key={u.id || u.username} value={u.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[10px] text-slate-400">
                  เมื่อเลือกผู้ใช้ ระบบจะดึงชื่อและ LINE User ID มากรอกให้อัตโนมัติทันที
                </p>
              </div>
            )}

            {/* 1. Name */}
            <div>
              <label className="label font-bold">ชื่อช่าง *</label>
              <input
                type="text"
                placeholder="เช่น ช.หนุ่ม"
                value={techForm.Name}
                onChange={(e) => setTechForm({ ...techForm, Name: e.target.value })}
                className="input"
                required
              />
            </div>

            {/* 2. Phone */}
            <div>
              <label className="label font-bold">เบอร์ติดต่อ</label>
              <input
                type="text"
                placeholder="เช่น 081-234-5678"
                value={techForm.Phone}
                onChange={(e) => setTechForm({ ...techForm, Phone: e.target.value })}
                className="input font-mono"
              />
            </div>

            {/* 3. Skill Level (2x2 Grid) */}
            <div className="space-y-2">
              <label className="label font-bold flex items-center gap-1.5">
                <span className="text-blue-500">🎗️</span>
                <span>ระดับทักษะช่าง (Skill Level) *</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {UI_SKILL_LEVELS.map((s) => {
                  const isSelected = (techForm.SkillLevel || 'Junior').toLowerCase() === s.value.toLowerCase()
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTechForm({ ...techForm, SkillLevel: s.value })}
                      className={`p-3 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>{s.icon}</span>
                        <span className={isSelected ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>{s.label}</span>
                      </div>
                      <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 pl-5">
                        {s.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Specialization (2x2 Grid Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label font-bold flex items-center gap-1.5 mb-0">
                  <span className="text-blue-500">🔧</span>
                  <span>ความถนัดเฉพาะทาง (Specialization)</span>
                </label>
                <span className="text-[10px] text-slate-400">คลิกเลือกได้มากกว่า 1 ทักษะ</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {UI_SPECIALIZATIONS.map((spec) => {
                  const selectedSpecs = (techForm.Specialization || '')
                    .split(',')
                    .map((str) => str.trim())
                    .filter(Boolean)
                  const isSelected = selectedSpecs.some(
                    (sel) => sel.toLowerCase().includes(spec.value.toLowerCase()) || spec.value.toLowerCase().includes(sel.toLowerCase())
                  )
                  return (
                    <button
                      key={spec.value}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? selectedSpecs.filter(
                              (sel) => !sel.toLowerCase().includes(spec.value.toLowerCase()) && !spec.value.toLowerCase().includes(sel.toLowerCase())
                            )
                          : [...selectedSpecs, spec.value]
                        setTechForm({ ...techForm, Specialization: next.join(', ') })
                      }}
                      className={`py-2.5 px-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all border ${
                        isSelected
                          ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{spec.icon}</span>
                      <span>{spec.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Notification Identifiers (LINE & Telegram) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🔔 การแจ้งเตือนใบสั่งงานซ่อม (Direct Notifications)</span>
              </div>
              
              {/* LINE User ID */}
              <div>
                <label className="label font-bold flex items-center gap-1.5 mb-1">
                  <span className="text-emerald-500 font-bold">🟢</span>
                  <span>LINE User ID (id:line)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น U66f2b207af94e739c10a3cf937af2965"
                  value={techForm.Line_ID || ''}
                  onChange={(e) => setTechForm({ ...techForm, Line_ID: e.target.value })}
                  className="input font-mono text-xs"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  ระบบจะยิงใบสั่งงานซ่อมตรงเข้า LINE ช่างคนนี้ทันทีเมื่อหัวหน้ากดมอบหมาย
                </p>
              </div>

              {/* Telegram Chat ID */}
              <div>
                <label className="label font-bold flex items-center gap-1.5 mb-1">
                  <span className="text-sky-500 font-bold">✈️</span>
                  <span>Telegram Chat ID (id:telegram)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 8207474130"
                  value={techForm.Telegram_ID || ''}
                  onChange={(e) => setTechForm({ ...techForm, Telegram_ID: e.target.value })}
                  className="input font-mono text-xs"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  ระบบจะยิงใบสั่งงานซ่อมตรงเข้า Telegram ช่างคนนี้ทันทีเมื่อหัวหน้ากดมอบหมาย
                </p>
              </div>
            </div>

            {/* 6. Status */}
            <div>
              <label className="label font-bold">สถานะ</label>
              <select
                value={techForm.Status || 'ACTIVE'}
                onChange={(e) => setTechForm({ ...techForm, Status: e.target.value })}
                className="select font-semibold"
              >
                <option value="ACTIVE">ใช้งานปกติ (Active)</option>
                <option value="INACTIVE">พักงาน/ลาออก (Inactive)</option>
              </select>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTechModalOpen(false)}
                className="btn-outline px-4"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveTech}
                className="btn-primary px-5"
              >
                <Check size={14} />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Quick KPI Settings Modal */}
      {kpiModalOpen && (
        <Modal
          open={kpiModalOpen}
          onClose={() => setKpiModalOpen(false)}
          title="ปรับแต่งเป้าหมาย KPI SLA แต่ละประเภทงาน"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed">
              💡 กำหนดจำนวนวันเป้าหมาย (SLA Target Days) สำหรับงานแต่ละประเภท ระบบจะนำไปคำนวณอัตราความสำเร็จบนแดชบอร์ดทันที
            </div>

            <div>
              <label className="label">🛠️ งานแก้ไข (Repair) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.REPAIR}
                  onChange={(e) => setDraftKpi({ ...draftKpi, REPAIR: parseFloat(e.target.value) || 1.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div>
              <label className="label">🎨 งานปรับแบบ (Design) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.DESIGN}
                  onChange={(e) => setDraftKpi({ ...draftKpi, DESIGN: parseFloat(e.target.value) || 3.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div>
              <label className="label">🧹 งาน PM / ล้างเครื่อง (PM) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.PM}
                  onChange={(e) => setDraftKpi({ ...draftKpi, PM: parseFloat(e.target.value) || 2.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setKpiModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveKpiSettings}
                className="btn-primary"
              >
                <Check size={14} />
                <span>บันทึกเป้าหมาย</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Interruption & Lost Time Modal */}
      {interruptionModalOpen && interruptionJob && (() => {
        const interruptions = getJobInterruptions(interruptionJob)
        const activeInt = interruptions.find((i) => i.is_active && !i.end_time)
        const { lostDurationText } = calculateInterruptionTotal(interruptions)
        const start = interruptionJob.StartTimestamp || interruptionJob.DateStart || interruptionJob.created_at
        const now = new Date().toISOString()
        const durationRes = calculateDuration(start, now, interruptions)

        return (
          <Modal
            open={interruptionModalOpen}
            onClose={() => setInterruptionModalOpen(false)}
            title="⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)"
          >
            <div className="space-y-4 text-xs">
              {/* Job Info Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">ใบสั่งงาน:</span>
                  <div className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                    {interruptionJob.Job_ID || interruptionJob['Job ID']}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">เครื่องจักร:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {interruptionJob.MC} (KI: {interruptionJob.KI || '-'})
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">เวลาทำงานจริงสุทธิ:</span>
                  <div className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {durationRes.netDurationText}
                  </div>
                </div>
              </div>

              {/* 🏖️ Sunday Deduction Notice */}
              {durationRes.sundayMinutes > 0 && (
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span>🏖️ ช่วงเวลานี้ตรงกับวันอาทิตย์ (วันหยุดโรงงาน):</span>
                  </span>
                  <span className="font-mono font-bold">หักออก {durationRes.sundayDurationText} อัตโนมัติ</span>
                </div>
              )}

              {/* ⚠️ Active Running Interruption Banner */}
              {activeInt ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                      <Pause size={18} className="text-amber-600 animate-bounce" />
                      <span>กำลังทำงานแทรก: &ldquo;{activeInt.task_name}&rdquo;</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      จับเวลาอยู่
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                    <span>เริ่มตั้งแต่: <b>{format(new Date(activeInt.start_time), 'HH:mm:ss (dd/MM/yyyy)')}</b></span>
                    <span className="font-mono font-extrabold text-base text-amber-700 dark:text-amber-300">
                      {formatMinutesToThai(Math.floor((Date.now() - new Date(activeInt.start_time).getTime()) / 60000))}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStopInterruption(activeInt.id)}
                    className="w-full py-2.5 rounded-xl font-extrabold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    <span>▶️ จบงานแทรกนี้ / กลับมาทำงานหลักต่อ</span>
                  </button>
                </div>
              ) : (
                /* Start New Interruption Section */
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-500" />
                      <span>เริ่มงานแทรกใหม่ (Start Interruption)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowManualAdd(!showManualAdd)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      {showManualAdd ? '⚡ สลับเป็นโหมดกดเริ่มสด' : '+ กรอกเวลาย้อนหลัง'}
                    </button>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_INTERRUPTION_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setInterruptionTaskName(preset.template)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-300 transition-all shadow-xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Task Name Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="ระบุชื่องานแทรก เช่น ไปขึ้นด้าย เครื่อง 12334..."
                      value={interruptionTaskName}
                      onChange={(e) => setInterruptionTaskName(e.target.value)}
                      className="input text-xs font-semibold"
                    />
                  </div>

                  {/* Manual Add Inputs */}
                  {showManualAdd ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="label text-[11px]">จำนวนนาทีที่สูญเสียไป *</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="เช่น 30 (นาที)"
                          value={interruptionManualMins}
                          onChange={(e) => setInterruptionManualMins(e.target.value)}
                          className="input font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="label text-[11px]">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                        <input
                          type="text"
                          placeholder="รายละเอียดสั้นๆ..."
                          value={interruptionManualNotes}
                          onChange={(e) => setInterruptionManualNotes(e.target.value)}
                          className="input text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddManualInterruption}
                          className="btn-primary text-xs px-4 py-2"
                        >
                          <Check size={14} />
                          <span>บันทึกงานแทรกย้อนหลัง</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartInterruption()}
                      disabled={!interruptionTaskName.trim()}
                      className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                    >
                      <Pause size={14} />
                      <span>⏸️ เริ่มจับเวลางานแทรกทันที (Auto Timestamp)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Recorded Interruptions Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History size={14} className="text-slate-500" />
                    <span>รายการงานแทรกทั้งหมด ({interruptions.length} รายการ)</span>
                  </h4>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    รวมเสียเวลา: {lostDurationText}
                  </span>
                </div>

                {interruptions.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    ยังไม่มีรายการงานแทรกในใบสั่งงานนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {interruptions.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{item.task_name}</span>
                            {item.is_active && !item.end_time && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white animate-pulse">
                                กำลังทำ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                            <span>เริ่ม: {item.start_time ? format(new Date(item.start_time), 'HH:mm dd/MM') : '—'}</span>
                            <span>•</span>
                            <span>จบ: {item.end_time ? format(new Date(item.end_time), 'HH:mm dd/MM') : (item.is_active ? 'กำลังจับเวลา' : '—')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                            {formatMinutesToThai(item.duration_minutes || (item.start_time && item.end_time ? Math.floor((new Date(item.end_time) - new Date(item.start_time)) / 60000) : 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInterruption(item.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInterruptionModalOpen(false)}
                  className="btn-outline px-5"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* 5. Print A4 PDF Report Modal */}
      {printModalOpen && printJob && (
        <PdfPreviewModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          {...generateWorkOrderPdfProps({
            ...printJob,
            WONumber: printJob.Job_ID || printJob['Job ID'],
            OrderDate: printJob.StartDate,
            WOType: printJob.JobType === 'DESIGN' ? 'ปรับแบบ (Design)' : printJob.JobType === 'PM' ? 'บำรุงรักษา (PM)' : 'แก้ไขเครื่อง (Repair)',
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
      {dailyLogModalOpen && dailyLogJob && (() => {
        const currentJob =
          allJobs.find(
            (j) =>
              (j.id && j.id === dailyLogJob.id) ||
              (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
              (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
          ) || dailyLogJob
        const jobLogs = getJobDailyLogs(currentJob)
        const jobStatusMeta = getWorkOrderStatusMeta(currentJob.Status)
        const currentDetails = getWorkOrderDetails(currentJob)
        const jobIdDisplay = currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID

        return (
          <Modal
            open={dailyLogModalOpen}
            onClose={() => setDailyLogModalOpen(false)}
            title={`อัปเดตความคืบหน้างานประจำวัน • ${jobIdDisplay}`}
          >
            <div className="space-y-4 text-xs">
              {/* Job Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      {jobIdDisplay}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {currentJob.MC}
                    </span>
                    <span className="text-slate-500">
                      (KI: {currentJob.KI || '—'}{currentJob.Design ? ` • ${currentJob.Design}` : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">สถานะปัจจุบัน:</span>
                    <span className={`badge ${jobStatusMeta.badgeClass}`}>
                      {jobStatusMeta.label}
                    </span>
                  </div>
                </div>
                {currentDetails !== '—' && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">อาการ/รายละเอียดตั้งต้น: </span>
                    {currentDetails}
                  </div>
                )}
              </div>

              {/* Previous Daily Updates Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CalendarClock size={14} className="text-indigo-500" />
                    <span>ประวัติความคืบหน้าแต่ละวัน ({jobLogs.length} รายการ)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    อัปเดตเฉพาะเมื่อมีความเคลื่อนไหว
                  </span>
                </div>

                {jobLogs.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    ยังไม่มีบันทึกความคืบหน้ารายวันสำหรับใบสั่งงานนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[...jobLogs].reverse().map((entry, idx) => {
                      const entryMeta = getWorkOrderStatusMeta(entry.status)
                      return (
                        <div
                          key={entry.id || idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                📅 {entry.date}
                              </span>
                              <span className={`badge text-[10px] ${entryMeta.badgeClass}`}>
                                {entryMeta.label}
                              </span>
                              {entry.hours && (
                                <span className="font-mono text-slate-500 text-[11px]">
                                  ⏱️ {entry.hours} ชม.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>บันทึกโดย: {entry.recorded_by || '—'}</span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDailyLog(entry.id)}
                                  className="text-slate-400 hover:text-red-500 p-0.5"
                                  title="ลบรายการนี้"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-1">
                            {entry.details}
                          </div>

                          {Array.isArray(entry.techs) && entry.techs.length > 0 && (
                            <div className="text-[10px] text-slate-500 pl-1">
                              ช่าง: {entry.techs.join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* New Progress Update Form */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>➕ บันทึกความคืบหน้าใหม่ (เมื่อจบวัน / มีการเปลี่ยนแปลง)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="label text-[11px]">วันที่ *</label>
                    <input
                      type="date"
                      value={dailyLogDate}
                      onChange={(e) => setDailyLogDate(e.target.value)}
                      className="input font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="label text-[11px]">สถานะ ณ สิ้นวัน *</label>
                    <select
                      value={dailyLogStatus}
                      onChange={(e) => setDailyLogStatus(e.target.value)}
                      className="select text-xs font-semibold"
                    >
                      {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.fullLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px]">ชั่วโมงทำงานวันนี้ (ถ้ามี)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="เช่น 4 ชม."
                      value={dailyLogHours}
                      onChange={(e) => setDailyLogHours(e.target.value)}
                      className="input font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Technicians Checklist */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="label text-[11px] mb-0">ช่างที่ปฏิบัติงานในวันนี้</label>
                    <span className="text-[10px] text-slate-400">คลิกเลือกหรือยกเลิก</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {technicians.map((t, i) => {
                      const isSel = dailyLogTechs.includes(t.Name)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDailyLogTechs((prev) =>
                              prev.includes(t.Name)
                                ? prev.filter((name) => name !== t.Name)
                                : [...prev, t.Name]
                            )
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          {isSel && <Check size={11} strokeWidth={3} />}
                          <span>{t.Name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Details Textarea */}
                <div>
                  <label className="label text-[11px]">รายละเอียดความคืบหน้า / สิ่งที่ทำได้ในวันนี้ *</label>
                  <textarea
                    rows={3}
                    placeholder="เช่น ตรวจเช็คระบบไฟเสร็จแล้ว มอเตอร์ไหม้ รออะไหล่เข้าวันพรุ่งนี้..."
                    value={dailyLogDetails}
                    onChange={(e) => setDailyLogDetails(e.target.value)}
                    className="input text-xs w-full resize-none"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDailyLogModalOpen(false)}
                  className="btn-outline px-4"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveDailyLog}
                  disabled={dailyLogSubmitting || !dailyLogDetails.trim()}
                  className="btn-primary px-5"
                >
                  <Check size={14} />
                  <span>{dailyLogSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกความคืบหน้า'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
