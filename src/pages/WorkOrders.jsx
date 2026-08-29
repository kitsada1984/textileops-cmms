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
} from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import {
  WorkOrderAPI,
  TechnicianAPI,
  KpiSettingsAPI,
  AuditLogAPI,
  WO_JOB_TYPE,
  TECH_SKILL_LEVELS,
  TECH_SPECIALIZATIONS,
  generateJobId,
  calculateDuration,
  calculateSlaPerformance,
} from '../api/entities'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { SHEET_EXPORTS } from '../utils/sheetExportConfigs'
import RepairRequests from './RepairRequests'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { supabase } from '../supabase'
import { generateWorkOrderPdfProps } from '../utils/pdfDocGenerators'

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

const DEFAULT_TECHS = []

export default function WorkOrders({ defaultTab = 'records' }) {
  const { t } = useT()
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

  // KPI Settings State
  const [kpiTargets, setKpiTargets] = useState(DEFAULT_KPI_TARGETS)

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showDeleted, setShowDeleted] = useState(false)

  // New Work Order Form State
  const [mc, setMc] = useState('')
  const [ki, setKi] = useState('')
  const [design, setDesign] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [jobType, setJobType] = useState('REPAIR')
  const [selectedTechs, setSelectedTechs] = useState([])
  const [comment, setComment] = useState('')
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

  // Load Technicians & KPI Settings from Supabase / Storage
  const loadTechsAndSettings = async () => {
    setTechLoading(true)
    try {
      const [techRes, kpiRes] = await Promise.allSettled([
        TechnicianAPI.list(),
        KpiSettingsAPI.list(),
      ])

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
  }, [])

  // Active jobs list filter with legacy and new column normalization
  const allJobs = useMemo(() => {
    if (!Array.isArray(rawJobs)) return []
    return rawJobs
      .filter((r) => r && r.MC !== '__SYSTEM__' && !String(r.WO_ID || '').startsWith('SYS_') && r.Problem !== '__SYS_CONFIG__')
      .map((r) => {
      const jobId = r.Job_ID || r['Job ID'] || r.WO_ID || (r.id ? `JOB-${String(r.id).slice(0, 8)}` : 'JOB-00000000-0000')
      const technicians = r.Technicians || r['Technicians'] || r.Tech || ''
      const comment = r.Comment || r['Comment'] || r.Problem || r.Detail || ''
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

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const isDel = Boolean(job.IsDeleted)
      if (!showDeleted && isDel) return false
      if (showDeleted && !isDel) return false

      if (typeFilter !== 'ALL' && (job.JobType || 'REPAIR') !== typeFilter) return false
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'กำลังทำ' && job.Status !== 'IN_PROGRESS') return false
        if (statusFilter === 'เสร็จสิ้น' && job.Status !== 'COMPLETED') return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          String(job.Job_ID || job['Job ID'] || '').toLowerCase().includes(q) ||
          String(job.MC || '').toLowerCase().includes(q) ||
          String(job.KI || '').toLowerCase().includes(q) ||
          String(job.Design || '').toLowerCase().includes(q) ||
          String(job.Technicians || '').toLowerCase().includes(q) ||
          String(job.CreatedBy || '').toLowerCase().includes(q) ||
          String(job.Comment || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [allJobs, typeFilter, statusFilter, showDeleted, search])

  // KPI Breakdown Calculations
  const kpiStats = useMemo(() => {
    const activeNonDeleted = allJobs.filter((j) => !j.IsDeleted)
    const total = activeNonDeleted.length
    const active = activeNonDeleted.filter((j) => j.Status === 'IN_PROGRESS').length
    const completed = activeNonDeleted.filter((j) => j.Status === 'COMPLETED').length

    const calcJobTypeKpi = (typeKey) => {
      const jobsOfType = activeNonDeleted.filter((j) => (j.JobType || 'REPAIR') === typeKey)
      const targetDays = kpiTargets[typeKey] || 1.0
      const totalCount = jobsOfType.length

      let onTimeCount = 0
      let overdueCount = 0
      let totalHours = 0
      let countWithDuration = 0

      jobsOfType.forEach((j) => {
        const sla = calculateSlaPerformance(j, kpiTargets)
        if (sla.isOnTime) onTimeCount += 1
        else overdueCount += 1

        if (j.WorkingHoursDecimal) {
          totalHours += Number(j.WorkingHoursDecimal)
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
      }
    }

    const repairKpi = calcJobTypeKpi('REPAIR')
    const designKpi = calcJobTypeKpi('DESIGN')
    const pmKpi     = calcJobTypeKpi('PM')

    const totalOnTime = repairKpi.onTime + designKpi.onTime + pmKpi.onTime
    const overallRate = total > 0 ? Math.round((totalOnTime / total) * 100) : 0

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
        Technicians: selectedTechs.join(', '),
        Comment: comment.trim() || 'เปิดใบสั่งงาน',
        Status: 'IN_PROGRESS',
        IsDeleted: false,
        CreatedBy: user?.username || user?.full_name || 'ช่างประจำกะ',

        // Legacy compatibility columns
        WO_ID: jobId,
        DateStart: startTimestamp,
        Tech: selectedTechs.join(', '),
        Problem: comment.trim() || 'เปิดใบสั่งงาน',
        Detail: comment.trim() || 'เปิดใบสั่งงาน',
        Priority: 'MEDIUM',
      }

      await saveJob(payload)
      toast.success('เปิดใบสั่งงานสำเร็จ', `${jobId} (${mc} - ${ki})`)

      // Reset form
      setMc('')
      setKi('')
      setDesign('')
      setRollNo('')
      setJobType('REPAIR')
      setSelectedTechs([])
      setComment('')
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

  // Calculated duration for Complete Modal
  const compCalcDuration = useMemo(() => {
    if (!compJob || !compEndDate || !compEndTime) return { hoursDecimal: 0, durationText: '—' }
    const start = compJob.StartTimestamp || compJob.DateStart || (compJob.StartDate && compJob.StartTime ? (compJob.StartTime.includes('T') ? compJob.StartTime : `${compJob.StartDate}T${compJob.StartTime}`) : null) || compJob.created_at
    const end = `${compEndDate}T${compEndTime}:00`
    return calculateDuration(start, end)
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
        Duration: durationResult.hoursDecimal,
        WorkingHoursDecimal: durationResult.hoursDecimal,
        WorkingDurationText: durationResult.durationText,
        Status: 'COMPLETED',
        CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
      }

      await saveJob(payload)
      toast.success('บันทึกจบงานสำเร็จ', `${compJob.Job_ID || compJob['Job ID']} (${durationResult.durationText})`)
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
    setEditJob({ ...job })
    const techArray = (job.Technicians || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setEditTechs(techArray)
    setEditModalOpen(true)
  }

  // Submit Edit Job
  const handleEditJob = async () => {
    if (!editJob) return
    setEditSubmitting(true)
    try {
      const payload = {
        ...editJob,
        Technicians: editTechs.join(', '),
        Tech: editTechs.join(', '),
        UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
      }
      await saveJob(payload)
      toast.success('แก้ไขข้อมูลใบสั่งงานสำเร็จ', editJob.Job_ID || editJob['Job ID'])
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
  const openAddTech = () => {
    const maxNum = technicians.reduce((max, t) => {
      const match = String(t.Technician_ID || t.id || '').match(/TECH-(\d+)/i)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const nextId = `TECH-${String(maxNum + 1).padStart(3, '0')}`
    setEditingTechId(null)
    setTechForm({
      id: nextId,
      Technician_ID: nextId,
      Name: '',
      Phone: '',
      SkillLevel: 'Senior',
      Specialization: '',
      Status: 'ACTIVE',
      Line_ID: '',
      Telegram_ID: '',
    })
    setTechModalOpen(true)
  }

  const openEditTech = (tech) => {
    const techId = tech.id || tech.Technician_ID
    setEditingTechId(techId)
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
    })
    setTechModalOpen(true)
  }

  // Sync Technicians to LINE and Telegram notification settings in Supabase & LocalStorage
  const syncTechToNotifications = async (techList) => {
    try {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(techList)) } catch {}
      }
      const { data: lineData } = await supabase.from('appconfigs').select('value').eq('key', 'line_settings').maybeSingle()
      let lineCfg = {}
      if (lineData?.value) {
        try { lineCfg = JSON.parse(lineData.value) } catch {}
      } else {
        try { lineCfg = JSON.parse(localStorage.getItem('txops_tbl_line_settings') || '{}') } catch {}
      }
      lineCfg.technicians = techList.map((t) => ({ name: t.Name, user_id: (t.Line_ID || t.line_id || '').trim() }))
      await supabase.from('appconfigs').upsert({ key: 'line_settings', value: JSON.stringify(lineCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      try { localStorage.setItem('txops_tbl_line_settings', JSON.stringify(lineCfg)) } catch {}

      const { data: tgData } = await supabase.from('appconfigs').select('value').eq('key', 'telegram_settings').maybeSingle()
      let tgCfg = {}
      if (tgData?.value) {
        try { tgCfg = JSON.parse(tgData.value) } catch {}
      } else {
        try { tgCfg = JSON.parse(localStorage.getItem('txops_tbl_telegram_settings') || '{}') } catch {}
      }
      tgCfg.technicians = techList.map((t) => ({ name: t.Name, chat_id: (t.Telegram_ID || t.telegram_id || '').trim() }))
      await supabase.from('appconfigs').upsert({ key: 'telegram_settings', value: JSON.stringify(tgCfg), updated_at: new Date().toISOString() }, { onConflict: 'key' })
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
      syncTechToNotifications(nextList)
    } catch (err) {
      console.warn('Backend update failed, saving locally:', err)
      const nextList = editingTechId
        ? technicians.map((t) => (t.id === editingTechId || t.Technician_ID === editingTechId ? { ...t, ...payload } : t))
        : [...technicians, payload]
      setTechnicians(nextList)
      toast.success('บันทึกข้อมูลช่างเรียบร้อย', payload.Name)
      setTechModalOpen(false)
      syncTechToNotifications(nextList)
    }
  }

  const handleDeleteTech = async (tech) => {
    const techId = tech.id || tech.Technician_ID
    if (!confirm(`ยืนยันการลบช่าง "${tech.Name}" ออกจากระบบหรือไม่?`)) return
    try {
      await TechnicianAPI.delete(techId)
    } catch (e) {
      console.warn('Backend delete fallback:', e)
    }
    const nextList = technicians.filter((t) => t.id !== techId && t.Technician_ID !== techId)
    setTechnicians(nextList)
    syncTechToNotifications(nextList)
    toast.success('ลบข้อมูลช่างเรียบร้อย', tech.Name)
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

      {/* ── 5-Tabs Navigation Bar ─────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-2 sm:pb-1.5">
        <button
          type="button"
          onClick={() => setCurrentTab('records')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            currentTab === 'records'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ClipboardList size={15} />
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            currentTab === 'repair_requests'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Wrench size={15} />
          <span>แจ้งซ่อม (Repair Requests)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            currentTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Target size={15} />
          <span>แดชบอร์ด & สรุป KPI</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('technicians')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            currentTab === 'technicians'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <UserCheck size={15} />
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
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            currentTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <SettingsIcon size={15} />
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
                {/* 5 Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                  <div>
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

                {/* Job Comment */}
                <div>
                  <label className="label">อาการเสีย / รายละเอียดงานซ่อม</label>
                  <input
                    type="text"
                    placeholder="ระบุอาการเสีย หรือรายละเอียดการปรับแต่ง..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input"
                  />
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
          <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[220px]">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="ค้นหา Job ID, M/C, KI, ช่าง, ผู้ทำรายการ..."
                className="w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span style={{ color: 'var(--text-500)' }}>ประเภท:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="select py-1.5 px-3 text-xs"
              >
                <option value="ALL">ทุกประเภท</option>
                <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                <option value="PM">🧹 PM / ล้างเครื่อง</option>
              </select>

              <span style={{ color: 'var(--text-500)' }} className="ml-1">สถานะ:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select py-1.5 px-3 text-xs"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="กำลังทำ">กำลังทำ (In Progress)</option>
                <option value="เสร็จสิ้น">เสร็จสิ้น (Completed)</option>
              </select>

              <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 ml-2 cursor-pointer select-none">
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

          {/* WORK ORDERS TABLE */}
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
                  <th>ช่างผู้ปฏิบัติงาน</th>
                  <th>สถานะ</th>
                  <th>เวลาเริ่ม</th>
                  <th>ระยะเวลา</th>
                  <th>SLA Performance</th>
                  <th>ผู้บันทึก</th>
                  <th className="text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job, idx) => {
                  const isCompleted = job.Status === 'COMPLETED' || job.Status === 'เสร็จสิ้น'
                  const sla = calculateSlaPerformance(job, kpiTargets)
                  const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`

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

                      {/* Technicians */}
                      <td className="max-w-[180px] truncate" style={{ color: 'var(--text-700)' }}>
                        {job.Technicians || '—'}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${isCompleted ? 'badge-green' : 'badge-orange'}`}>
                          {isCompleted ? 'เสร็จสิ้น' : 'กำลังทำ'}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td className="text-xs font-mono" style={{ color: 'var(--text-500)' }}>
                        {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}` : '—'}
                      </td>

                      {/* Duration */}
                      <td className="font-mono font-bold" style={{ color: isCompleted ? 'var(--text-900)' : 'var(--text-400)' }}>
                        {job.WorkingDurationText || (isCompleted ? `${job.WorkingHoursDecimal} ชม.` : 'กำลังจับเวลา...')}
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
                    <td colSpan={12} className="text-center py-12 text-slate-400">
                      {jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการใบสั่งงาน'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              <button onClick={openAddTech} className="btn-primary">
                <UserPlus size={15} />
                <span>เพิ่มช่างใหม่</span>
              </button>
            )}
          </div>

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
                  onClick={openAddTech}
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg font-black font-mono">
                          {(tech?.Name || '?')[0]?.toUpperCase()}
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

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                ระยะเวลาปฏิบัติงานจริง:
              </span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                {compCalcDuration.durationText}
              </span>
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

            <div className="grid grid-cols-3 gap-3">
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

            <div>
              <label className="label">อาการเสีย / รายละเอียดงานซ่อม</label>
              <input
                type="text"
                value={editJob.Comment || ''}
                onChange={(e) => setEditJob({ ...editJob, Comment: e.target.value })}
                className="input"
              />
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
    </div>
  )
}
