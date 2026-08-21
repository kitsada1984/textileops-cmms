import { createEntityClient } from './supabaseClient'

export const MachineAPI         = createEntityClient('machines')
export const CylinderAPI        = createEntityClient('cylinders')
export const WorkOrderAPI       = createEntityClient('workorders')
export const TechnicianAPI      = createEntityClient('technicians')
export const KpiSettingsAPI     = createEntityClient('kpi_settings')
export const PMPlanAPI          = createEntityClient('pmplans')
export const CenterCheckAPI     = createEntityClient('center_checks')
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
 * Calculates duration in decimal hours and human-readable Thai text.
 */
export function calculateDuration(startTimestamp, endTimestamp) {
  if (!startTimestamp || !endTimestamp) {
    return { hoursDecimal: 0, durationText: '—' }
  }
  const start = new Date(startTimestamp)
  const end = new Date(endTimestamp)
  const diffMs = end.getTime() - start.getTime()
  if (isNaN(diffMs) || diffMs < 0) {
    return { hoursDecimal: 0, durationText: '0 นาที' }
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hoursDecimal = Math.round((totalMinutes / 60) * 100) / 100

  const parts = []
  if (hours > 0) parts.push(`${hours} ชม.`)
  if (minutes > 0 || hours === 0) parts.push(`${minutes} นาที`)

  return {
    hoursDecimal,
    durationText: parts.join(' '),
  }
}

/**
 * Evaluates SLA Performance based on Job Type and KPI Target Days.
 */
export function calculateSlaPerformance(job, targetDaysMap = { REPAIR: 1.0, DESIGN: 3.0, PM: 2.0 }) {
  const type = String(job.JobType || job['Job Type'] || 'REPAIR').toUpperCase()
  const targetDays = targetDaysMap[type] || 1.0
  const targetHours = targetDays * 24

  const startTimestamp = job.StartTimestamp || job['Start Timestamp'] || job.created_at || (job.StartDate && `${job.StartDate}T08:00:00Z`)
  if (!startTimestamp) return { targetDays, isOnTime: true, label: '—', badgeClass: 'badge-gray' }

  const endTimestamp = job.EndTimestamp || job['End Timestamp'] || (job.Status === 'COMPLETED' ? job.updated_at : new Date().toISOString())
  const { hoursDecimal } = calculateDuration(startTimestamp, endTimestamp)

  const isOnTime = hoursDecimal <= targetHours
  const isCompleted = job.Status === 'COMPLETED' || job.Status === 'เสร็จสิ้น'

  if (isCompleted) {
    return {
      targetDays,
      hoursDecimal,
      isOnTime,
      label: isOnTime ? 'ทันเป้าหมาย (On-Time)' : 'เกินเป้าหมาย (Overdue)',
      badgeClass: isOnTime ? 'badge-green' : 'badge-red',
    }
  }

  // If in progress:
  return {
    targetDays,
    hoursDecimal,
    isOnTime,
    label: isOnTime ? 'อยู่ในเกณฑ์ (In SLA)' : 'เกินกำหนด (Overdue)',
    badgeClass: isOnTime ? 'badge-blue' : 'badge-orange',
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
  { no: 8, item: 'กลม วงแปรง', std: '0.05' },
  { no: 9, item: 'สูงต่ำ วงแปรง', std: '0.05' },
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
  { no: 8, item: 'สูง-ต่ำ วงแปรง', std: '0.03' },
  { no: 9, item: 'ระยะห่าง แปรง', std: '0.20' },
  { no: 10, item: 'กลม Takedown', std: '1.00' },
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
