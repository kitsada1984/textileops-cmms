import { Activity, Check, Edit, FileText, LogIn, PlusCircle, Trash2, User } from 'lucide-react'
import { format } from 'date-fns'

export const MODULE_DEFINITIONS = {
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

export const ACTION_DEFINITIONS = {
  CREATE: { label: 'เพิ่มข้อมูล (CREATE)', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: PlusCircle },
  UPDATE: { label: 'แก้ไข (UPDATE)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: Edit },
  DELETE: { label: 'ลบข้อมูล (DELETE)', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: Trash2 },
  LOGIN: { label: 'เข้าสู่ระบบ (LOGIN)', color: '#06C755', bg: 'rgba(6,199,85,0.12)', border: 'rgba(6,199,85,0.3)', icon: LogIn },
  SWAP: { label: 'สลับกระบอก (SWAP)', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', icon: Activity },
  CHECK_PLAN: { label: 'ตรวจเช็ค (CHECK)', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', icon: FileText },
}

export const FIELD_NAME_TH = {
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

export function formatLogValue(val, key = '') {
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

export function formatLogComment(comment) {
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

export function parseMaybeJson(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try {
    const parsed = JSON.parse(val)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {}
  return val
}
