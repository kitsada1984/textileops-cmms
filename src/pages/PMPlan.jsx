import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  ScrollText,
  Layers,
  Target,
  Disc,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Zap,
} from 'lucide-react'
import { format, addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI, CylinderAPI, PMPlanAPI, CenterCheckAPI, PM_TYPE, PM_STATUS, WO_PRIORITY } from '../api/entities'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import { useToast } from '../components/ui/Toast'
import F from '../components/ui/FormField'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { applyFilterSort } from '../utils/filterSort'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import { useAuth } from '../contexts/AuthContext'
import PMLog from './PMLog'
import CenterCheck from './CenterCheck'
import NeedleCondition from './NeedleCondition'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generatePMPlanPdfProps } from '../utils/pdfDocGenerators'

const PM_IMAGE_FOLDER = 'ประวัติเช็คศูนย์'
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

const normalizeMachineCode = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/\s+/g, '')
  .replace(/-/g, '')
  .trim()

const normalizeSerial = (value = '') => String(value || '').toUpperCase().replace(/\s+/g, '').trim()

const uniqueSorted = (values = []) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))

const matchesText = (value = '', query = '') => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return String(value || '').trim().toLowerCase().includes(q)
}

const isInUseCylinder = (cyl = {}) =>
  String(cyl?.Machine_Ref || '').trim().toLowerCase().startsWith('in-use')

function pickCylinderForPM(matches = []) {
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

function buildPMBySerial(rows = []) {
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

function getPMLogSnapshot(row = {}) {
  const snapshot = { ...row, Remark: stripImageUrlMeta(row.Remark) }
  Object.keys(snapshot).forEach((key) => {
    if (key.startsWith('__')) delete snapshot[key]
  })
  return snapshot
}

function normalizeAuditAction(actionType = '') {
  if (actionType === 'CREATE_PLAN') return 'CREATE'
  if (actionType === 'MERGE_DUPLICATE') return 'DELETE'
  return 'UPDATE'
}

function extractImageUrl(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(IMAGE_NOTE_PREFIX))
  return line?.trim().slice(IMAGE_NOTE_PREFIX.length).trim() || ''
}

function stripImageUrlMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith(IMAGE_NOTE_PREFIX))
    .join('\n')
    .trim()
}

function getPMImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Remark) || ''
}

function appendPMImageMeta(remark = '', imageUrl = '') {
  const cleanRemark = stripImageUrlMeta(remark)
  return [cleanRemark, imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : ''].filter(Boolean).join('\n')
}

function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

function getMissingPMColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

