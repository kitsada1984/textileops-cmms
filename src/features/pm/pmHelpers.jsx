import { startOfDay } from 'date-fns'
import { countWorkingDaysExcludingSundays } from '../../api/entities'

export const PM_IMAGE_FOLDER = 'ประวัติเช็คศูนย์'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'pmplans'|column pmplans\.([^ ]+) does not exist/i

const PM_FIELD_KEYS = {
  Location: 'cyl_th_loc',
  Department: 'pm_th_dept',
  Next_PM_Date: 'pm_th_next',
  Last_PM_Date: 'field_last_pm',
  Assigned_Tech: 'pm_th_tech',
  Priority: 'priority',
  Status: 'status',
  Remark: 'remark',
  Countdown_Days: 'นับถอยหลัง',
  ImageUrl: 'URL',
  ImagePreview: 'รูป',
}

export const normalizeMachineCode = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/\s+/g, '')
  .replace(/-/g, '')
  .trim()

export const normalizeSerial = (value = '') => String(value || '').toUpperCase().replace(/\s+/g, '').trim()

export const uniqueSorted = (values = []) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))

export const matchesText = (value = '', query = '') => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return String(value || '').trim().toLowerCase().includes(q)
}

export const isInUseCylinder = (cyl = {}) =>
  String(cyl?.Machine_Ref || '').trim().toLowerCase().startsWith('in-use')

export function pickCylinderForPM(matches = []) {
  const inUse = matches.filter(isInUseCylinder)
  const withLocation = inUse.filter((c) => String(c.Location || '').trim())
  return withLocation[0] || inUse[0] || null
}

function pickPMKeeper(matches = []) {
  return [...matches].sort((a, b) => {
    const ta = new Date(a.updated_at || a.Last_PM_Date || a.created_at || 0).getTime() || 0
    const tb = new Date(b.updated_at || b.Last_PM_Date || b.created_at || 0).getTime() || 0
    return tb - ta
  })[0] || null
}

export function buildPMBySerial(rows = []) {
  const grouped = new Map()
  rows.forEach((row) => {
    const key = normalizeSerial(row.Machine_KI)
    if (!key) return
    grouped.set(key, [...(grouped.get(key) || []), row])
  })
  return new Map([...grouped.entries()].map(([key, matches]) => {
    const keeper = pickPMKeeper(matches)
    return [key, {
      keeper,
      duplicates: matches.filter((row) => row !== keeper),
    }]
  }))
}

export function getPMLogSnapshot(row = {}) {
  const snapshot = { ...row, Remark: stripImageUrlMeta(row.Remark) }
  Object.keys(snapshot).forEach((key) => {
    if (key.startsWith('__')) delete snapshot[key]
  })
  return snapshot
}

export function normalizeAuditAction(actionType = '') {
  if (actionType === 'CREATE_PLAN') return 'CREATE'
  if (actionType === 'MERGE_DUPLICATE') return 'DELETE'
  return 'UPDATE'
}

function extractImageUrl(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(IMAGE_NOTE_PREFIX))
  return line?.trim().slice(IMAGE_NOTE_PREFIX.length).trim() || ''
}

export function stripImageUrlMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(IMAGE_NOTE_PREFIX))
    .join('\n')
    .trim()
}

export function getPMImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Remark) || ''
}

export function appendPMImageMeta(remark = '', imageUrl = '') {
  const cleanRemark = stripImageUrlMeta(remark)
  return [cleanRemark, imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : ''].filter(Boolean).join('\n')
}

export function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

export function getMissingPMColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

