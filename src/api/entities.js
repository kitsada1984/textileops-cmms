import { createEntityClient } from './supabaseClient'
import { supabase } from '../supabase'
import initialCenterChecks from '../data/initialCenterChecks.json'

export const DEFAULT_TECHS = []

export const MachineAPI         = createEntityClient('machines')
export const CylinderAPI        = createEntityClient('cylinders')

/**
 * Helper to identify internal system storage records in workorders table.
 * System records (Technicians, Center Checks, Needle Conditions, etc.) operate in the background and must NEVER be visible in user-facing UI.
 */
export function isSystemWorkOrder(item = {}) {
  if (!item) return false
  const mc = String(item.MC || item.Mc || item.machine_mc || '').trim()
  const woId = String(item.Job_ID || item['Job ID'] || item.WO_ID || item.WONumber || item.doc_no || item.id || '').trim()
  const problem = String(item.Problem || item.problem || '').trim()
  return (
    mc === '__SYSTEM__' ||
    woId.startsWith('SYS_') ||
    woId === 'SYS_TECHNICIANS' ||
    woId === 'SYS_CENTER_CHECKS' ||
    woId === 'SYS_NEEDLE_CONDITIONS' ||
    problem === '__SYS_CONFIG__'
  )
}

const rawWorkOrderClient = createEntityClient('workorders')
export const WorkOrderAPI = {
  ...rawWorkOrderClient,
  list: async (filters = {}) => {
    const res = await rawWorkOrderClient.list(filters)
    const items = Array.isArray(res) ? res : (res?.data || [])
    return items.filter((item) => !isSystemWorkOrder(item))
  },
  rawList: async (filters = {}) => {
    return rawWorkOrderClient.list(filters)
  },
}

