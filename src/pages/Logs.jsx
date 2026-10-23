import { useMemo, useState } from 'react'
import {
  RefreshCw,
  Download,
  Eye,
  Activity,
  PlusCircle,
  Edit,
  Trash2,
  LogIn,
  Layers,
  Clock,
  User,
  FileText,
  AlertCircle,
  ArrowRight,
  Filter,
  Copy,
  Check,
  CheckCircle2,
  Tag,
  Sparkles,
} from 'lucide-react'
import { format, isToday, subDays, parseISO } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI } from '../api/entities'
import SearchInput from '../components/ui/SearchInput'
import Modal from '../components/ui/Modal'
import { useT } from '../contexts/LanguageContext'

const MODULE_DEFINITIONS = {
  ALL: { label: 'ทุกโมดูล', color: '#64748b' },
  MACHINE: { label: 'เครื่องจักร', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  CYLINDER: { label: 'กระบอก', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  WORKORDER: { label: 'ใบสั่งงาน', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  PM: { label: 'แผน PM', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  PM_CENTER: { label: 'เช็คศูนย์กระบอก', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
  PM_NEEDLE: { label: 'เช็คสภาพเข็ม', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)' },
  SPARE_PART: { label: 'อะไหล่', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  PURCHASING: { label: 'จัดซื้อ', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)' },
  STOCK: { label: 'เคลื่อนไหวสต็อก', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)' },
  NEEDLE_STOCK: { label: 'สต็อกเข็ม', color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.3)' },
  USER: { label: 'ผู้ใช้งาน', color: '#9333ea', bg: 'rgba(147,51,234,0.12)', border: 'rgba(147,51,234,0.3)' },
  SYSTEM: { label: 'ตั้งค่าระบบ', color: '#475569', bg: 'rgba(71,85,105,0.12)', border: 'rgba(71,85,105,0.3)' },
  DESIGN_BOM: { label: 'Design/BOM', color: '#4f46e5', bg: 'rgba(79,70,229,0.12)', border: 'rgba(79,70,229,0.3)' },
  AUTH: { label: 'ความปลอดภัย/เข้าสู่ระบบ', color: '#06C755', bg: 'rgba(6,199,85,0.12)', border: 'rgba(6,199,85,0.3)' },
  REPAIR_REQUESTS: { label: 'ใบแจ้งซ่อม', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  REPAIR: { label: 'งานซ่อมบำรุง', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  SPARE_NEEDLE: { label: 'เบิก-คืนเข็ม', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' },
}

const ACTION_DEFINITIONS = {
  CREATE: { label: 'เพิ่มข้อมูล (CREATE)', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: PlusCircle },
  UPDATE: { label: 'แก้ไข (UPDATE)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: Edit },
  DELETE: { label: 'ลบข้อมูล (DELETE)', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: Trash2 },
  LOGIN: { label: 'เข้าสู่ระบบ (LOGIN)', color: '#06C755', bg: 'rgba(6,199,85,0.12)', border: 'rgba(6,199,85,0.3)', icon: LogIn },
  SWAP: { label: 'สลับกระบอก (SWAP)', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: Activity },
  CHECK_PLAN: { label: 'ตรวจเช็ค (CHECK)', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', icon: FileText },
}

const FIELD_NAME_TH = {
  // Repair Requests (ใบแจ้งซ่อม)
  status: 'สถานะ',
  technician_name: 'ช่างผู้รับผิดชอบ',
  approval_notes: 'บันทึกคำสั่งหัวหน้างาน',
  approved_at: 'เวลาที่อนุมัติ',
  approved_by: 'ผู้อนุมัติ',
  reported_by: 'ผู้แจ้งซ่อม',
  repair_type: 'ประเภทงานซ่อม',
  machine_mc: 'เครื่องจักร (MC)',
  cylinder_serial: 'ซีเรียลกระบอก',
  Design: 'แบบผ้า (Design)',
  problem_details: 'รายละเอียดอาการเสีย',
  problem_cause: 'สาเหตุของปัญหา',
  repair_details: 'รายละเอียดการซ่อม',
  parts_used: 'อะไหล่ที่ใช้',
  downtime_minutes: 'เวลาเครื่องหยุด (นาที)',
  completed_at: 'เวลาที่ซ่อมเสร็จ',
  created_at: 'เวลาที่สร้าง / แจ้งงาน',
  created_date: 'วันที่บันทึก',
  request_no: 'เลขที่ใบแจ้งซ่อม',
  request_id: 'รหัสคำขอแจ้งซ่อม',
  priority: 'ระดับความเร่งด่วน',
  mc: 'รหัสเครื่องจักร (MC)',
  notes: 'หมายเหตุเพิ่มเติม',

  // Work Orders (ใบสั่งงาน)
  Job_ID: 'เลขที่ใบสั่งงาน',
  MC: 'รหัสเครื่องจักร (MC)',
  KI: 'รหัสผ้า (KI)',
  JobType: 'ประเภทใบสั่งงาน',
  Status: 'สถานะใบสั่งงาน',
  Technicians: 'ช่างผู้รับผิดชอบ',
  StartDate: 'วันที่เริ่มงาน',
  StartTime: 'เวลาเริ่มงาน',
  EndDate: 'วันที่จบงาน',
  EndTime: 'เวลาจบงาน',
  Comment: 'หมายเหตุ / รายละเอียด',
  TotalDowntimeMinutes: 'เวลาหยุดงานรวม (นาที)',
  CreatedBy: 'ผู้บันทึกข้อมูล',

  // Cylinders (กระบอก)
  Serial_NOW: 'ซีเรียลปัจจุบัน',
  Serial_OLD: 'ซีเรียลเดิม',
  Location: 'สถานที่จัดเก็บ',
  NewMC: 'เครื่องปัจจุบัน (MC)',
  Machine_Ref: 'สถานะเครื่องจักร',
  Standard: 'มาตรฐานเครื่อง',
  Feeder: 'ฟีดเดอร์ (Feeder)',
  Type: 'ประเภทกระบอก',
  Diameter: 'ขนาดเส้นผ่านศูนย์กลาง (Dia)',
  Gauge: 'เกจ (Gauge)',
  Needle: 'จำนวนเข็ม (Needle)',
  Manufacturer: 'ผู้ผลิต',
  Status_Now: 'สถานะปัจจุบัน',
  Last_Check_Date: 'วันที่ตรวจเช็คล่าสุด',

  // Machines (เครื่องจักร)
  brand: 'ยี่ห้อเครื่องจักร',
  model: 'รุ่นเครื่องจักร',
  year: 'ปีที่ผลิต',
  speed: 'ความเร็วรอบ',
  zone: 'โซน / แผนก',

  // Spare Parts & Purchasing (อะไหล่และจัดซื้อ)
  Part_Code: 'รหัสอะไหล่',
  Part_Name_EN: 'ชื่ออะไหล่ (อังกฤษ)',
  Part_Name_TH: 'ชื่ออะไหล่ (ไทย)',
  Category: 'หมวดหมู่อะไหล่',
  Quantity: 'จำนวน',
  Stock: 'สต็อกคงเหลือ',
  MinStock: 'สต็อกขั้นต่ำ',
  MaxStock: 'สต็อกสูงสุด',
  UnitPrice: 'ราคาต่อหน่วย',
  TotalPrice: 'ราคารวม',
  Supplier: 'ผู้จัดจำหน่าย',
  PO_Number: 'เลขที่ใบสั่งซื้อ (PO)',
  Unit: 'หน่วยนับ',
  Txn_Type: 'ประเภทการเคลื่อนไหวสต็อก',
  Doc_Ref: 'เอกสารอ้างอิง',

  // Users (ผู้ใช้งาน)
  username: 'ชื่อผู้ใช้',
  full_name: 'ชื่อ-นามสกุล',
  role: 'สิทธิ์การใช้งาน (Role)',
  email: 'อีเมล',
  phone: 'เบอร์โทรศัพท์',
  line_user_id: 'LINE User ID',
  line_display_name: 'ชื่อที่แสดงใน LINE',
  is_active: 'สถานะการใช้งาน',
  updated_at: 'เวลาที่อัปเดตล่าสุด',
  is_deleted: 'สถานะการลบ',
}

const STATUS_VALUE_TH = {
  PENDING: { label: 'รอดำเนินการ / รออนุมัติ (PENDING)', color: 'amber' },
  APPROVED: { label: 'อนุมัติแล้ว (APPROVED)', color: 'emerald' },
  REJECTED: { label: 'ไม่อนุมัติ / ปฏิเสธ (REJECTED)', color: 'rose' },
  IN_PROGRESS: { label: 'กำลังซ่อม / ดำเนินการ (IN_PROGRESS)', color: 'blue' },
  WAITING_PARTS: { label: 'รออะไหล่ (WAITING_PARTS)', color: 'amber' },
  COMPLETED: { label: 'ปิดงาน / เสร็จสิ้น (COMPLETED)', color: 'emerald' },
  CANCELLED: { label: 'ยกเลิกแล้ว (CANCELLED)', color: 'slate' },
  ORDERED: { label: 'สั่งซื้อแล้ว (ORDERED)', color: 'blue' },
  RECEIVED: { label: 'รับของแล้ว (RECEIVED)', color: 'emerald' },
  ACTIVE: { label: 'เปิดใช้งาน (ACTIVE)', color: 'emerald' },
  INACTIVE: { label: 'ปิดใช้งาน (INACTIVE)', color: 'slate' },
  STANDARD: { label: 'มาตรฐานปกติ (STANDARD)', color: 'emerald' },
  SERVICE: { label: 'ต้องตรวจเช็ค (SERVICE)', color: 'amber' },
  REPAIR: { label: 'งานซ่อม (REPAIR)', color: 'rose' },
  EASY: { label: 'งานง่าย (EASY)', color: 'blue' },
  URGENT: { label: 'เร่งด่วน (URGENT)', color: 'rose' },
  NORMAL: { label: 'ปกติ (NORMAL)', color: 'slate' },
}

function formatLogValue(val, key = '') {
  if (val === null || val === undefined) {
    return {
      type: 'empty',
      text: 'ไม่มีข้อมูล (ว่าง)',
      display: <span className="text-slate-400 dark:text-slate-500 italic text-xs">ไม่มีข้อมูล (ว่าง)</span>,
    }
  }

  if (typeof val === 'string' && val.trim() === '') {
    return {
      type: 'empty',
      text: '(เว้นว่าง)',
      display: <span className="text-slate-400 dark:text-slate-500 italic text-xs">(เว้นว่าง)</span>,
    }
  }

  if (typeof val === 'boolean') {
    return {
      type: 'boolean',
      text: val ? 'ใช่ (True)' : 'ไม่ใช่ (False)',
      display: (
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-bold inline-block ${
            val
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {val ? 'ใช่ / เปิดใช้งาน (True)' : 'ไม่ใช่ / ปิดใช้งาน (False)'}
        </span>
      ),
    }
  }

  // Check if value is a known status code
  if (typeof val === 'string' && STATUS_VALUE_TH[val.trim()]) {
    const meta = STATUS_VALUE_TH[val.trim()]
    const colorClasses = {
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
      amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
      slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    }[meta.color] || 'bg-slate-100 text-slate-700'

    return {
      type: 'status',
      text: meta.label,
      display: (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClasses}`}>
          {meta.label}
        </span>
      ),
    }
  }

  // Check if string is an ISO timestamp (e.g. 2026-10-23T06:32:29.695Z)
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    try {
      const d = new Date(val)
      if (!isNaN(d.getTime())) {
        const thaiDate = format(d, 'dd/MM/yyyy HH:mm:ss')
        return {
          type: 'date',
          text: thaiDate,
          display: (
            <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
              {thaiDate}
              <span className="block text-[10px] text-slate-400 font-mono font-normal mt-0.5">
                (เวลาสากล: {val})
              </span>
            </span>
          ),
        }
      }
    } catch {}
  }

  // Object / JSON
  if (typeof val === 'object') {
    return {
      type: 'json',
      text: JSON.stringify(val),
      display: (
        <pre className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 max-h-36 overflow-auto">
          {JSON.stringify(val, null, 2)}
        </pre>
      ),
    }
  }

  // Standard Text / Number
  return {
    type: 'text',
    text: String(val),
    display: <span className="font-semibold text-slate-800 dark:text-slate-100 break-words">{String(val)}</span>,
  }
}

function formatLogComment(comment) {
  if (!comment) return 'ไม่มีคำอธิบายเพิ่มเติม'

  return comment
    .replace(/\brepair_requests\b/gi, 'ใบแจ้งซ่อม (repair_requests)')
    .replace(/\bworkorders\b/gi, 'ใบสั่งงาน (workorders)')
    .replace(/\bcylinders\b/gi, 'กระบอก (cylinders)')
    .replace(/\bmachines\b/gi, 'เครื่องจักร (machines)')
    .replace(/\bspare_parts\b/gi, 'อะไหล่ (spare_parts)')
    .replace(/\busers\b/gi, 'ผู้ใช้งาน (users)')
    .replace(/\bneedle_stock\b/gi, 'สต็อกเข็ม (needle_stock)')
}

function parseMaybeJson(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try {
    const parsed = JSON.parse(val)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}
  return val
}

export default function Logs() {
  const { t } = useT()
  const { data = [], loading, load } = useEntity(AuditLogAPI)
  const [search, setSearch] = useState('')
  const [selectedModule, setSelectedModule] = useState('ALL')
  const [selectedAction, setSelectedAction] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [dateRange, setDateRange] = useState('all') // 'all' | 'today' | '7d' | '30d'
  const [inspectLog, setInspectLog] = useState(null)
  const [copiedRecordId, setCopiedRecordId] = useState(false)

  // Sort logs: newest first
  const sortedLogs = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.created_date || a.created_at || 0).getTime()
      const dateB = new Date(b.created_date || b.created_at || 0).getTime()
      return dateB - dateA
    })
  }, [data])

  // Extract unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const set = new Set()
    data.forEach((l) => {
      if (l.User) set.add(l.User.trim())
    })
    return Array.from(set).sort()
  }, [data])

  // Filtered rows
  const displayRows = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)
    const thirtyDaysAgo = subDays(now, 30)

    return sortedLogs.filter((l) => {
      // 1. Text Search
      if (search) {
        const query = search.toLowerCase()
        const match = [
          l.Module,
          l.ActionType,
          l.RecordID,
          l.User,
          l.FieldName,
          l.Comment,
          l.NewValue,
          l.OldValue,
        ].some((v) => String(v || '').toLowerCase().includes(query))
        if (!match) return false
      }

      // 2. Module Filter
      if (selectedModule !== 'ALL') {
        const mod = (l.Module || '').toUpperCase()
        if (mod !== selectedModule) return false
      }

      // 3. Action Filter
      if (selectedAction !== 'ALL') {
        const act = (l.ActionType || '').toUpperCase()
        if (act !== selectedAction) return false
      }

      // 4. User Filter
      if (selectedUser !== 'ALL') {
        if ((l.User || '').trim() !== selectedUser) return false
      }

      // 5. Date Range Filter
      if (dateRange !== 'all') {
        const dateStr = l.created_date || l.created_at
        if (!dateStr) return false
        try {
          const logDate = new Date(dateStr)
          if (dateRange === 'today' && !isToday(logDate)) return false
          if (dateRange === '7d' && logDate < sevenDaysAgo) return false
          if (dateRange === '30d' && logDate < thirtyDaysAgo) return false
        } catch {
          return false
        }
      }

      return true
    })
  }, [sortedLogs, search, selectedModule, selectedAction, selectedUser, dateRange])

  // KPI Calculations
  const stats = useMemo(() => {
    let creates = 0
    let updates = 0
    let deletes = 0
    let logins = 0

    data.forEach((l) => {
      const act = (l.ActionType || '').toUpperCase()
      if (act === 'CREATE') creates++
      else if (act === 'UPDATE' || act === 'SWAP') updates++
      else if (act === 'DELETE') deletes++
      else if (act === 'LOGIN') logins++
    })

    return {
      total: data.length,
      creates,
      updates,
      deletes,
      logins,
    }
  }, [data])

  // Export CSV Handler
  const handleExportCsv = () => {
    if (displayRows.length === 0) return

    const headers = ['วัน-เวลา', 'ผู้ใช้งาน', 'การกระทำ', 'โมดูล', 'รหัสอ้างอิง', 'ฟิลด์ที่เปลี่ยน', 'ค่าเดิม', 'ค่าใหม่', 'หมายเหตุ']
    const csvRows = [headers.join(',')]

    displayRows.forEach((r) => {
      const dt = (r.created_date || r.created_at) ? format(new Date(r.created_date || r.created_at), 'yyyy-MM-dd HH:mm:ss') : ''
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`

      csvRows.push([
        escape(dt),
        escape(r.User || ''),
        escape(r.ActionType || ''),
        escape(r.Module || ''),
        escape(r.RecordID || ''),
        escape(r.FieldName || ''),
        escape(r.OldValue || ''),
        escape(r.NewValue || ''),
        escape(r.Comment || ''),
      ].join(','))
    })

    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TextileOps_AuditLogs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="text-blue-600 dark:text-blue-400" size={22} />
            <span>ประวัติกิจกรรม &amp; ตรวจสอบระบบ (Audit Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            บันทึกการกระทำทุกรายการอัตโนมัติ: ใครเป็นคนเข้ามา เพิ่ม ลบ แก้ไข อะไร ในระบบ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayRows.length === 0}
            className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold"
            title="ส่งออกรายงานเป็นไฟล์ CSV"
          >
            <Download size={14} />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-outline flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            กิจกรรมทั้งหมด
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              เพิ่มข้อมูล (CREATE)
            </span>
            <PlusCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.creates.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              แก้ไข (UPDATE)
            </span>
            <Edit size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.updates.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              ลบข้อมูล (DELETE)
            </span>
            <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.deletes.toLocaleString()}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              เข้าสู่ระบบ (LOGIN)
            </span>
            <LogIn size={14} className="text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {stats.logins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Filters & Controls Bar ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Top row: search + quick date pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ค้นหาชื่อผู้ใช้, รหัสรายการ, หรือคำอธิบาย..."
            />
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 self-start md:self-auto overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'today', label: 'วันนี้' },
              { id: '7d', label: '7 วันล่าสุด' },
              { id: '30d', label: '30 วันล่าสุด' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDateRange(id)}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  dateRange === id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              โมดูล / เมนู
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกโมดูล (ทั้งหมด)</option>
              {Object.entries(MODULE_DEFINITIONS)
                .filter(([k]) => k !== 'ALL')
                .map(([code, def]) => (
                  <option key={code} value={code}>
                    {def.label} ({code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              ประเภทการกระทำ (Action)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกการกระทำ (ทั้งหมด)</option>
              <option value="CREATE">เพิ่มข้อมูลใหม่ (CREATE)</option>
              <option value="UPDATE">แก้ไขข้อมูล (UPDATE)</option>
              <option value="DELETE">ลบข้อมูล (DELETE)</option>
              <option value="LOGIN">เข้าสู่ระบบ (LOGIN)</option>
              <option value="SWAP">สลับกระบอก (SWAP)</option>
              <option value="CHECK_PLAN">ตรวจเช็ค (CHECK_PLAN)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              ผู้ใช้งาน (User)
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="select w-full text-xs"
            >
              <option value="ALL">ทุกคน ({uniqueUsers.length} ท่าน)</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Logs Data Table ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 145 }}>วัน-เวลา</th>
              <th style={{ width: 140 }}>ผู้ใช้งาน</th>
              <th style={{ width: 120 }}>การกระทำ</th>
              <th style={{ width: 130 }}>โมดูล</th>
              <th style={{ width: 110 }}>รหัสอ้างอิง</th>
              <th>รายละเอียดกิจกรรม</th>
              <th style={{ width: 60, textAlign: 'center' }}>ตรวจสอบ</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="spinner-gemini" style={{ width: 24, height: 24 }} />
                    <span className="text-xs font-semibold">{t('loading')}</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              displayRows.map((l, i) => {
                const actDef = ACTION_DEFINITIONS[l.ActionType] || {
                  label: l.ActionType || 'ACTION',
                  color: '#64748b',
                  bg: 'rgba(100,116,139,0.12)',
                  border: 'rgba(100,116,139,0.3)',
                }
                const modDef = MODULE_DEFINITIONS[l.Module] || {
                  label: l.Module || 'GENERAL',
                  color: '#64748b',
                  bg: 'rgba(100,116,139,0.12)',
                  border: 'rgba(100,116,139,0.3)',
                }
                const rawDate = l.created_date || l.created_at
                const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yy HH:mm:ss') : '—'

                return (
                  <tr
                    key={l._id || l.id || i}
                    onClick={() => setInspectLog(l)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* Timestamp */}
                    <td className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono">
                      {formattedDate}
                    </td>

                    {/* User */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase flex-shrink-0"
                          style={{
                            background:
                              l.ActionType === 'DELETE'
                                ? '#ef4444'
                                : l.ActionType === 'LOGIN'
                                ? '#06C755'
                                : '#3b82f6',
                          }}
                        >
                          {(l.User || '?')[0]}
                        </div>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={l.User}>
                          {l.User || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold"
                        style={{
                          color: actDef.color,
                          backgroundColor: actDef.bg,
                          border: `1px solid ${actDef.border}`,
                        }}
                      >
                        {actDef.icon && <actDef.icon size={11} />}
                        <span>{l.ActionType || '—'}</span>
                      </span>
                    </td>

                    {/* Module Badge */}
                    <td>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold truncate max-w-[120px]"
                        style={{
                          color: modDef.color,
                          backgroundColor: modDef.bg,
                          border: `1px solid ${modDef.border}`,
                        }}
                        title={l.Module}
                      >
                        {modDef.label}
                      </span>
                    </td>

                    {/* Record ID */}
                    <td className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate max-w-[100px]" title={l.RecordID}>
                      {l.RecordID || '—'}
                    </td>

                    {/* Comment / Details summary */}
                    <td className="text-xs text-slate-700 dark:text-slate-300 max-w-[280px] truncate" title={l.Comment || l.FieldName || ''}>
                      {l.Comment || (l.FieldName ? `แก้ไขฟิลด์: ${l.FieldName}` : '—')}
                    </td>

                    {/* Inspect Button */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectLog(l)
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                        title="ดูรายละเอียดการเปลี่ยนแปลง"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}

            {!loading && !displayRows.length && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex flex-col items-center gap-1">
                    <AlertCircle size={24} className="opacity-40" />
                    <span className="text-xs font-semibold">{t('no_data')}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Audit Log Detail & Diff Modal ── */}
      {inspectLog && (
        <Modal
          open={Boolean(inspectLog)}
          onClose={() => setInspectLog(null)}
          title="รายละเอียดบันทึกกิจกรรม (Audit Log Detail)"
          size="lg"
          footer={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setInspectLog(null)}
            >
              ปิดหน้าต่าง
            </button>
          }
        >
          <div className="space-y-4">
            {/* 1. Meta Header Grid */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. วัน-เวลา */}
                <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <Clock size={13} className="text-blue-500" />
                    วัน-เวลาที่ทำรายการ
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 block">
                    {(inspectLog.created_date || inspectLog.created_at)
                      ? format(new Date(inspectLog.created_date || inspectLog.created_at), 'dd/MM/yyyy HH:mm:ss')
                      : '—'}
                  </span>
                </div>

                {/* 2. ผู้ดำเนินการ */}
                <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <User size={13} className="text-purple-500" />
                    ผู้ดำเนินการ
                  </span>
                  <div className="mt-1">
                    {inspectLog.User?.startsWith('line_') ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-full">
                        <span className="w-2 h-2 rounded-full bg-[#06c755] shrink-0" />
                        LINE: {inspectLog.User}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block truncate">
                        {inspectLog.User || '—'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. การกระทำ */}
                <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <Activity size={13} className="text-amber-500" />
                    การกระทำ
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const act = ACTION_DEFINITIONS[inspectLog.ActionType]
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold"
                          style={{
                            color: act?.color || '#f59e0b',
                            backgroundColor: act?.bg || 'rgba(245,158,11,0.12)',
                          }}
                        >
                          {act?.label || inspectLog.ActionType || '—'}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* 4. โมดูล / เมนู */}
                <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <Layers size={13} className="text-indigo-500" />
                    โมดูล / เมนู
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const mod = MODULE_DEFINITIONS[inspectLog.Module]
                      return (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
                          style={{
                            color: mod?.color || '#3b82f6',
                            backgroundColor: mod?.bg || 'rgba(59,130,246,0.12)',
                          }}
                        >
                          {mod?.label || inspectLog.Module || '—'}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. คำอธิบาย / รหัสอ้างอิง */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <FileText size={13} />
                คำอธิบาย / รหัสอ้างอิง
              </span>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {formatLogComment(inspectLog.Comment)}
                </div>

                {inspectLog.RecordID && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">รหัสอ้างอิง (Record ID):</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(inspectLog.RecordID)
                          }
                          setCopiedRecordId(true)
                          setTimeout(() => setCopiedRecordId(false), 2000)
                        }}
                        className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="คลิกเพื่อคัดลอกรหัสอ้างอิง"
                      >
                        {copiedRecordId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedRecordId ? 'คัดลอกรหัสแล้ว!' : inspectLog.RecordID}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Extracted changed fields tags */}
                {(() => {
                  const match = inspectLog.Comment?.match(/\(([^)]+)\)/)
                  if (!match) return null
                  const fields = match[1]
                    .split(',')
                    .map((f) => f.trim())
                    .filter((f) => FIELD_NAME_TH[f] && !f.startsWith('รหัส'))
                  if (fields.length === 0) return null

                  return (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500">
                        ฟิลด์ที่ได้รับการแก้ไข ({fields.length}):
                      </span>
                      {fields.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-bold"
                        >
                          {FIELD_NAME_TH[f] || f}
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 3. Diff / Comparison Section */}
            {(() => {
              const oldVal = parseMaybeJson(inspectLog.OldValue)
              const newVal = parseMaybeJson(inspectLog.NewValue)

              const isOldObj = oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal)
              const isNewObj = newVal && typeof newVal === 'object' && !Array.isArray(newVal)

              if (isOldObj && isNewObj) {
                // Side-by-side key-value comparison
                const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]))
                  .filter((k) => k !== '_id' && k !== 'password' && k !== 'password_hash')

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        การเปรียบเทียบข้อมูล (Before vs After)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        แสดงข้อมูล {allKeys.length} ฟิลด์
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs text-xs bg-white dark:bg-slate-900">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                            <th className="p-3 text-left font-bold w-1/3">ชื่อฟิลด์ (Field)</th>
                            <th className="p-3 text-left font-bold w-1/3 text-rose-600 dark:text-rose-400">ค่าเดิม (Before)</th>
                            <th className="p-3 text-left font-bold w-1/3 text-emerald-600 dark:text-emerald-400">ค่าใหม่ (After)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {allKeys.map((key) => {
                            const o = oldVal[key]
                            const n = newVal[key]
                            const changed = JSON.stringify(o) !== JSON.stringify(n)
                            const thaiName = FIELD_NAME_TH[key] || key
                            const formattedOld = formatLogValue(o, key)
                            const formattedNew = formatLogValue(n, key)

                            return (
                              <tr
                                key={key}
                                className={`transition-colors ${
                                  changed
                                    ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 font-semibold'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="p-3 align-top">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                    {thaiName}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                                    {key}
                                  </span>
                                  {changed && (
                                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                      แก้ไขแล้ว
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-top bg-rose-50/20 dark:bg-rose-950/10">
                                  {formattedOld.display}
                                </td>
                                <td className="p-3 align-top bg-emerald-50/20 dark:bg-emerald-950/10">
                                  {formattedNew.display}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              // Fallback: render raw Old / New blocks if string or single values
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inspectLog.OldValue && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                        ค่าเดิม (Before)
                      </span>
                      <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs">
                        {formatLogValue(inspectLog.OldValue).display}
                      </div>
                    </div>
                  )}

                  {inspectLog.NewValue && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                        ค่าใหม่ (After)
                      </span>
                      <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs">
                        {formatLogValue(inspectLog.NewValue).display}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </Modal>
      )}
    </div>
  )
}