export const getPMFallbackCols = (t) => [
  { field: 'Location', label: 'ตำแหน่ง', type: 'text', width: '100px' },
  { field: 'Machine_MC', label: 'เครื่องปัจจุบัน', type: 'text', width: '140px' },
  { field: 'Machine_KI', label: 'ซีเรียลเดิม', type: 'text', width: '120px' },
  { field: 'Type', label: 'ประเภท', type: 'text', width: '130px' },
  { field: 'PM_Type', label: 'รอบ PM (วัน)', type: 'select', width: '120px' },
  { field: 'Last_PM_Date', label: t('field_last_pm'), type: 'date', width: '120px' },
  { field: 'Next_PM_Date', label: t('pm_th_next'), type: 'date', width: '120px' },
  { field: 'Countdown_Days', label: 'นับถอยหลัง', type: 'number', width: '130px' },
  { field: 'Assigned_Tech', label: t('pm_th_tech'), type: 'text', width: '130px' },
  { field: 'Center_Check', label: 'เช็คศูนย์', type: 'action', width: '200px' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Remark', label: t('remark'), type: 'text', width: '220px' },
]

export function orderPMColumns(cols = []) {
  const withoutLocation = cols.filter((col) => col.field !== 'Location')
  const locationCol = cols.find((col) => col.field === 'Location') || { field: 'Location', label: 'ตำแหน่ง', type: 'text', width: '120px' }
  const machineIndex = withoutLocation.findIndex((col) => col.field === 'Machine_MC')
  if (machineIndex === -1) return [locationCol, ...withoutLocation]
  return [
    ...withoutLocation.slice(0, machineIndex),
    locationCol,
    ...withoutLocation.slice(machineIndex),
  ]
}

export const EMPTY = {
  PM_ID: '',
  PM_Type: 'RUNTIME',
  PM_Cycle_Select: '30',
  Custom_PM_Days: '',
  Machine_MC: '',
  Location: '',
  Machine_KI: '',
  Department: '',
  Frequency_Type: 'CALENDAR',
  Frequency_Value: 30,
  Last_PM_Date: '',
  Next_PM_Date: '',
  Estimated_Hours: 1,
  Assigned_Tech: '',
  Priority: 'MEDIUM',
  Status: 'SCHEDULED',
  Required_Parts: '',
  Downtime_Plan: 0,
  Remark: '',
  CreatedBy: '',
  ImageUrl: '',
}

export const pmColumnLabel = (col, t) => {
  if (col.field === 'Machine_MC') return 'เครื่องปัจจุบัน'
  if (col.field === 'Location') return 'ตำแหน่ง'
  if (col.field === 'Machine_KI') return 'ซีเรียลเดิม'
  if (col.field === 'Type') return 'ประเภท'
  if (col.field === 'Center_Check') return 'เช็คศูนย์'
  if (col.field === 'PM_Type') return 'รอบ PM (วัน)'
  if (col.field === 'Frequency_Value') return 'จำนวนวัน'
  if (col.field === 'Last_PM_Date') return t('field_last_pm')
  if (col.field === 'Next_PM_Date') return t('pm_th_next')
  if (col.field === 'Countdown_Days') return 'นับถอยหลัง'
  return PM_FIELD_KEYS[col.field] ? t(PM_FIELD_KEYS[col.field]) : col.label
}

export function getPMCountdown(date) {
  if (!date) return { days: null, label: '—', color: 'gray' }
  const target = startOfDay(new Date(date))
  const today = startOfDay(new Date())
  if (isNaN(target.getTime())) return { days: null, label: '—', color: 'gray' }

  // Exclude Sundays automatically from working days countdown
  const workingDays = countWorkingDaysExcludingSundays(today, target)

  if (workingDays > 0) return { days: workingDays, label: `เหลือ ${workingDays} วัน`, color: 'green' }
  if (workingDays === 0) return { days: 0, label: 'ครบกำหนดวันนี้', color: 'yellow' }
  return { days: workingDays, label: `เกิน ${Math.abs(workingDays)} วัน`, color: 'red' }
}

export function PMCountdownBadge({ date }) {
  const countdown = getPMCountdown(date)
  const styles = {
    green: { color: '#059669', background: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.28)' },
    yellow: { color: '#d97706', background: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.32)' },
    red: { color: '#dc2626', background: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.3)' },
    gray: { color: 'var(--text-500)', background: 'var(--bg-page)', border: 'var(--border)' },
  }
  const s = styles[countdown.color] || styles.gray
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{
        color: s.color,
        background: s.background,
        border: `1px solid ${s.border}`,
      }}
    >
      {countdown.label}
    </span>
  )
}

export function formatPMCycle(row) {
  const days = Number(row.Frequency_Value)
  if (days > 0) return `${days} วัน`
  if (['30', '60', '90'].includes(String(row.PM_Type))) return `${row.PM_Type} วัน`
  if (row.PM_Type === 'MONTHLY') return '30 วัน'
  if (row.PM_Type === 'QUARTERLY') return '90 วัน'
  if (row.PM_Type === 'CUSTOM') return 'ระบุเอง'
  return row.PM_Type || '—'
}

export function getPMCycleValue(row) {
  const days = Number(row.Frequency_Value)
  if ([30, 60, 90].includes(days)) return String(days)
  if (days > 0) return 'CUSTOM'
  if (row.PM_Type === 'MONTHLY') return '30'
  if (row.PM_Type === 'QUARTERLY') return '90'
  if (['30', '60', '90', 'CUSTOM'].includes(String(row.PM_Type))) return String(row.PM_Type)
  return 'CUSTOM'
}