const getPMFallbackCols = (t) => [
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

function orderPMColumns(cols = []) {
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

const EMPTY = {
  PM_ID: '',
  PM_Type: '30',
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

const pmColumnLabel = (col, t) => {
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

function getPMCountdown(date) {
  if (!date) return { days: null, label: '—', color: 'gray' }
  const days = differenceInCalendarDays(startOfDay(new Date(date)), startOfDay(new Date()))
  if (!Number.isFinite(days)) return { days: null, label: '—', color: 'gray' }
  if (days > 0) return { days, label: `เหลือ ${days} วัน`, color: 'green' }
  if (days === 0) return { days, label: 'ครบกำหนดวันนี้', color: 'yellow' }
  return { days, label: `เกิน ${Math.abs(days)} วัน`, color: 'red' }
}

function PMCountdownBadge({ date }) {
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

function formatPMCycle(row) {
  const days = Number(row.Frequency_Value)
  if (days > 0) return `${days} วัน`
  if (['30', '60', '90'].includes(String(row.PM_Type))) return `${row.PM_Type} วัน`
  if (row.PM_Type === 'MONTHLY') return '30 วัน'
  if (row.PM_Type === 'QUARTERLY') return '90 วัน'
  if (row.PM_Type === 'CUSTOM') return 'ระบุเอง'
  return row.PM_Type || '—'
}

function getPMCycleValue(row) {
  const days = Number(row.Frequency_Value)
  if ([30, 60, 90].includes(days)) return String(days)
  if (days > 0) return 'CUSTOM'
  if (row.PM_Type === 'MONTHLY') return '30'
  if (row.PM_Type === 'QUARTERLY') return '90'
  if (['30', '60', '90', 'CUSTOM'].includes(String(row.PM_Type))) return String(row.PM_Type)
  return 'CUSTOM'
}

export default function PMPlan({ defaultTab = 'plan' }) {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('pm')
  const { user } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [centerCheckPreset, setCenterCheckPreset] = useState(null)

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab)
  }, [defaultTab])

  const { data, loading, load, save, remove } = useEntity(PMPlanAPI)
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal, setModal] = useState(false)
  const [syncModal, setSyncModal] = useState(false)
  const [syncForm, setSyncForm] = useState({
    Location: '',
    Machine_MC: '',
    Machine_KI: '',
    PM_Cycle: '90',
    Custom_PM_Days: '',
    Last_PM_Date: '',
    Assigned_Tech: '',
    ImageUrl: '',
    Remark: '',
  })
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [syncingPM, setSyncingPM] = useState(false)
  const [cylinders, setCylinders] = useState([])
  const autoSyncDoneRef = useRef(false)
  const syncingRef = useRef(false)

  useEffect(() => {
    CylinderAPI.list()
      .then(setCylinders)
      .catch(() => setCylinders([]))
  }, [])

  const cylWbCols = useWebBuilderMenu('/cylinders')
  const cylCurrentMachineField = useMemo(() => {
    if (!cylWbCols) return 'NewMC'
    const col = cylWbCols.find((c) =>
      c.field === 'NewMC' ||
      String(c.label).toLowerCase().replace(/\s+/g, '') === 'currentmachine' ||
      String(c.label).includes('เครื่องปัจจุบัน')
    )
    return col?.field || 'NewMC'
  }, [cylWbCols])

  const cylinderByCurrentMachine = useMemo(() => {
    const grouped = new Map()
    cylinders.forEach((cyl) => {
      const key = normalizeMachineCode(cyl?.[cylCurrentMachineField])
      if (!key) return
      grouped.set(key, [...(grouped.get(key) || []), cyl])
    })
    return new Map([...grouped.entries()].map(([key, matches]) => [key, pickCylinderForPM(matches)]))
  }, [cylCurrentMachineField, cylinders])

  const cylinderBySerial = useMemo(() => {
    const grouped = new Map()
    cylinders.forEach((cyl) => {
      const key = normalizeSerial(cyl.Serial_OLD)
      if (!key || !isInUseCylinder(cyl)) return
      grouped.set(key, [...(grouped.get(key) || []), cyl])
    })
    return new Map([...grouped.entries()].map(([key, matches]) => [key, pickCylinderForPM(matches)]))
  }, [cylinders])

  const pmBySerial = useMemo(() => buildPMBySerial(data), [data])
  const uniquePMRows = useMemo(() => [...pmBySerial.values()].map((entry) => entry.keeper).filter(Boolean), [pmBySerial])

  const getPMCylinder = (pm = {}) => cylinderBySerial.get(normalizeSerial(pm.Machine_KI)) || null

  const getPMMachine = (pm = {}) => {
    const cyl = getPMCylinder(pm)
    return String(cyl?.[cylCurrentMachineField] || pm.Machine_MC || '').trim()
  }

  const getPMLocation = (pm = {}) => {
    return getPMCylinder(pm)?.Location ||
      pm.Location ||
      cylinderByCurrentMachine.get(normalizeMachineCode(pm.Machine_MC))?.Location ||
      ''
  }

  const getPMCylinderType = (pm = {}) => {
    const cyl = getPMCylinder(pm) || cylinderByCurrentMachine.get(normalizeMachineCode(pm.Machine_MC))
    return String(cyl?.Type || pm.Type || '').trim()
  }

  const cylinderPMSource = useMemo(() => (
    [...cylinderBySerial.values()]
      .filter((cyl) => isInUseCylinder(cyl))
      .filter((cyl) => String(cyl?.[cylCurrentMachineField] || '').trim() && String(cyl?.Serial_OLD || '').trim())
  ), [cylCurrentMachineField, cylinderBySerial])

  const syncLocationOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map((cyl) => cyl.Location)),
    [cylinderPMSource]
  )
  const syncMachineOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map((cyl) => cyl?.[cylCurrentMachineField])),
    [cylCurrentMachineField, cylinderPMSource]
  )
  const syncSerialOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map((cyl) => cyl.Serial_OLD)),
    [cylinderPMSource]
  )

  const syncCylinderSource = useMemo(() => (
    cylinderPMSource.filter((cyl) =>
      matchesText(cyl.Location, syncForm.Location) &&
      matchesText(cyl?.[cylCurrentMachineField], syncForm.Machine_MC) &&
      matchesText(cyl.Serial_OLD, syncForm.Machine_KI)
    )
  ), [cylCurrentMachineField, cylinderPMSource, syncForm.Location, syncForm.Machine_KI, syncForm.Machine_MC])

  const cylinderDrivenPMRows = useMemo(() => {
    return cylinderPMSource.map((cyl) => {
      const serialOld = String(cyl?.Serial_OLD || '').trim()
      const machine = String(cyl?.[cylCurrentMachineField] || '').trim()
      const location = String(cyl?.Location || '').trim()
      const type = String(cyl?.Type || '').trim()
      const existing = pmBySerial.get(normalizeSerial(serialOld))?.keeper
      return {
        ...(existing || {}),
        Machine_KI: serialOld,
        Machine_MC: machine,
        Location: location,
        Type: type,
        PM_Type: 'RUNTIME',
        Frequency_Type: 'CALENDAR',
        Frequency_Value: 90,
        Priority: existing?.Priority || 'MEDIUM',
        Status: existing?.Status || 'SCHEDULED',
        __hasPMPlan: Boolean(existing),
      }
    })
  }, [cylCurrentMachineField, cylinderPMSource, pmBySerial])

  const pmSyncPreviewRows = useMemo(() => {
    const localPMBySerial = buildPMBySerial(data)
    return syncCylinderSource.map((cyl) => {
      const serialOld = String(cyl?.Serial_OLD || '').trim()
      const machine = String(cyl?.[cylCurrentMachineField] || '').trim()
      const location = String(cyl?.Location || '').trim()
      const existing = localPMBySerial.get(normalizeSerial(serialOld))?.keeper
      const duplicates = localPMBySerial.get(normalizeSerial(serialOld))?.duplicates || []
      const changed = existing && (
        String(existing.Machine_MC || '') !== machine ||
        String(existing.Location || '') !== location
      )
      return {
        serialOld,
        machine,
        location,
        cycle: '',
        action: existing ? (changed ? 'อัพเดต' : 'เพิ่ม Log') : 'เพิ่มใหม่',
        duplicateCount: duplicates.length,
      }
    })
  }, [cylCurrentMachineField, data, syncCylinderSource])

  const syncCycleDays = useMemo(() => {
    const raw = syncForm.PM_Cycle === 'CUSTOM' ? syncForm.Custom_PM_Days : syncForm.PM_Cycle
    const days = Number(raw)
    return Number.isFinite(days) && days > 0 ? days : 0
  }, [syncForm.Custom_PM_Days, syncForm.PM_Cycle])

  const syncNextPMDate = useMemo(() => {
    if (!syncForm.Last_PM_Date || !syncCycleDays) return ''
    try {
      return format(addDays(new Date(syncForm.Last_PM_Date), syncCycleDays), 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }, [syncCycleDays, syncForm.Last_PM_Date])

  const openSyncPMModal = () => {
    setSyncForm((prev) => ({
      ...prev,
      Last_PM_Date: prev.Last_PM_Date || format(new Date(), 'yyyy-MM-dd'),
    }))
    setSyncModal(true)
  }

  const findSyncCylinderByField = (field, value) => {
    const query = String(value || '').trim()
    if (!query) return null
    const normalize = field === 'Machine_MC'
      ? normalizeMachineCode
      : field === 'Machine_KI'
        ? normalizeSerial
        : (text) => String(text || '').trim().toLowerCase()
    const getValue = (cyl) => {
      if (field === 'Machine_MC') return cyl?.[cylCurrentMachineField]
      if (field === 'Machine_KI') return cyl.Serial_OLD
      return cyl.Location
    }
    const normalizedQuery = normalize(query)
    return cylinderPMSource.find((cyl) => normalize(getValue(cyl)) === normalizedQuery)
  }

  const handleSyncSourceChange = (field, value) => {
    if (!String(value || '').trim()) {
      setSyncForm((prev) => ({
        ...prev,
        Location: '',
        Machine_MC: '',
        Machine_KI: '',
      }))
      return
    }
    const cyl = findSyncCylinderByField(field, value)
    if (!cyl) {
      setSyncForm((prev) => ({
        ...prev,
        [field]: value,
      }))
      return
    }
    setSyncForm((prev) => ({
      ...prev,
      Location: String(cyl.Location || '').trim(),
      Machine_MC: String(cyl?.[cylCurrentMachineField] || '').trim(),
      Machine_KI: String(cyl.Serial_OLD || '').trim(),
    }))
  }

  const updatePMWithLocationFallback = async (id, payload) => {
    try {
      await PMPlanAPI.update(id, payload)
    } catch (error) {
      if (getMissingPMColumn(error) === 'Location') {
        await PMPlanAPI.update(id, omitKeys(payload, ['Location']))
        return
      }
      throw error
    }
  }

  const createPMLog = async ({ actionType, serialOld, oldRow = null, newRow = null, comment = '' }) => {
    if (!serialOld) return
    await AuditLogAPI.create({
      Module: 'PM',
      ActionType: normalizeAuditAction(actionType),
      RecordID: serialOld,
      FieldName: actionType,
      OldValue: oldRow ? JSON.stringify(getPMLogSnapshot(oldRow)) : '',
      NewValue: newRow ? JSON.stringify(getPMLogSnapshot(newRow)) : '',
      User: user?.full_name || user?.username || 'system',
      Comment: comment || `${actionType}: ${serialOld}`,
    })
  }

  const updatePMPlansFromCylinders = async () => {
    if (syncingRef.current || !syncCylinderSource.length) return
    if (!syncCycleDays) return toast.warning('กรุณากรอกข้อมูล', 'กรุณาเลือกรอบ PM หรือระบุจำนวนวัน')
    if (!syncForm.Last_PM_Date || !syncNextPMDate) return toast.warning('กรุณากรอกข้อมูล', 'กรุณาเลือกวันที่ PM ล่าสุด')
    syncingRef.current = true
    setSyncingPM(true)
    try {
      const pmBySerialLocal = buildPMBySerial(data)
      let updated = 0
      let inserted = 0
      let checked = 0
      let removedDuplicates = 0

      for (const { keeper, duplicates } of pmBySerialLocal.values()) {
        for (const duplicate of duplicates) {
          await createPMLog({
            actionType: 'MERGE_DUPLICATE',
            serialOld: duplicate.Machine_KI,
            oldRow: duplicate,
            newRow: keeper,
            comment: `ลบแผน PM ซ้ำของซีเรียล ${duplicate.Machine_KI}`,
          })
          await PMPlanAPI.delete(duplicate.id || duplicate._id)
          removedDuplicates += 1
        }
      }

      for (const cyl of syncCylinderSource) {
        const machine = String(cyl?.[cylCurrentMachineField] || '').trim()
        const serialOld = String(cyl?.Serial_OLD || '').trim()
        const location = String(cyl?.Location || '').trim()
        const serialKey = normalizeSerial(serialOld)
        const existing = pmBySerialLocal.get(serialKey)?.keeper

        if (existing) {
          const nextPayload = {
            ...existing,
            Machine_MC: machine,
            Machine_KI: serialOld,
            Location: location,
            PM_Type: 'RUNTIME',
            Frequency_Type: 'CALENDAR',
            Frequency_Value: syncCycleDays,
            Last_PM_Date: syncForm.Last_PM_Date,
            Next_PM_Date: syncNextPMDate,
            Assigned_Tech: syncForm.Assigned_Tech,
            ImageUrl: syncForm.ImageUrl,
            Remark: appendPMImageMeta(syncForm.Remark, syncForm.ImageUrl),
          }
          const changed =
            String(existing.Machine_MC || '') !== machine ||
            String(existing.Machine_KI || '') !== serialOld ||
            String(existing.Location || '') !== location ||
            Number(existing.Frequency_Value) !== syncCycleDays ||
            String(existing.Last_PM_Date || '') !== syncForm.Last_PM_Date ||
            String(existing.Next_PM_Date || '') !== syncNextPMDate ||
            String(existing.Assigned_Tech || '') !== syncForm.Assigned_Tech ||
            String(getPMImageUrl(existing) || '') !== syncForm.ImageUrl ||
            String(stripImageUrlMeta(existing.Remark) || '') !== syncForm.Remark

          if (changed) {
            await updatePMWithLocationFallback(existing.id || existing._id, nextPayload)
            await createPMLog({
              actionType: 'UPDATE_PLAN',
              serialOld,
              oldRow: existing,
              newRow: nextPayload,
              comment: `อัพเดตข้อมูลแผน PM ซีเรียล ${serialOld}`,
            })
            updated += 1
          } else {
            await createPMLog({
              actionType: 'LOG_PM',
              serialOld,
              oldRow: existing,
              newRow: nextPayload,
              comment: `บันทึก Log PM สำหรับซีเรียล ${serialOld}`,
            })
            checked += 1
          }
        } else {
          const payload = {
            Machine_MC: machine,
            Machine_KI: serialOld,
            Location: location,
            PM_Type: 'RUNTIME',
            Frequency_Type: 'CALENDAR',
            Frequency_Value: syncCycleDays,
            Last_PM_Date: syncForm.Last_PM_Date,
            Next_PM_Date: syncNextPMDate,
            Assigned_Tech: syncForm.Assigned_Tech,
            Priority: 'MEDIUM',
            Status: 'SCHEDULED',
            ImageUrl: syncForm.ImageUrl,
            Remark: appendPMImageMeta(syncForm.Remark, syncForm.ImageUrl),
          }
          await PMPlanAPI.create(payload)
          inserted += 1
          await createPMLog({
            actionType: 'CREATE_PLAN',
            serialOld,
            newRow: payload,
            comment: `เพิ่มแผน PM ซีเรียล ${serialOld}`,
          })
        }
      }

      if (updated || inserted || removedDuplicates) await load()
      setSyncModal(false)
      toast.success(
        'อัพเดตแผน PM สำเร็จ',
        `เพิ่ม ${inserted}, อัพเดต ${updated}, ตรวจแล้ว ${checked}, ลบซ้ำ ${removedDuplicates}`
      )
      return { updated, inserted, checked, removedDuplicates }
    } catch (e) {
      toast.error('อัพเดตแผน PM ไม่สำเร็จ', e.message)
      throw e
    } finally {
      syncingRef.current = false
      setSyncingPM(false)
    }
  }

  // ⚡ Auto-Sync & Backfill latest inspection dates from Center Check records
  const syncLatestFromCenterCheck = async () => {
    if (syncingPM) return
    setSyncingPM(true)
    try {
      // 1. Load all Center Check records
      const ccList = await CenterCheckAPI.list()
      if (!Array.isArray(ccList) || ccList.length === 0) {
        toast.warning('ไม่พบข้อมูล', 'ไม่พบประวัติการเช็คศูนย์สำหรับซิงค์ข้อมูล')
        setSyncingPM(false)
        return
      }

      // 2. Find latest check per machine / serial
      const latestByMachine = new Map()
      const latestBySerial = new Map()

      ccList.forEach((cc) => {
        const mcKey = normalizeMachineCode(cc.mc || cc.MC)
        const serialKey = normalizeSerial(cc.serial || cc.Serial)
        const docDate = cc.doc_date || cc.timestamp?.slice(0, 10)
        if (!docDate) return

        const item = {
          doc_no: cc.doc_no || 'CC-CHECK',
          doc_date: docDate,
          mechanic: cc.mechanic || cc.inspector || 'ช.หนึ่ง',
          status: cc.status || 'PASS',
          mc: cc.mc || '',
          serial: cc.serial || '',
          location: cc.location || '',
          type: cc.type || 'Single',
        }

        if (mcKey) {
          const prev = latestByMachine.get(mcKey)
          if (!prev || new Date(docDate) > new Date(prev.doc_date)) {
            latestByMachine.set(mcKey, item)
          }
        }
        if (serialKey) {
          const prev = latestBySerial.get(serialKey)
          if (!prev || new Date(docDate) > new Date(prev.doc_date)) {
            latestBySerial.set(serialKey, item)
          }
        }
      })

      // 3. Update existing PM Plans
      const pmList = Array.isArray(data) ? [...data] : []
      let updatedCount = 0

      for (const plan of pmList) {
        const mcKey = normalizeMachineCode(plan.Machine_MC)
        const serialKey = normalizeSerial(plan.Machine_KI)
        const latestCC = (mcKey && latestByMachine.get(mcKey)) || (serialKey && latestBySerial.get(serialKey))

        if (latestCC) {
          const currentLastDate = plan.Last_PM_Date || ''
          const cycleDays = Number(plan.Frequency_Value) || Number(plan.PM_Type) || 30
          const computedNextDate = format(addDays(new Date(latestCC.doc_date), cycleDays), 'yyyy-MM-dd')

          if (currentLastDate !== latestCC.doc_date || plan.Next_PM_Date !== computedNextDate) {
            const planId = plan.id || plan._id
            const cleanRemark = stripImageUrlMeta(plan.Remark || '')
              .split('\n')
              .filter((line) => !line.trim().startsWith('เช็คศูนย์ล่าสุด:'))
              .join('\n')
              .trim()

            const updatedRemark = [
              cleanRemark,
              `เช็คศูนย์ล่าสุด: ${latestCC.doc_no} (${latestCC.status}) เมื่อ ${latestCC.doc_date}`,
            ].filter(Boolean).join('\n')

            await PMPlanAPI.update(planId, {
              Last_PM_Date: latestCC.doc_date,
              Next_PM_Date: computedNextDate,
              Assigned_Tech: latestCC.mechanic || plan.Assigned_Tech || 'ช.หนึ่ง',
              Remark: appendPMImageMeta(updatedRemark, getPMImageUrl(plan)),
              Status: 'COMPLETED',
              Location: latestCC.location || plan.Location || '',
              updated_at: new Date().toISOString(),
            })

            // Log to AuditLog
            try {
              await AuditLogAPI.create({
                Module: 'PM',
                ActionType: 'BACKFILL_PM_LAST_DATE',
                RecordID: plan.Machine_KI || plan.Machine_MC,
                FieldName: 'Last_PM_Date',
                OldValue: JSON.stringify({ Last_PM_Date: currentLastDate, Next_PM_Date: plan.Next_PM_Date }),
                NewValue: JSON.stringify({ Last_PM_Date: latestCC.doc_date, Next_PM_Date: computedNextDate }),
                User: user?.full_name || user?.username || 'system',
                Comment: `ซิงค์วัน PM ล่าสุดจากประวัติเช็คศูนย์ ${latestCC.doc_no} (${latestCC.doc_date})`,
              })
            } catch {}

            updatedCount++
          }
        }
      }

      await load()
      toast.success(
        'ซิงค์ข้อมูลจากประวัติเช็คศูนย์สำเร็จ!',
        `อัปเดตวันที่ PM ล่าสุดแล้ว ${updatedCount} เครื่อง (จากประวัติเช็คศูนย์ทั้งหมด ${ccList.length} รายการ)`
      )
    } catch (err) {
      console.error(err)
      toast.error('ซิงค์ข้อมูลไม่สำเร็จ', err.message)
    } finally {
      setSyncingPM(false)
    }
  }

  // Quick Action to start Center Check with auto-populated data
  const handleStartCenterCheck = (row, explicitType) => {
    const rawType = String(row.Type || getPMCylinderType(row) || '').trim()
    const detectedType = explicitType || (
      rawType.toUpperCase().includes('DOUBLE') || rawType.toUpperCase() === 'D'
        ? 'Double'
        : 'Single'
    )
    const cyl = getPMCylinder(row) || cylinderByCurrentMachine.get(normalizeMachineCode(row.Machine_MC))

    setCenterCheckPreset({
      type: detectedType,
      mc: row.Machine_MC || '',
      serial: row.Machine_KI || cyl?.Serial_OLD || cyl?.Serial_NOW || '',
      mechanic: row.Assigned_Tech || user?.full_name || '',
      prev_doc_date: row.Last_PM_Date || '',
      remark: row.Remark ? stripImageUrlMeta(row.Remark) : '',
      location: row.Location || cyl?.Location || '',
    })
    setActiveTab('center_check')
    toast.info(
      `เปิดฟอร์มเช็คศูนย์ ${detectedType === 'Double' ? 'Double Jersey' : 'Single Jersey'}`,
      `ดึงข้อมูลเครื่อง ${row.Machine_MC} (${row.Machine_KI || ''}) เรียบร้อย`
    )
  }

  const normalizeCylType = (raw = '') => {
    const s = String(raw || '').trim().toUpperCase()
    if (s === 'S' || s.includes('SINGLE')) return 'S'
    if (s === 'D' || s.includes('DOUBLE')) return 'D'
    if (s.includes('JAC')) return 'Jac.'
    return raw || ''
  }

  const searched = cylinderDrivenPMRows.filter((p) =>
    [getPMMachine(p), getPMLocation(p), p.Machine_KI, getPMCylinderType(p), p.PM_Type, p.Assigned_Tech, p.Department, getPMImageUrl(p), stripImageUrlMeta(p.Remark)].some((v) =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  const normalizedRows = searched.map((p) => ({
    ...p,
    Machine_MC: getPMMachine(p),
    Location: getPMLocation(p),
    Type: normalizeCylType(getPMCylinderType(p)),
    PM_Type: getPMCycleValue(p),
    PM_Type_DB: p.PM_Type,
    Countdown_Days: getPMCountdown(p.Next_PM_Date).days,
  }))

  const typeSummary = useMemo(() => {
    const counts = { total: normalizedRows.length, S: 0, D: 0, Jac: 0, other: 0 }
    normalizedRows.forEach((r) => {
      const t = r.Type
      if (t === 'S') counts.S += 1
      else if (t === 'D') counts.D += 1
      else if (t === 'Jac.') counts.Jac += 1
      else counts.other += 1
    })
    return counts
  }, [normalizedRows])

  const pmLocationOptions = useMemo(() => {
    const seen = new Set()
    return normalizedRows
      .map((row) => String(row.Location || '').trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))
      .map((value) => ({ value, label: value }))
  }, [normalizedRows])

  const pmTypeFilterOptions = useMemo(() => [
    { value: 'S', label: 'Single Jersey (S)' },
    { value: 'D', label: 'Double Jersey (D)' },
    { value: 'Jac.', label: 'Jacquard (Jac.)' },
  ], [])

  const wbCols = useWebBuilderMenu('/pm')
  const normalizedWbCols = useMemo(() => (wbCols && wbCols.length > 0)
    ? orderPMColumns([
        ...wbCols.filter((col) => col.field !== 'Frequency_Value'),
        ...[
          { field: 'Location', label: 'ตำแหน่ง', type: 'text', width: '120px' },
          { field: 'Type', label: 'ประเภท', type: 'text', width: '130px' },
          { field: 'Center_Check', label: 'เช็คศูนย์', type: 'action', width: '200px' },
          { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
          { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
          { field: 'Countdown_Days', label: 'นับถอยหลัง', type: 'number', width: '130px' },
        ].filter((required) => !wbCols.some((col) => col.field === required.field)),
      ])
    : null, [wbCols])
  const cols = normalizedWbCols || orderPMColumns(getPMFallbackCols(t))

  const FS_COLS = useMemo(() => cols.map((col) => {
    const key = col.field || col.key
    const label = pmColumnLabel(col, t)
    if (key === 'Location') {
      return { key, label, sortable: true, filter: { type: 'select', opts: pmLocationOptions } }
    }
    if (key === 'Type') {
      return { key, label, sortable: true, filter: { type: 'select', opts: pmTypeFilterOptions } }
    }
    if (key === 'Status') {
      return { key, label, sortable: true, filter: { type: 'select', opts: PM_STATUS.map((s) => ({ value: s.value, label: s.label })) } }
    }
    if (key === 'Priority') {
      return { key, label, sortable: true, filter: { type: 'select', opts: WO_PRIORITY.map((s) => ({ value: s.value, label: s.label })) } }
    }
    return { key, label, sortable: true }
  }), [cols, t, pmLocationOptions, pmTypeFilterOptions])

  useEffect(() => {
    const valid = new Set(FS_COLS.map((c) => c.key))
    setFilterSort((p) => {
      const stale = Object.keys(p.filters).filter((k) => !valid.has(k) && (Array.isArray(p.filters[k]) ? p.filters[k].length > 0 : !!p.filters[k]))
      const staleSort = p.sort.key && !valid.has(p.sort.key)
      if (!stale.length && !staleSort) return p
      const newFilters = { ...p.filters }
      stale.forEach((k) => delete newFilters[k])
      return { sort: staleSort ? { key: '', dir: 'asc' } : p.sort, filters: newFilters }
    })
  }, [FS_COLS])

  const displayRows = useMemo(() => applyFilterSort(normalizedRows, FS_COLS, filterSort), [normalizedRows, FS_COLS, filterSort])

  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem, setPdfItem] = useState(null)

  const openEdit = (p) => {
    setForm({
      ...p,
      PM_Type: '90',
      Frequency_Value: 90,
      ImageUrl: getPMImageUrl(p),
      Remark: stripImageUrlMeta(p.Remark),
    })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: PM_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Remark: appendPMImageMeta(prev.Remark, imageUrl),
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${PM_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithImageFallback = async (payload) => {
    try {
      await save(payload)
    } catch (error) {
      if (getMissingPMColumn(error) === 'ImageUrl') {
        await save({
          ...omitKeys(payload, ['ImageUrl']),
          Remark: appendPMImageMeta(payload.Remark, payload.ImageUrl),
        })
        if (payload.ImageUrl) toast.success('บันทึกลิงก์รูปในหมายเหตุแล้ว', 'ฐานข้อมูลยังไม่มีคอลัมน์ ImageUrl ของแผน PM')
        return
      }
      throw error
    }
  }

  const submit = async () => {
    if (saving) return
    if (!form.Machine_MC) return toast.warning('กรุณากรอกข้อมูล', 'กรุณากรอก Machine MC')
    if (!form.Next_PM_Date) return toast.warning('กรุณากรอกข้อมูล', 'กรุณากรอก PM ครั้งถัดไป')
    if (form.PM_Type === 'CUSTOM' && !Number(form.Frequency_Value)) return toast.warning('กรุณากรอกข้อมูล', 'กรุณาระบุจำนวนวัน')
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    const cycleDays = 90
    const cyl = cylinderBySerial.get(normalizeSerial(form.Machine_KI))
    const sourceMachine = String(cyl?.[cylCurrentMachineField] || form.Machine_MC || '').trim()
    const sourceLocation = String(cyl?.Location || form.Location || '').trim()
    const oldRow = data.find((row) => (row.id || row._id) === (form.id || form._id)) || null
    const { PM_Type_DB, ...cleanForm } = form
    const payload = {
      ...cleanForm,
      Machine_MC: sourceMachine,
      Machine_KI: form.Machine_KI,
      Location: sourceLocation,
      PM_Type: 'RUNTIME',
      Frequency_Type: 'CALENDAR',
      Frequency_Value: cycleDays,
      Remark: appendPMImageMeta(cleanForm.Remark, cleanForm.ImageUrl),
    }
    try {
      await saveWithImageFallback(payload)
      await createPMLog({
        actionType: 'EDIT_PLAN',
        serialOld: payload.Machine_KI,
        oldRow,
        newRow: payload,
        comment: `แก้ไขข้อมูลตรวจแผน PM ซีเรียล ${payload.Machine_KI}`,
      })
      toast.success(isEdit ? 'แก้ไขแผน PM สำเร็จ' : 'เพิ่มแผน PM สำเร็จ', `เครื่อง ${form.Machine_MC}`)
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('pm_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบแผน PM สำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const renderPMCell = (row, col) => {
    const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getPMImageUrl(row)
      : col.field === 'Countdown_Days'
        ? getPMCountdown(row.Next_PM_Date).days
        : col.field === 'Remark'
          ? stripImageUrlMeta(row.Remark)
          : row[col.field]

    if (col.field === 'Type') {
      const rawType = String(row.Type || getPMCylinderType(row) || '').trim()
      const isSingle = rawType === 'S' || rawType.toUpperCase().includes('SINGLE')
      const isDouble = rawType === 'D' || rawType.toUpperCase().includes('DOUBLE')
      if (isSingle) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            Single (S)
          </span>
        )
      }
      if (isDouble) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Double (D)
          </span>
        )
      }
      if (rawType) {
        return <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{rawType}</span>
      }
      return <span style={{ color: 'var(--text-400)' }}>—</span>
    }

    if (col.field === 'Center_Check') {
      const rawType = String(row.Type || getPMCylinderType(row) || '').trim()
      const isDouble = rawType === 'D' || rawType.toUpperCase().includes('DOUBLE')
      const isSingle = rawType === 'S' || rawType.toUpperCase().includes('SINGLE')

      if (isDouble) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleStartCenterCheck(row, 'Double')
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-500/20 whitespace-nowrap"
            title="เปิดฟอร์มเช็คศูนย์ Double Jersey พร้อมดึงข้อมูลเครื่องนี้อัตโนมัติ"
          >
            <Target size={13} />
            <span>เช็คศูนย์ Double Jersey</span>
          </button>
        )
      }

      if (isSingle || !rawType) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleStartCenterCheck(row, 'Single')
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 whitespace-nowrap"
            title="เปิดฟอร์มเช็คศูนย์ Single Jersey พร้อมดึงข้อมูลเครื่องนี้อัตโนมัติ"
          >
            <Target size={13} />
            <span>เช็คศูนย์ Single Jersey</span>
          </button>
        )
      }

      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleStartCenterCheck(row, 'Single')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 whitespace-nowrap"
          >
            <Target size={11} />
            <span>Single</span>
          </button>
          <button
            type="button"
            onClick={() => handleStartCenterCheck(row, 'Double')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 whitespace-nowrap"
          >
            <Target size={11} />
            <span>Double</span>
          </button>
        </div>
      )
    }

    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--text-400)' }}>—</span>
    }

    if (col.field === 'Machine_MC') {
      return <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
    }

    if (col.field === 'Machine_KI') {
      return <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">{String(val)}</span>
    }

    if (col.field === 'Location') {
      return (
        <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'ImageUrl') {
      return (
        <a
          href={String(val)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] truncate"
        >
          <span className="truncate">{String(val)}</span>
          <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
        </a>
      )
    }

    if (col.field === 'ImagePreview') {
      return (
        <a
          href={String(val)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
        >
          <ImageIcon size={12} />
          <span>เปิดรูป</span>
        </a>
      )
    }

    if (col.type === 'select') {
      const optColor = col.options?.find((o) => o.value === val || o.label === val)?.color
      if (optColor) return <StatusBadge value={val} color={optColor} />
    }

    if (col.field === 'Status') return <StatusBadge value={val} />
    if (col.field === 'Priority') return <StatusBadge value={val} />
    if (col.field === 'PM_Type') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          {formatPMCycle(row)}
        </span>
      )
    }
    if (col.field === 'Countdown_Days') return <PMCountdownBadge date={row.Next_PM_Date} />

    if (col.type === 'date' || col.field.includes('Date')) {
      try {
        return (
          <span className={`text-xs font-mono ${row.Status === 'OVERDUE' && col.field === 'Next_PM_Date' ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
            {format(new Date(val), 'dd/MM/yyyy')}
          </span>
        )
      } catch {
        return <span>{val}</span>
      }
    }

    if (col.type === 'number') return <span className="font-mono text-xs">{val}</span>
    return <span className="text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-4">
      {/* ── SUB-TAB SWITCHER ─────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-2 sm:pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            activeTab === 'plan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Calendar size={15} />
          <span>แผน PM (PM Plan)</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'plan' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {displayRows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('center_check')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            activeTab === 'center_check'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Target size={15} />
          <span>ประวัติเช็คศูนย์ (Center Checks)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('needle')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            activeTab === 'needle'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Sparkles size={15} />
          <span>สภาพเข็ม (Needle Inspection)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-shrink-0 whitespace-nowrap ${
            activeTab === 'log'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ScrollText size={15} />
          <span>ประวัติ Log PM (PM Log)</span>
        </button>
      </div>

      {activeTab === 'center_check' ? (
        <CenterCheck
          initialPreset={centerCheckPreset}
          onClearPreset={() => setCenterCheckPreset(null)}
          onBackToPMPlan={() => {
            load()
            setActiveTab('plan')
          }}
          onRecordSaved={() => load()}
        />
      ) : activeTab === 'needle' ? (
        <NeedleCondition />
      ) : activeTab === 'log' ? (
        <PMLog />
      ) : (
        <>
          {/* ── TYPE FILTER CARDS (การ์ดประเภทใน Filter) ─────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* ทั้งหมด */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => {
                  const nextFilters = { ...p.filters }
                  delete nextFilters.Type
                  return { ...p, filters: nextFilters }
                })
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                !filterSort.filters?.Type
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-500" />
                  <span>ประเภททั้งหมด</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.total} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                !filterSort.filters?.Type ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                ALL
              </span>
            </button>

            {/* Single Jersey (S) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'S' ? '' : 'S',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'S'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Disc size={13} />
                  <span>Single Jersey</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.S} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                S
              </span>
            </button>

            {/* Double Jersey (D) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'D' ? '' : 'D',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'D'
                  ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Target size={13} />
                  <span>Double Jersey</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.D} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                D
              </span>
            </button>

            {/* Jacquard (Jac.) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'Jac.' ? '' : 'Jac.',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'Jac.'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Jacquard</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.Jac} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Jac.
              </span>
            </button>
          </div>

          {/* ── TOOLBAR ───────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="ค้นหา Machine, Type, ช่าง, Location..."
                className="w-full sm:w-80"
              />
              <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
              <GoogleSheetSyncButton
                sheetName="แผน PM"
                columns={cols}
                rows={displayRows}
                valueGetters={{
                  Type: (row) => row.Type || getPMCylinderType(row),
                  PM_Type: formatPMCycle,
                  Countdown_Days: (row) => getPMCountdown(row.Next_PM_Date).label,
                  ImageUrl: getPMImageUrl,
                  ImagePreview: getPMImageUrl,
                  Remark: (row) => stripImageUrlMeta(row.Remark),
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline text-xs px-3.5 py-2 flex items-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-sm font-bold"
                onClick={syncLatestFromCenterCheck}
                disabled={syncingPM}
                title="ดึงวันที่เช็คศูนย์ล่าสุดของแต่ละเครื่องมาอัปเดตแผน PM อัตโนมัติ"
              >
                <Zap size={14} className={syncingPM ? 'animate-bounce text-amber-500' : 'text-amber-500'} />
                <span>{syncingPM ? 'กำลังซิงค์...' : '⚡ ซิงค์วันที่จากประวัติเช็คศูนย์'}</span>
              </button>

              <button
                type="button"
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                onClick={openSyncPMModal}
                disabled={syncingPM || !canAdd || !cylinderPMSource.length}
              >
                <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''} />
                <span>{syncingPM ? 'กำลังอัพเดต...' : 'อัพเดตแผน PM'}</span>
              </button>
            </div>
          </div>

          {/* ── DATA TABLE ────────────────────────────────────────── */}
          <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    {cols.map((c) => (
                      <th key={c.field || c.id} style={c.width ? { width: c.width, minWidth: c.width } : undefined} className="py-3 px-3 text-left whitespace-nowrap">
                        {pmColumnLabel(c, t)}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center w-20">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading && (
                    <tr>
                      <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                        <span>{t('loading')}</span>
                      </td>
                    </tr>
                  )}
                  {!loading && displayRows.map((p, i) => (
                    <tr
                      key={p._id || p.id || i}
                      onClick={() => setDetailRec(p)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {cols.map((c) => (
                        <td key={c.field || c.id} style={c.width ? { width: c.width, minWidth: c.width } : undefined} className="py-2.5 px-3 whitespace-nowrap">
                          {renderPMCell(p, c)}
                        </td>
                      ))}
                      <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPdfItem(p)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                            title="ดูเอกสาร PDF และพิมพ์"
                          >
                            <FileText size={13} />
                          </button>
                          {canEdit && p.__hasPMPlan && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="แก้ไขข้อมูลแผน PM"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && p.__hasPMPlan && (
                            <button
                              type="button"
                              onClick={() => del(p._id || p.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="ลบแผน PM"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !displayRows.length && (
                    <tr>
                      <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                        <Calendar size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                        <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "อัพเดตแผน PM" เพื่อดึงข้อมูลกระบอก In-use</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── DETAIL DRAWER ─────────────────────────────────────── */}
          <DetailDrawer
            open={!!detailRec}
            onClose={() => setDetailRec(null)}
            title={detailRec?.Machine_MC}
            subtitle={detailRec ? `${detailRec.Machine_KI || ''} · ${detailRec.Type || getPMCylinderType(detailRec) || 'กระบอก'}` : ''}
            icon={Calendar}
            accentColor="#2563eb"
            badge={detailRec && <StatusBadge value={detailRec.Status} />}
            canEdit={canEdit && detailRec?.__hasPMPlan}
            canDelete={canDelete && detailRec?.__hasPMPlan}
            onPdf={() => setPdfItem(detailRec)}
            onEdit={() => openEdit(detailRec)}
            onDelete={() => {
              del(detailRec._id || detailRec.id)
              setDetailRec(null)
            }}
            groups={detailRec ? [
              {
                label: t('dr_main_info'),
                fields: [
                  { label: 'เครื่องปัจจุบัน', value: detailRec.Machine_MC },
                  { label: 'ตำแหน่ง', value: detailRec.Location },
                  { label: 'ซีเรียลเดิม', value: detailRec.Machine_KI, mono: true },
                  { label: 'ประเภท (จากกระบอก)', value: detailRec.Type || getPMCylinderType(detailRec) },
                  { label: 'รอบ PM (วัน)', value: formatPMCycle(detailRec) },
                  { label: t('pm_th_dept'), value: detailRec.Department },
                  { label: t('priority'), value: detailRec.Priority },
                  { label: t('pm_th_tech'), value: detailRec.Assigned_Tech },
                ].filter((f) => f.value),
              },
              {
                label: t('dr_schedule'),
                fields: [
                  { label: t('field_last_pm'), value: detailRec.Last_PM_Date ? format(new Date(detailRec.Last_PM_Date), 'dd/MM/yyyy') : null },
                  { label: t('pm_th_next'), value: detailRec.Next_PM_Date ? format(new Date(detailRec.Next_PM_Date), 'dd/MM/yyyy') : null },
                  {
                    label: 'นับถอยหลัง',
                    value: getPMCountdown(detailRec.Next_PM_Date).label,
                    node: <PMCountdownBadge date={detailRec.Next_PM_Date} />,
                  },
                  { label: 'รูปแบบ', value: detailRec.Frequency_Type },
                  { label: t('field_est_hours'), value: detailRec.Estimated_Hours },
                  { label: 'แผนเวลาหยุดเครื่อง', value: detailRec.Downtime_Plan },
                ].filter((f) => f.value),
              },
              {
                label: t('dr_details'),
                single: true,
                fields: [
                  { label: 'ลิงก์รูป', value: getPMImageUrl(detailRec), full: true },
                  { label: t('field_req_parts'), value: detailRec.Required_Parts, full: true },
                  { label: t('remark'), value: stripImageUrlMeta(detailRec.Remark), full: true },
                ].filter((f) => f.value),
              },
            ].filter((g) => g.fields.length > 0) : []}
          />

          {/* ── SYNC MODAL ────────────────────────────────────────── */}
          <Modal
            open={syncModal}
            onClose={() => setSyncModal(false)}
            title="อัพเดตแผน PM จากเมนูกระบอก"
            size="xl"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <button type="button" className="btn-outline px-4" onClick={() => setSyncModal(false)}>
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn-primary px-5"
                  onClick={updatePMPlansFromCylinders}
                  disabled={syncingPM || !pmSyncPreviewRows.length || !syncCycleDays || !syncNextPMDate}
                >
                  <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''} />
                  <span>{syncingPM ? 'กำลังอัพเดต...' : 'ยืนยันอัพเดต + เพิ่ม Log PM'}</span>
                </button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">รายการจากกระบอก In-use</div>
                  <div className="text-2xl font-black mt-0.5 text-blue-600">{pmSyncPreviewRows.length}</div>
                </div>
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">เพิ่มใหม่</div>
                  <div className="text-2xl font-black mt-0.5 text-emerald-600">
                    {pmSyncPreviewRows.filter((r) => r.action === 'เพิ่มใหม่').length}
                  </div>
                </div>
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">อัพเดต/เพิ่ม Log</div>
                  <div className="text-2xl font-black mt-0.5 text-indigo-600">
                    {pmSyncPreviewRows.filter((r) => r.action !== 'เพิ่มใหม่').length}
                  </div>
                </div>
              </div>

              <div className="text-slate-500">
                ระบบจะดึง `ซีเรียลเดิม`, `เครื่องปัจจุบัน`, `ตำแหน่ง`, `ประเภท` จากเมนูกระบอกอัตโนมัติ และเพิ่มแถวใน Log PM ทุกครั้งที่ยืนยัน
              </div>

              <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300">เลือกข้อมูลจากเมนูกระบอก</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label font-bold">Location อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-location-list"
                      value={syncForm.Location}
                      onChange={(e) => handleSyncSourceChange('Location', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-location-list">
                      {syncLocationOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label font-bold">เครื่องปัจจุบัน อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-machine-list"
                      value={syncForm.Machine_MC}
                      onChange={(e) => handleSyncSourceChange('Machine_MC', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-machine-list">
                      {syncMachineOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label font-bold">ซีเรียลเดิม อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-serial-list"
                      value={syncForm.Machine_KI}
                      onChange={(e) => handleSyncSourceChange('Machine_KI', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-serial-list">
                      {syncSerialOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300">ข้อมูล PM ที่จะบันทึก</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="label font-bold">รอบ PM</label>
                    <select
                      className="select text-xs"
                      value={syncForm.PM_Cycle}
                      onChange={(e) => setSyncForm((p) => ({ ...p, PM_Cycle: e.target.value }))}
                    >
                      <option value="30">30 วัน</option>
                      <option value="90">90 วัน</option>
                      <option value="120">120 วัน</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  {syncForm.PM_Cycle === 'CUSTOM' && (
                    <div>
                      <label className="label font-bold">Custom (วัน)</label>
                      <input
                        className="input text-xs"
                        type="number"
                        min="1"
                        value={syncForm.Custom_PM_Days}
                        onChange={(e) => setSyncForm((p) => ({ ...p, Custom_PM_Days: e.target.value }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="label font-bold">PM ล่าสุด</label>
                    <input
                      className="input text-xs"
                      type="date"
                      value={syncForm.Last_PM_Date}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Last_PM_Date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label font-bold">PM ครั้งถัดไป</label>
                    <input className="input text-xs font-mono" value={syncNextPMDate || ''} readOnly />
                  </div>
                  <div>
                    <label className="label font-bold">นับถอยหลัง</label>
                    <div className="input text-xs flex items-center">
                      {syncNextPMDate ? <PMCountdownBadge date={syncNextPMDate} /> : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="label font-bold">ช่าง</label>
                    <input
                      className="input text-xs"
                      value={syncForm.Assigned_Tech}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Assigned_Tech: e.target.value }))}
                      placeholder="ชื่อช่าง"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label font-bold">URL รูป</label>
                    <input
                      className="input text-xs"
                      value={syncForm.ImageUrl}
                      onChange={(e) => setSyncForm((p) => ({ ...p, ImageUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="label font-bold">หมายเหตุ</label>
                    <textarea
                      className="input text-xs"
                      rows={2}
                      value={syncForm.Remark}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Remark: e.target.value }))}
                      placeholder="เพิ่มหมายเหตุ"
                    />
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden border border-slate-200 dark:border-slate-800" style={{ maxHeight: 350, overflow: 'auto' }}>
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                      <th className="py-2 px-3 text-left">ซีเรียลเดิม</th>
                      <th className="py-2 px-3 text-left">เครื่องปัจจุบัน</th>
                      <th className="py-2 px-3 text-left">ตำแหน่ง</th>
                      <th className="py-2 px-3 text-left">รอบ PM</th>
                      <th className="py-2 px-3 text-left">รายการที่จะทำ</th>
                      <th className="py-2 px-3 text-left">ซ้ำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {pmSyncPreviewRows.map((row, i) => (
                      <tr key={`${row.serialOld}-${row.machine}-${i}`}>
                        <td className="font-mono font-bold py-2 px-3 text-blue-600">{row.serialOld}</td>
                        <td className="py-2 px-3 font-semibold">{row.machine}</td>
                        <td className="py-2 px-3">{row.location || '—'}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600">
                            {syncCycleDays ? `${syncCycleDays} วัน` : '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <StatusBadge value={row.action} />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.duplicateCount ? `${row.duplicateCount} แถว` : '—'}</td>
                      </tr>
                    ))}
                    {!pmSyncPreviewRows.length && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          ไม่พบข้อมูล In-use จากเมนูกระบอก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>

          {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
          <Modal
            open={modal}
            onClose={() => setModal(false)}
            title={t('pm_edit')}
            size="lg"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <button type="button" className="btn-outline px-4" onClick={() => setModal(false)}>
                  {t('cancel')}
                </button>
                <button type="button" className="btn-primary px-5" onClick={submit} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t('saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{t('save')}</span>
                    </>
                  )}
                </button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold">ซีเรียลเดิม</label>
                  <input className="input font-mono" value={form.Machine_KI || ''} readOnly />
                </div>
                <div>
                  <label className="label font-bold">เครื่องปัจจุบัน *</label>
                  <input className="input font-bold" value={form.Machine_MC || ''} readOnly />
                </div>
                <F form={form} setForm={setForm} label="PM ล่าสุด" id="Last_PM_Date" type="date" />
                <F form={form} setForm={setForm} label="PM ครั้งถัดไป *" id="Next_PM_Date" type="date" />
                <div>
                  <label className="label font-bold">รอบ PM (วัน)</label>
                  <input className="input font-bold text-blue-600" value="90 วัน" readOnly />
                </div>
                <F form={form} setForm={setForm} label={t('pm_th_tech')} id="Assigned_Tech" placeholder="ชื่อช่างที่รับผิดชอบ" />
              </div>

              {/* Photo upload section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" />
                  <span>รูปถ่ายประวัติเช็คศูนย์ / สภาพเครื่อง</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label font-bold">อัปโหลดรูปเข้า Google Drive</label>
                    <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 justify-center">
                      {uploadingImage ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>กำลังอัปโหลด...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          <span>เลือกไฟล์รูปถ่าย</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(e) => onPickImageFile(e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <F form={form} setForm={setForm} label="หรือวางลิงก์รูป (URL)" id="ImageUrl" useBuilder={false} placeholder="https://..." />
                  </div>

                  {form.ImageUrl && (
                    <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon size={16} className="text-blue-600 flex-shrink-0" />
                        <span className="font-mono text-blue-700 dark:text-blue-300 truncate">{form.ImageUrl}</span>
                      </div>
                      <a
                        href={form.ImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline text-[11px] py-1 px-2 flex-shrink-0 flex items-center gap-1"
                      >
                        <span>ดูรูป</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}

                  <div className="col-span-1 sm:col-span-2">
                    <F
                      form={form}
                      setForm={setForm}
                      label={t('remark')}
                      id="Remark"
                      placeholder="หมายเหตุหรือรายละเอียดเพิ่มเติม"
                      onChange={(value) => setForm((p) => ({ ...p, Remark: appendPMImageMeta(value, p.ImageUrl) }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generatePMPlanPdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