export const TechnicianAPI = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('workorders')
        .select('Comment')
        .eq('WO_ID', 'SYS_TECHNICIANS')
        .maybeSingle()
      if (!error && data?.Comment) {
        const parsed = JSON.parse(data.Comment)
        if (Array.isArray(parsed)) {
          try { localStorage.setItem('txops_tbl_technicians', JSON.stringify(parsed)) } catch {}
          return parsed
        }
      }
    } catch (e) {
      console.warn('Technician cloud load error:', e)
    }
    try {
      const local = JSON.parse(localStorage.getItem('txops_tbl_technicians') || 'null')
      if (Array.isArray(local)) return local
    } catch {}
    return DEFAULT_TECHS
  },
  saveAll: async (techsList) => {
    try {
      if (!techsList || techsList.length === 0) {
        try { localStorage.removeItem('txops_tbl_technicians') } catch {}
        await supabase.from('workorders').delete().eq('WO_ID', 'SYS_TECHNICIANS')
        return
      }
      localStorage.setItem('txops_tbl_technicians', JSON.stringify(techsList))
    } catch {}
    try {
      const { data: existing } = await supabase
        .from('workorders')
        .select('id')
        .eq('WO_ID', 'SYS_TECHNICIANS')
      if (existing && existing.length > 0) {
        await supabase
          .from('workorders')
          .update({
            Comment: JSON.stringify(techsList),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
      } else {
        await supabase.from('workorders').insert({
          MC: '__SYSTEM__',
          Problem: '__SYS_CONFIG__',
          WO_ID: 'SYS_TECHNICIANS',
          Comment: JSON.stringify(techsList),
          Status: 'COMPLETED',
        })
      }
    } catch (e) {
      console.warn('Technician cloud save error:', e)
    }
  },
  create: async (item) => {
    const list = await TechnicianAPI.list()
    const nextId = item.id || item.Technician_ID || `TECH-00${list.length + 1}`
    const newItem = { ...item, id: nextId, Technician_ID: nextId }
    const updated = [...list, newItem]
    await TechnicianAPI.saveAll(updated)
    return newItem
  },
  update: async (id, item) => {
    const list = await TechnicianAPI.list()
    const updated = list.map((t) => (t.id === id || t.Technician_ID === id ? { ...t, ...item, id } : t))
    await TechnicianAPI.saveAll(updated)
    return { ...item, id }
  },
  delete: async (id) => {
    const list = await TechnicianAPI.list()
    const updated = list.filter((t) => t.id !== id && t.Technician_ID !== id)
    await TechnicianAPI.saveAll(updated)
  },
}

export const KpiSettingsAPI     = createEntityClient('kpi_settings')
export const PMPlanAPI          = createEntityClient('pmplans')

export const CenterCheckAPI = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('workorders')
        .select('Comment')
        .eq('WO_ID', 'SYS_CENTER_CHECKS')
        .maybeSingle()
      if (!error && data?.Comment) {
        const parsed = JSON.parse(data.Comment)
        if (Array.isArray(parsed) && parsed.length > 0) {
          try { localStorage.setItem('txops_tbl_center_checks', JSON.stringify(parsed)) } catch {}
          return parsed
        }
      }
    } catch (e) {
      console.warn('CenterCheck cloud load error:', e)
    }
    try {
      const local = JSON.parse(localStorage.getItem('txops_tbl_center_checks') || '[]')
      if (Array.isArray(local) && local.length > 0) return local
    } catch {}
    return initialCenterChecks
  },
  saveAll: async (checksList) => {
    try {
      if (!checksList || checksList.length === 0) {
        try { localStorage.removeItem('txops_tbl_center_checks') } catch {}
        await supabase.from('workorders').delete().eq('WO_ID', 'SYS_CENTER_CHECKS')
        return
      }
      localStorage.setItem('txops_tbl_center_checks', JSON.stringify(checksList))
    } catch {}
    try {
      const { data: existing } = await supabase
        .from('workorders')
        .select('id')
        .eq('WO_ID', 'SYS_CENTER_CHECKS')
      if (existing && existing.length > 0) {
        await supabase
          .from('workorders')
          .update({
            Comment: JSON.stringify(checksList),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
      } else {
        await supabase.from('workorders').insert({
          MC: '__SYSTEM__',
          Problem: '__SYS_CONFIG__',
          WO_ID: 'SYS_CENTER_CHECKS',
          Comment: JSON.stringify(checksList),
          Status: 'COMPLETED',
        })
      }
    } catch (e) {
      console.warn('CenterCheck cloud save error:', e)
    }
  },
  create: async (item) => {
    const list = await CenterCheckAPI.list()
    const newItem = { ...item, id: item.id || `cc_${Date.now()}` }
    const updated = [newItem, ...list]
    await CenterCheckAPI.saveAll(updated)
    return newItem
  },
  update: async (id, item) => {
    const list = await CenterCheckAPI.list()
    const updated = list.map((c) => (c.id === id || c.doc_no === id ? { ...c, ...item, id } : c))
    await CenterCheckAPI.saveAll(updated)
    return { ...item, id }
  },
  delete: async (id) => {
    const list = await CenterCheckAPI.list()
    const updated = list.filter((c) => c.id !== id && c.doc_no !== id)
    await CenterCheckAPI.saveAll(updated)
  },
}

export const NEEDLE_STATUSES = [
  { value: 'สึกเล็กน้อย', label: 'สึกเล็กน้อย', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'สึกปานกลาง', label: 'สึกปานกลาง', color: 'amber', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 'สึกมาก', label: 'สึกมาก', color: 'orange', bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { value: 'สึกมาก(ควรเปลี่ยน)', label: 'สึกมาก(ควรเปลี่ยน)', color: 'rose', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { value: 'ระบุเอง', label: 'ระบุเอง', color: 'blue', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
]

export const NeedleConditionAPI = {
  list: async () => {
    try {
      const { data, error } = await supabase
        .from('needle_conditions')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && Array.isArray(data)) {
        try { localStorage.setItem('txops_tbl_needle_conditions', JSON.stringify(data)) } catch {}
        return data
      }
    } catch (e) {
      console.warn('NeedleCondition direct table load error, falling back to sys config:', e)
    }

    try {
      const { data, error } = await supabase
        .from('workorders')
        .select('Comment')
        .eq('WO_ID', 'SYS_NEEDLE_CONDITIONS')
        .maybeSingle()
      if (!error && data?.Comment) {
        const parsed = JSON.parse(data.Comment)
        if (Array.isArray(parsed)) {
          try { localStorage.setItem('txops_tbl_needle_conditions', JSON.stringify(parsed)) } catch {}
          return parsed
        }
      }
    } catch (e) {
      console.warn('NeedleCondition cloud load error:', e)
    }

    try {
      const local = JSON.parse(localStorage.getItem('txops_tbl_needle_conditions') || '[]')
      if (Array.isArray(local)) return local
    } catch {}
    return []
  },
  saveAll: async (recordsList) => {
    try {
      if (!recordsList || recordsList.length === 0) {
        try { localStorage.removeItem('txops_tbl_needle_conditions') } catch {}
        await supabase.from('workorders').delete().eq('WO_ID', 'SYS_NEEDLE_CONDITIONS')
        return
      }
      localStorage.setItem('txops_tbl_needle_conditions', JSON.stringify(recordsList))
    } catch {}
    try {
      const { data: existing } = await supabase
        .from('workorders')
        .select('id')
        .eq('WO_ID', 'SYS_NEEDLE_CONDITIONS')
      if (existing && existing.length > 0) {
        await supabase
          .from('workorders')
          .update({
            Comment: JSON.stringify(recordsList),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
      } else {
        await supabase.from('workorders').insert({
          MC: '__SYSTEM__',
          Problem: '__SYS_CONFIG__',
          WO_ID: 'SYS_NEEDLE_CONDITIONS',
          Comment: JSON.stringify(recordsList),
          Status: 'COMPLETED',
        })
      }
    } catch (e) {
      console.warn('NeedleCondition cloud save error:', e)
    }
  },
  create: async (item) => {
    const list = await NeedleConditionAPI.list()
    const newItem = {
      ...item,
      id: item.id || `nc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [newItem, ...list]
    await NeedleConditionAPI.saveAll(updated)
    return newItem
  },
  update: async (id, item) => {
    const list = await NeedleConditionAPI.list()
    const updated = list.map((r) => (r.id === id ? { ...r, ...item, updated_at: new Date().toISOString() } : r))
    await NeedleConditionAPI.saveAll(updated)
    return { ...item, id }
  },
  delete: async (id) => {
    const list = await NeedleConditionAPI.list()
    const updated = list.filter((r) => r.id !== id)
    await NeedleConditionAPI.saveAll(updated)
  },
}

export const ChecklistConfigAPI = createEntityClient('checklist_configs')
export const SparePartAPI       = createEntityClient('spareparts')
export const AuditLogAPI        = createEntityClient('audit_logs')
export const PurchaseOrderAPI   = createEntityClient('purchaseorders')
export const StockTxnAPI        = createEntityClient('stocktransactions')
export const AppConfigAPI       = createEntityClient('appconfigs')
export const UserAPI            = createEntityClient('users')
export const RepairRequestAPI   = createEntityClient('repair_requests')
export const DesignBomAPI       = createEntityClient('design_bom')

export const MACHINE_STATUS = [
  { value: 'RUNNING', label: 'เดินเครื่อง' },
  { value: 'BREAKDOWN', label: 'เครื่องเสีย' },
  { value: 'MAINTENANCE', label: 'ซ่อมบำรุง' },
  { value: 'IDLE', label: 'ว่าง' },
  { value: 'DECOMMISSIONED', label: 'เลิกใช้งาน' },
]

export const CYL_STATUS = [
  { value: 'STANDARD', label: 'มาตรฐาน' },
  { value: 'SWAPPED', label: 'สลับแล้ว' },
  { value: 'SPARE', label: 'สำรอง' },
  { value: 'REPAIR', label: 'ซ่อม' },
  { value: 'RESERVE', label: 'สำรอง' },
  { value: 'SCRAP', label: 'ตัดทิ้ง' },
]

export const WO_STATUS = [
  { value: 'IN_PROGRESS', label: 'กำลังทำ' },
  { value: 'COMPLETED',   label: 'เสร็จสิ้น' },
  { value: 'OPEN',        label: 'เปิดผลิต' },
  { value: 'WAIT_ADJUST', label: 'รอปรับ' },
  { value: 'WAIT_REPAIR', label: 'รอแก้ไข' },
  { value: 'WAIT_PARTS',  label: 'รออะไหล่' },
  { value: 'WAIT_YARN',   label: 'รอเส้นด้าย' },
  { value: 'ADJUSTING',   label: 'กำลังปรับ' },
  { value: 'REPAIRING',   label: 'กำลังแก้ไข' },
  { value: 'ADJUSTED',    label: 'งานปรับ' },
  { value: 'REPAIRED',    label: 'งานแก้ไข' },
  { value: 'MAINTENANCE', label: 'งาน Maintenance' },
  { value: 'WAIT_TEST',   label: 'รอผลเทส' },
]

export const WO_PRIORITY = [
  { value: 'CRITICAL', label: 'วิกฤต' },
  { value: 'HIGH', label: 'สูง' },
  { value: 'MEDIUM', label: 'กลาง' },
  { value: 'LOW', label: 'ต่ำ' },
]

export const WO_JOB_TYPE = [
  { value: 'REPAIR', label: '🛠️ แก้ไข (Repair)' },
  { value: 'DESIGN', label: '🎨 ปรับแบบ (Design)' },
  { value: 'PM',     label: '🧹 PM / ล้างเครื่อง' },
]

export const TECH_SKILL_LEVELS = [
  { value: 'Master',    label: 'Master (ช่างผู้เชี่ยวชาญระดับสูง)', color: '#8b5cf6' },
  { value: 'Senior',    label: 'Senior (ช่างอาวุโส)',              color: '#3b82f6' },
  { value: 'Mid-Level', label: 'Mid-Level (ช่างระดับกลาง)',        color: '#10b981' },
  { value: 'Junior',    label: 'Junior (ช่างฝึกหัด / ผู้ช่วย)',     color: '#f59e0b' },
]

export const TECH_SPECIALIZATIONS = [
  'งานซ่อมเครื่องจักรหลัก (Machine Repair)',
  'ปรับแบบลายผ้า / ลาย Cy/Dail (Design Adjustment)',
  'PM ล้างเครื่อง / โอเวอร์ฮอล (PM & Overhaul)',
  'ระบบไฟฟ้าและอิเล็กทรอนิกส์ (Electronics & Control)',
  'งานซ่อมบำรุงทั่วไป (General Maintenance)',
]

export const PM_TYPE = [
  { label: '30 วัน', value: '30' },
  { label: '60 วัน', value: '60' },
  { label: '90 วัน', value: '90' },
  { label: 'ระบุเอง', value: 'CUSTOM' },
]

export const PM_STATUS = [
  { value: 'SCHEDULED', label: 'ตามแผน' },
  { value: 'IN_PROGRESS', label: 'กำลังดำเนินการ' },
  { value: 'COMPLETED', label: 'เสร็จแล้ว' },
  { value: 'OVERDUE', label: 'เกินกำหนด' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

export const PART_STATUS = [
  { value: 'IN_STOCK', label: 'มีของ' },
  { value: 'LOW_STOCK', label: 'สต็อกต่ำ' },
  { value: 'OUT_OF_STOCK', label: 'หมดสต็อก' },
]

export const PO_STATUS = [
  { value: 'ORDERED',   label: 'รอของ' },
  { value: 'RECEIVED',  label: 'ได้รับของแล้ว' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

export const TXN_TYPE = [
  { value: 'RECEIVE', label: 'รับเข้า' },
  { value: 'ISSUE', label: 'เบิกออก' },
  { value: 'ADJUST', label: 'ปรับยอด' },
  { value: 'RETURN', label: 'คืนเข้า' },
  { value: 'SCRAP', label: 'ตัดทิ้ง' },
]

export const REPAIR_STATUS = [
  { value: 'PENDING',     label: 'รอแก้ไข' },
  { value: 'IN_PROGRESS', label: 'กำลังแก้ไข' },
  { value: 'WAIT_PARTS',  label: 'รออะไหล่' },
  { value: 'COMPLETED',   label: 'แก้ไขสำเร็จ' },
]

/**
 * Generates formatted Job ID: JOB-YYYYMMDD-XXXX
 */
export function generateJobId(existingJobs = []) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const datePrefix = `JOB-${yyyy}${mm}${dd}`

  let countToday = 1
  existingJobs.forEach((job) => {
    const id = String(job.Job_ID || job['Job ID'] || job.job_id || job.id || '')
    if (id.startsWith(datePrefix)) {
      const parts = id.split('-')
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10)
        if (!isNaN(num) && num >= countToday) {
          countToday = num + 1
        }
      }
    }
  })

  const seq = String(countToday).padStart(4, '0')
  return `${datePrefix}-${seq}`
}

/**
 * Formats minutes into human-readable Thai duration string.
 */
export function formatMinutesToThai(totalMinutes = 0) {
  const mins = Math.max(0, Math.floor(totalMinutes || 0))
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} ชม.`)
  if (minutes > 0 || hours === 0) parts.push(`${minutes} นาที`)
  return parts.join(' ')
}

/**
 * Calculates total lost/interrupted duration from an array of interruption logs.
 */
export function calculateInterruptionTotal(interruptionLogs = []) {
  let logs = interruptionLogs
  if (typeof logs === 'string') {
    try { logs = JSON.parse(logs) } catch { logs = [] }
  }
  if (!Array.isArray(logs) || logs.length === 0) {
    return { totalMinutes: 0, lostHoursDecimal: 0, lostDurationText: '0 นาที', activeLog: null }
  }

  let totalMinutes = 0
  let activeLog = null

  logs.forEach((log) => {
    if (!log) return
    const start = log.start_time || log.StartTime || log.created_at
    const end = log.end_time || log.EndTime || (log.is_active ? new Date().toISOString() : null)
    if (start && end) {
      const diffMs = new Date(end).getTime() - new Date(start).getTime()
      if (diffMs > 0) {
        totalMinutes += Math.floor(diffMs / (1000 * 60))
      }
    } else if (start && !end) {
      activeLog = log
      const diffMs = Date.now() - new Date(start).getTime()
      if (diffMs > 0) {
        totalMinutes += Math.floor(diffMs / (1000 * 60))
      }
    } else if (log.duration_minutes || log.duration_hours) {
      totalMinutes += Number(log.duration_minutes) || (Number(log.duration_hours) * 60) || 0
    }
  })

  const lostHoursDecimal = Math.round((totalMinutes / 60) * 100) / 100
  return {
    totalMinutes,
    lostHoursDecimal,
    lostDurationText: formatMinutesToThai(totalMinutes),
    activeLog,
  }
}

/**
 * Calculates the total minutes falling on Sundays (Day 0) between two timestamps.
 * Factory shift operates Monday-Saturday (12h/day). Sundays are non-working days.
 */
export function calculateSundayMinutes(startTimestamp, endTimestamp) {
  if (!startTimestamp || !endTimestamp) return 0
  const start = new Date(startTimestamp)
  const end = new Date(endTimestamp)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0

  let sundayMinutes = 0
  const currentDayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  let dayCursor = new Date(currentDayStart)

  while (dayCursor <= end) {
    if (dayCursor.getDay() === 0) { // 0 = Sunday
      const sundayStart = new Date(dayCursor.getFullYear(), dayCursor.getMonth(), dayCursor.getDate(), 0, 0, 0, 0)
      const sundayEnd = new Date(dayCursor.getFullYear(), dayCursor.getMonth(), dayCursor.getDate(), 23, 59, 59, 999)

      const overlapStart = Math.max(start.getTime(), sundayStart.getTime())
      const overlapEnd = Math.min(end.getTime(), sundayEnd.getTime() + 1)

      if (overlapEnd > overlapStart) {
        sundayMinutes += Math.floor((overlapEnd - overlapStart) / (1000 * 60))
      }
    }
    dayCursor.setDate(dayCursor.getDate() + 1)
  }

  return sundayMinutes
}

/**
 * Counts working days between two dates, automatically excluding Sundays.
 */
export function countWorkingDaysExcludingSundays(startDate, targetDate) {
  if (!startDate || !targetDate) return 0
  const start = new Date(startDate)
  const end = new Date(targetDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  if (start.getTime() === end.getTime()) return 0

  const isFuture = end > start
  let current = isFuture ? new Date(start) : new Date(end)
  const stop = isFuture ? new Date(end) : new Date(start)

  let workingDays = 0
  while (current < stop) {
    current.setDate(current.getDate() + 1)
    if (current.getDay() !== 0) { // 0 = Sunday
      workingDays++
    }
  }

  return isFuture ? workingDays : -workingDays
}

/**
 * Calculates duration in decimal hours and human-readable Thai text,
 * automatically deducting Sundays (non-working factory day) and lost/interrupted time.
 */
export function calculateDuration(startTimestamp, endTimestamp, interruptionLogs = [], excludeSunday = true) {
  if (!startTimestamp || !endTimestamp) {
    return {
      hoursDecimal: 0,
      durationText: '—',
      grossHoursDecimal: 0,
      grossDurationText: '—',
      sundayMinutes: 0,
      sundayHoursDecimal: 0,
      sundayDurationText: '0 นาที',
      lostHoursDecimal: 0,
      lostDurationText: '0 นาที',
      netHoursDecimal: 0,
      netDurationText: '—',
      activeInterruption: null,
    }
  }
  const start = new Date(startTimestamp)
  const end = new Date(endTimestamp)
  const diffMs = end.getTime() - start.getTime()
  if (isNaN(diffMs) || diffMs < 0) {
    return {
      hoursDecimal: 0,
      durationText: '0 นาที',
      grossHoursDecimal: 0,
      grossDurationText: '0 นาที',
      sundayMinutes: 0,
      sundayHoursDecimal: 0,
      sundayDurationText: '0 นาที',
      lostHoursDecimal: 0,
      lostDurationText: '0 นาที',
      netHoursDecimal: 0,
      netDurationText: '0 นาที',
      activeInterruption: null,
    }
  }

  const grossTotalMinutes = Math.floor(diffMs / (1000 * 60))
  const grossHoursDecimal = Math.round((grossTotalMinutes / 60) * 100) / 100
  const grossDurationText = formatMinutesToThai(grossTotalMinutes)

  // 1. Sunday (Non-working factory day-off) deduction
  const sundayMinutes = excludeSunday ? calculateSundayMinutes(start, end) : 0
  const sundayHoursDecimal = Math.round((sundayMinutes / 60) * 100) / 100
  const sundayDurationText = formatMinutesToThai(sundayMinutes)

  // 2. Interruption / Lost Time deduction
  const { totalMinutes: lostMinutes, lostHoursDecimal, lostDurationText, activeLog } = calculateInterruptionTotal(interruptionLogs)

  // 3. Net working time = Gross - Sunday - Interruption
  const netMinutes = Math.max(0, grossTotalMinutes - sundayMinutes - lostMinutes)
  const netHoursDecimal = Math.round((netMinutes / 60) * 100) / 100
  const netDurationText = formatMinutesToThai(netMinutes)

  return {
    hoursDecimal: netHoursDecimal,
    durationText: netDurationText,
    grossHoursDecimal,
    grossDurationText,
    sundayMinutes,
    sundayHoursDecimal,
    sundayDurationText,
    lostHoursDecimal,
    lostDurationText,
    netHoursDecimal,
    netDurationText,
    activeInterruption: activeLog,
  }
}

/**
 * Evaluates SLA Performance based on Job Type and KPI Target Days (12-hour shift base, excluding Sundays).
 */
export function calculateSlaPerformance(job, targetDaysMap = { REPAIR: 1.0, DESIGN: 3.0, PM: 2.0 }, hoursPerDay = 12, excludeSunday = true) {
  const type = String(job.JobType || job['Job Type'] || 'REPAIR').toUpperCase()
  const targetDays = targetDaysMap[type] || 1.0
  const targetHours = targetDays * hoursPerDay

  const startTimestamp = job.StartTimestamp || job['Start Timestamp'] || job.created_at || (job.StartDate && `${job.StartDate}T08:00:00Z`)
  if (!startTimestamp) {
    return {
      targetDays,
      targetHours,
      isOnTime: true,
      label: '—',
      badgeClass: 'badge-gray',
      hoursDecimal: 0,
      netHoursDecimal: 0,
      grossHoursDecimal: 0,
      lostHoursDecimal: 0,
      sundayHoursDecimal: 0,
      sundayMinutes: 0,
    }
  }

  const endTimestamp = job.EndTimestamp || job['End Timestamp'] || (job.Status === 'COMPLETED' ? job.updated_at : new Date().toISOString())
  const interruptions = job.Interruption_Logs || job.interruption_logs || job.Lost_Time_Logs || []
  const durationResult = calculateDuration(startTimestamp, endTimestamp, interruptions, excludeSunday)
  const netHours = durationResult.netHoursDecimal

  const isOnTime = netHours <= targetHours
  const isCompleted = job.Status === 'COMPLETED' || job.Status === 'เสร็จสิ้น'

  if (isCompleted) {
    return {
      targetDays,
      targetHours,
      ...durationResult,
      hoursDecimal: netHours,
      isOnTime,
      label: isOnTime ? 'ทันเป้าหมาย (On-Time)' : 'เกินเป้าหมาย (Overdue)',
      badgeClass: isOnTime ? 'badge-green' : 'badge-red',
    }
  }

  // If in progress:
  return {
    targetDays,
    targetHours,
    ...durationResult,
    hoursDecimal: netHours,
    isOnTime,
    label: isOnTime ? `อยู่ในเกณฑ์ (${netHours}/${targetHours}ชม.)` : `เกินเวลา SLA (${netHours}/${targetHours}ชม.)`,
    badgeClass: isOnTime ? 'badge-blue' : 'badge-red',
  }
}

// ============================================================
// Circular Knitting Center Check Constants & Helpers
// ============================================================

export const DEFAULT_SINGLE_CHECKLIST_ITEMS = [
  { no: 1, item: 'กลม cylinder', std: '0.03' },
  { no: 2, item: 'สูงต่ำ cylinder', std: '0.03' },
  { no: 3, item: 'สูงต่ำ cambox cylinder', std: '0.03' },
  { no: 4, item: 'กลม cambox cylinder', std: '0.03' },
  { no: 5, item: 'กลม singer', std: '0.03' },
  { no: 6, item: 'สูงต่ำ singer', std: '0.03' },
  { no: 7, item: 'ระยะห่าง singer', std: '0.15><0.20' },
  { no: 8, item: 'กลม วงแปรง', std: '0.20' },
  { no: 9, item: 'สูง-ต่ำ วงแปรง', std: '0.20' },
  { no: 10, item: 'กลม take down', std: '1.00' },
]

export const DEFAULT_DOUBLE_CHECKLIST_ITEMS = [
  { no: 1, item: 'กลม Cylinder', std: '0.03' },
  { no: 2, item: 'สูง-ต่ำ Cylinder', std: '0.03' },
  { no: 3, item: 'กลม Cambox Cylinder', std: '0.03' },
  { no: 4, item: 'สูง-ต่ำ Cambox Cylinder', std: '0.03' },
  { no: 5, item: 'กลม Dail', std: '0.03' },
  { no: 6, item: 'สูง-ต่ำ Dail', std: '0.03' },
  { no: 7, item: 'ระยะห่าง cambox Dail', std: '0.15><0.20' },
  { no: 8, item: 'กลมสามขา', std: '0.03' },
  { no: 9, item: 'สูงต่ำสามขา', std: '0.03' },
  { no: 10, item: 'สูง-ต่ำ วงแปรง', std: '0.20' },
  { no: 11, item: 'ระยะห่าง แปรง', std: '0.20' },
  { no: 12, item: 'กลม Takedown', std: '1.00' },
]

/**
 * Generates Doc No for Center Checks: CS-S-YYYYMMDD-001 (Single) / CS-D-YYYYMMDD-001 (Double)
 */
export function generateCenterCheckDocNo(type = 'Single', existingRecords = []) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}${mm}${dd}`
  const prefix = type === 'Double' ? `CS-D-${dateStr}-` : `CS-S-${dateStr}-`

  const todayNums = (existingRecords || [])
    .filter((r) => r.doc_no && r.doc_no.startsWith(prefix))
    .map((r) => {
      const parts = r.doc_no.split('-')
      return parseInt(parts[parts.length - 1], 10) || 0
    })

  const maxNum = todayNums.length > 0 ? Math.max(...todayNums) : 0
  const nextSeq = String(maxNum + 1).padStart(3, '0')
  return `${prefix}${nextSeq}`
}
