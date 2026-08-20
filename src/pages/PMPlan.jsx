import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2, RefreshCw, Calendar, ScrollText } from 'lucide-react'
import { format, addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI, CylinderAPI, PMPlanAPI, PM_TYPE, PM_STATUS, WO_PRIORITY } from '../api/entities'
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

const PM_IMAGE_FOLDER = 'ประวัติเช็คศูนย์'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'pmplans'|column pmplans\.([^ ]+) does not exist/i

const PM_FIELD_KEYS = {
  Location:'cyl_th_loc',
  Department:'pm_th_dept', Next_PM_Date:'pm_th_next', Last_PM_Date:'field_last_pm',
  Assigned_Tech:'pm_th_tech', Priority:'priority', Status:'status', Remark:'remark',
  Countdown_Days:'นับถอยหลัง', ImageUrl:'URL', ImagePreview:'รูป',
}

const normalizeMachineCode = (value = '') => String(value || '')
  .toUpperCase()
  .replace(/\s+/g, '')
  .replace(/-/g, '')
  .trim()

const normalizeSerial = (value = '') => String(value || '').toUpperCase().replace(/\s+/g, '').trim()

const uniqueSorted = (values = []) => [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))]
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
  const withLocation = inUse.filter(c => String(c.Location || '').trim())
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
  rows.forEach(row => {
    const key = normalizeSerial(row.Machine_KI)
    if (!key) return
    grouped.set(key, [...(grouped.get(key) || []), row])
  })
  return new Map([...grouped.entries()].map(([key, matches]) => {
    const keeper = pickPMKeeper(matches)
    return [key, {
      keeper,
      duplicates: matches.filter(row => row !== keeper),
    }]
  }))
}

function getPMLogSnapshot(row = {}) {
  const snapshot = { ...row, Remark: stripImageUrlMeta(row.Remark) }
  Object.keys(snapshot).forEach(key => {
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
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingPMColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

const getPMFallbackCols = (t) => [
  { field:'Location',      label:'ตำแหน่ง',           type:'text'   },
  { field:'Machine_MC',    label:'เครื่องปัจจุบัน',  type:'text'   },
  { field:'Machine_KI',    label:'ซีเรียลเดิม',       type:'text'   },
  { field:'PM_Type',       label:'รอบ PM (วัน)',    type:'select' },
  { field:'Last_PM_Date',   label:t('field_last_pm'), type:'date'   },
  { field:'Next_PM_Date',  label:t('pm_th_next'),    type:'date'   },
  { field:'Countdown_Days', label:'นับถอยหลัง',       type:'number', width:'130px' },
  { field:'Assigned_Tech', label:t('pm_th_tech'),    type:'text'   },
  { field:'ImageUrl',      label:'URL',              type:'text',   width:'220px' },
  { field:'ImagePreview',  label:'รูป',              type:'text',   width:'110px' },
  { field:'Remark',        label:t('remark'),         type:'text'   },
]

function orderPMColumns(cols = []) {
  const withoutLocation = cols.filter((col) => col.field !== 'Location')
  const locationCol = cols.find((col) => col.field === 'Location') || { field:'Location', label:'ตำแหน่ง', type:'text', width:'120px' }
  const machineIndex = withoutLocation.findIndex((col) => col.field === 'Machine_MC')
  if (machineIndex === -1) return [locationCol, ...withoutLocation]
  return [
    ...withoutLocation.slice(0, machineIndex),
    locationCol,
    ...withoutLocation.slice(machineIndex),
  ]
}

function renderPMCell(row, col) {
  const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getPMImageUrl(row)
    : col.field === 'Countdown_Days'
      ? getPMCountdown(row.Next_PM_Date).days
    : col.field === 'Remark'
      ? stripImageUrlMeta(row.Remark)
      : row[col.field]
  if (val === null || val === undefined || val === '')
    return <span style={{ color:'var(--text-400)' }}>—</span>
  if (col.field === 'ImageUrl') {
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(val)}</a>
  }
  if (col.field === 'ImagePreview') {
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
  }
  if (col.type === 'select') {
    const optColor = col.options?.find(o => o.value === val || o.label === val)?.color
    if (optColor) return <StatusBadge value={val} color={optColor} />
  }
  if (col.field === 'Status')   return <StatusBadge value={val} />
  if (col.field === 'Priority') return <StatusBadge value={val} />
  if (col.field === 'PM_Type')  return <span className="badge badge-blue">{formatPMCycle(row)}</span>
  if (col.field === 'Countdown_Days') return <PMCountdownBadge date={row.Next_PM_Date} />
  if (col.type === 'date' || col.field.includes('Date')) {
    try {
      return <span className={`text-sm ${row.Status === 'OVERDUE' && col.field === 'Next_PM_Date' ? 'text-red-500 font-semibold' : ''}`}>
        {format(new Date(val), 'dd/MM/yyyy')}
      </span>
    } catch { return <span>{val}</span> }
  }
  if (col.type === 'number') return <span>{val}</span>
  return <span>{String(val)}</span>
}

const EMPTY = {
  PM_ID:'', PM_Type:'30', Machine_MC:'', Location:'', Machine_KI:'', Department:'',
  Frequency_Type:'CALENDAR', Frequency_Value:30, Last_PM_Date:'', Next_PM_Date:'',
  Estimated_Hours:1, Assigned_Tech:'', Priority:'MEDIUM', Status:'SCHEDULED',
  Required_Parts:'', Downtime_Plan:0, Remark:'', CreatedBy:'', ImageUrl:''
}

const pmColumnLabel = (col, t) => {
  if (col.field === 'Machine_MC') return 'เครื่องปัจจุบัน'
  if (col.field === 'Location') return 'ตำแหน่ง'
  if (col.field === 'Machine_KI') return 'ซีเรียลเดิม'
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
    green: { color:'#059669', background:'rgba(16,185,129,.12)', border:'rgba(16,185,129,.28)' },
    yellow: { color:'#d97706', background:'rgba(245,158,11,.14)', border:'rgba(245,158,11,.32)' },
    red: { color:'#dc2626', background:'rgba(239,68,68,.12)', border:'rgba(239,68,68,.3)' },
    gray: { color:'var(--text-500)', background:'var(--bg-page)', border:'var(--border)' },
  }
  const s = styles[countdown.color] || styles.gray
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:800,
      color:s.color, background:s.background, border:`1px solid ${s.border}`,
      whiteSpace:'nowrap',
    }}>
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
  const [activeTab,  setActiveTab]  = useState(defaultTab)

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab)
  }, [defaultTab])

  const { data, loading, load, save, remove } = useEntity(PMPlanAPI)
  const [search,     setSearch]    = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal,      setModal]     = useState(false)
  const [syncModal,  setSyncModal] = useState(false)
  const [syncForm,   setSyncForm]  = useState({
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
  const [form,       setForm]      = useState(EMPTY)
  const [saving,     setSaving]    = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [syncingPM, setSyncingPM] = useState(false)
  const [cylinders,  setCylinders] = useState([])
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
    const col = cylWbCols.find(c =>
      c.field === 'NewMC' ||
      String(c.label).toLowerCase().replace(/\s+/g, '') === 'currentmachine' ||
      String(c.label).includes('เครื่องปัจจุบัน')
    )
    return col?.field || 'NewMC'
  }, [cylWbCols])

  const cylinderByCurrentMachine = useMemo(() => {
    const grouped = new Map()
    cylinders.forEach(cyl => {
      const key = normalizeMachineCode(cyl?.[cylCurrentMachineField])
      if (!key) return
      grouped.set(key, [...(grouped.get(key) || []), cyl])
    })
    return new Map([...grouped.entries()].map(([key, matches]) => [key, pickCylinderForPM(matches)]))
  }, [cylCurrentMachineField, cylinders])

  const cylinderBySerial = useMemo(() => {
    const grouped = new Map()
    cylinders.forEach(cyl => {
      const key = normalizeSerial(cyl.Serial_OLD)
      if (!key || !isInUseCylinder(cyl)) return
      grouped.set(key, [...(grouped.get(key) || []), cyl])
    })
    return new Map([...grouped.entries()].map(([key, matches]) => [key, pickCylinderForPM(matches)]))
  }, [cylinders])

  const pmBySerial = useMemo(() => buildPMBySerial(data), [data])
  const uniquePMRows = useMemo(() => [...pmBySerial.values()].map(entry => entry.keeper).filter(Boolean), [pmBySerial])

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

  const cylinderPMSource = useMemo(() => (
    [...cylinderBySerial.values()]
      .filter(cyl => isInUseCylinder(cyl))
      .filter(cyl => String(cyl?.[cylCurrentMachineField] || '').trim() && String(cyl?.Serial_OLD || '').trim())
  ), [cylCurrentMachineField, cylinderBySerial])

  const syncLocationOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map(cyl => cyl.Location)),
    [cylinderPMSource]
  )
  const syncMachineOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map(cyl => cyl?.[cylCurrentMachineField])),
    [cylCurrentMachineField, cylinderPMSource]
  )
  const syncSerialOptions = useMemo(
    () => uniqueSorted(cylinderPMSource.map(cyl => cyl.Serial_OLD)),
    [cylinderPMSource]
  )

  const syncCylinderSource = useMemo(() => (
    cylinderPMSource.filter(cyl =>
      matchesText(cyl.Location, syncForm.Location) &&
      matchesText(cyl?.[cylCurrentMachineField], syncForm.Machine_MC) &&
      matchesText(cyl.Serial_OLD, syncForm.Machine_KI)
    )
  ), [cylCurrentMachineField, cylinderPMSource, syncForm.Location, syncForm.Machine_KI, syncForm.Machine_MC])

  const cylinderDrivenPMRows = useMemo(() => {
    return cylinderPMSource.map(cyl => {
      const serialOld = String(cyl?.Serial_OLD || '').trim()
      const machine = String(cyl?.[cylCurrentMachineField] || '').trim()
      const location = String(cyl?.Location || '').trim()
      const existing = pmBySerial.get(normalizeSerial(serialOld))?.keeper
      return {
        ...(existing || {}),
        Machine_KI: serialOld,
        Machine_MC: machine,
        Location: location,
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
    return syncCylinderSource.map(cyl => {
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
    setSyncForm(prev => ({
      ...prev,
      Last_PM_Date: prev.Last_PM_Date || format(new Date(), 'yyyy-MM-dd'),
    }))
    setSyncModal(true)
  }

  const getSyncCylinderValues = (cyl = {}) => ({
    Location: String(cyl.Location || '').trim(),
    Machine_MC: String(cyl?.[cylCurrentMachineField] || '').trim(),
    Machine_KI: String(cyl.Serial_OLD || '').trim(),
  })

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
    return cylinderPMSource.find(cyl => normalize(getValue(cyl)) === normalizedQuery)
  }

  const handleSyncSourceChange = (field, value) => {
    if (!String(value || '').trim()) {
      setSyncForm(prev => ({
        ...prev,
        Location: '',
        Machine_MC: '',
        Machine_KI: '',
      }))
      return
    }
    const cyl = findSyncCylinderByField(field, value)
    if (!cyl) {
      setSyncForm(prev => ({
        ...prev,
        Location: field === 'Location' ? value : '',
        Machine_MC: field === 'Machine_MC' ? value : '',
        Machine_KI: field === 'Machine_KI' ? value : '',
      }))
      return
    }
    setSyncForm(prev => ({
      ...prev,
      ...getSyncCylinderValues(cyl),
    }))
  }

  const createPMWithLocationFallback = async (payload) => {
    try {
      await PMPlanAPI.create(payload)
    } catch (error) {
      if (getMissingPMColumn(error) === 'Location') {
        await PMPlanAPI.create(omitKeys(payload, ['Location']))
        return
      }
      throw error
    }
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

  const syncPMFromCylinders = async ({ silent = false } = {}) => {
    if (syncingRef.current || !cylinderPMSource.length) return { updated: 0, inserted: 0 }
    syncingRef.current = true
    if (!silent) setSyncingPM(true)
    try {
      const pmByMachine = new Map(data.map(pm => [normalizeMachineCode(pm.Machine_MC), pm]))
      let updated = 0
      let inserted = 0
      const today = format(new Date(), 'yyyy-MM-dd')
      for (const cyl of cylinderPMSource) {
        const machine = String(cyl?.[cylCurrentMachineField] || '').trim()
        const serialOld = String(cyl?.Serial_OLD || '').trim()
        const location = String(cyl?.Location || '').trim()
        const existing = pmByMachine.get(normalizeMachineCode(machine))
        if (existing) {
          const locationChanged = Object.hasOwn(existing, 'Location') && String(existing.Location || '') !== location
          if (
            String(existing.Machine_MC || '') === machine &&
            String(existing.Machine_KI || '') === serialOld &&
            !locationChanged
          ) continue
          await updatePMWithLocationFallback(existing.id || existing._id, {
            ...existing,
            Machine_MC: machine,
            Machine_KI: serialOld,
            Location: location,
          })
          updated += 1
        } else {
          await createPMWithLocationFallback({
            Machine_MC: machine,
            Machine_KI: serialOld,
            Location: location,
            PM_Type: 'RUNTIME',
            Frequency_Type: 'CALENDAR',
            Frequency_Value: 90,
            Next_PM_Date: today,
            Priority: 'MEDIUM',
            Status: 'SCHEDULED',
          })
          inserted += 1
        }
      }
      if (updated || inserted) await load()
      if (!silent && (updated || inserted)) {
        toast.success('ซิงก์ข้อมูลจากเมนูกระบอกแล้ว', `อัปเดต ${updated} แถว, เพิ่ม ${inserted} แถว`)
      }
      return { updated, inserted }
    } catch (e) {
      if (!silent) toast.error('ซิงก์ข้อมูลจากเมนูกระบอกไม่สำเร็จ', e.message)
      throw e
    } finally {
      syncingRef.current = false
      if (!silent) setSyncingPM(false)
    }
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
            updated += 1
          } else {
            checked += 1
          }

          await createPMLog({
            actionType: changed ? 'UPDATE_PLAN' : 'CHECK_PLAN',
            serialOld,
            oldRow: existing,
            newRow: nextPayload,
            comment: `อัพเดตแผน PM ซีเรียล ${serialOld}`,
          })
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
            ImageUrl: syncForm.ImageUrl,
            Remark: appendPMImageMeta(syncForm.Remark, syncForm.ImageUrl),
            Priority: 'MEDIUM',
            Status: 'SCHEDULED',
          }
          await createPMWithLocationFallback(payload)
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

  useEffect(() => {
    if (autoSyncDoneRef.current || loading || !cylinderPMSource.length) return
    autoSyncDoneRef.current = true
    // แผน PM อัพเดตเมื่อผู้ใช้กดปุ่มเท่านั้น เพื่อให้มี Log PM ทุกครั้ง
  }, [cylinderPMSource, loading])

  const handleMachineKIChange = (v) => setForm(p => {
    const cyl = cylinders.find(c => c.Serial_OLD === v)
    return { ...p, Machine_KI: v, Machine_MC: cyl?.[cylCurrentMachineField] || p.Machine_MC }
  })

  const handleMachineMCChange = (v) => setForm(p => {
    const currentCyl = cylinders.find(c => c.Serial_OLD === p.Machine_KI)
    if (currentCyl?.[cylCurrentMachineField] === v) return { ...p, Machine_MC: v }
    const cyl = cylinders.find(c => c[cylCurrentMachineField] === v)
    return { ...p, Machine_MC: v, Machine_KI: cyl?.Serial_OLD || '' }
  })

  useEffect(() => {
    if (!modal || !['30', '60', '90'].includes(String(form.PM_Type))) return
    const days = Number(form.PM_Type)
    if (form.Frequency_Value === days) return
    setForm(p => ({ ...p, Frequency_Type: 'CALENDAR', Frequency_Value: days }))
  }, [form.Frequency_Value, form.PM_Type, modal])

  useEffect(() => {
    if (!modal || !form.Last_PM_Date) return
    const days = ['30', '60', '90'].includes(String(form.PM_Type))
      ? Number(form.PM_Type)
      : Number(form.Frequency_Value)
    if (!days || days <= 0) return
    const next = addDays(new Date(form.Last_PM_Date), days)
    const formatted = format(next, 'yyyy-MM-dd')
    if (form.Next_PM_Date === formatted) return
    setForm(p => ({ ...p, Next_PM_Date: formatted }))
  }, [form.Last_PM_Date, form.PM_Type, form.Frequency_Value, modal])

  const searched = cylinderDrivenPMRows.filter(p =>
    [getPMMachine(p), getPMLocation(p), p.Machine_KI, p.PM_Type, p.Assigned_Tech, p.Department, getPMImageUrl(p), stripImageUrlMeta(p.Remark)].some(v =>
      String(v||'').toLowerCase().includes(search.toLowerCase())
    )
  )
  const normalizedRows = searched.map(p => ({
    ...p,
    Machine_MC: getPMMachine(p),
    Location: getPMLocation(p),
    PM_Type: getPMCycleValue(p),
    PM_Type_DB: p.PM_Type,
    Countdown_Days: getPMCountdown(p.Next_PM_Date).days,
  }))
  const pmLocationOptions = useMemo(() => {
    const seen = new Set()
    return normalizedRows
      .map(row => String(row.Location || '').trim())
      .filter(Boolean)
      .filter(value => {
        const key = value.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))
      .map(value => ({ value, label: value }))
  }, [normalizedRows])

  const wbCols = useWebBuilderMenu('/pm')
  const normalizedWbCols = useMemo(() => (wbCols && wbCols.length > 0)
    ? orderPMColumns([
        ...wbCols.filter((col) => col.field !== 'Frequency_Value'),
        ...[
          { field:'Location', label:'ตำแหน่ง', type:'text', width:'120px' },
          { field:'ImageUrl', label:'URL', type:'text', width:'220px' },
          { field:'ImagePreview', label:'รูป', type:'text', width:'110px' },
          { field:'Countdown_Days', label:'นับถอยหลัง', type:'number', width:'130px' },
        ].filter((required) => !wbCols.some((col) => col.field === required.field)),
      ])
    : null, [wbCols])
  const cols   = normalizedWbCols || orderPMColumns(getPMFallbackCols(t))

  const FS_COLS = useMemo(() => cols.map(col => {
    const key   = col.field || col.key
    const label = pmColumnLabel(col, t)
    if (key === 'Location')
      return { key, label, sortable: true, filter: { type: 'select', opts: pmLocationOptions } }
    return { key, label, sortable: true }
  }), [cols, t, pmLocationOptions])

  useEffect(() => {
    const valid = new Set(FS_COLS.map(c => c.key))
    setFilterSort(p => {
      const stale     = Object.keys(p.filters).filter(k => !valid.has(k) && (Array.isArray(p.filters[k]) ? p.filters[k].length > 0 : !!p.filters[k]))
      const staleSort = p.sort.key && !valid.has(p.sort.key)
      if (!stale.length && !staleSort) return p
      const newFilters = { ...p.filters }
      stale.forEach(k => delete newFilters[k])
      return { sort: staleSort ? { key: '', dir: 'asc' } : p.sort, filters: newFilters }
    })
  }, [FS_COLS])

  const displayRows = useMemo(() => applyFilterSort(normalizedRows, FS_COLS, filterSort), [normalizedRows, FS_COLS, filterSort])

  const [detailRec, setDetailRec] = useState(null)

  const openNew  = () => { setForm(EMPTY);   setModal(true) }
  const openEdit = (p) => {
    setForm({ ...p, PM_Type: '90', Frequency_Value: 90, ImageUrl: getPMImageUrl(p), Remark: stripImageUrlMeta(p.Remark) })
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
    if (!form.Machine_MC) return toast.warning('กรุณากรอกข้อมูล', 'กรุณากรอก Machine MC')
    if (!form.Next_PM_Date) return toast.warning('กรุณากรอกข้อมูล', 'กรุณากรอก PM ครั้งถัดไป')
    if (form.PM_Type === 'CUSTOM' && !Number(form.Frequency_Value)) return toast.warning('กรุณากรอกข้อมูล', 'กรุณาระบุจำนวนวัน')
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    const cycleDays = 90
    const cyl = cylinderBySerial.get(normalizeSerial(form.Machine_KI))
    const sourceMachine = String(cyl?.[cylCurrentMachineField] || form.Machine_MC || '').trim()
    const sourceLocation = String(cyl?.Location || form.Location || '').trim()
    const oldRow = data.find(row => (row.id || row._id) === (form.id || form._id)) || null
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
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('pm_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบแผน PM สำเร็จ')
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }


  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
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
          onClick={() => setActiveTab('log')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
            activeTab === 'log'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ScrollText size={15} />
          <span>ประวัติ Log PM (PM Log)</span>
        </button>
      </div>

      {activeTab === 'log' ? (
        <PMLog />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder={t('pm_search')} />
            <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
            <GoogleSheetSyncButton
              sheetName="แผน PM"
              columns={cols}
              rows={displayRows}
              valueGetters={{
                PM_Type: formatPMCycle,
                Countdown_Days: (row) => getPMCountdown(row.Next_PM_Date).label,
                ImageUrl: getPMImageUrl,
                ImagePreview: getPMImageUrl,
                Remark: (row) => stripImageUrlMeta(row.Remark),
              }}
            />
            <button className="btn-primary ml-auto" onClick={openSyncPMModal} disabled={syncingPM || !canAdd || !cylinderPMSource.length}>
              <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''}/> {syncingPM ? 'กำลังอัพเดต...' : 'อัพเดตแผน PM'}
            </button>
          </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field||c.id}>{pmColumnLabel(c, t)}</th>)}
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length+1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((p, i) => (
              <tr key={p._id || p.id || i} onClick={() => setDetailRec(p)} style={{cursor:'pointer'}}>
                {cols.map(c => <td key={c.field||c.id}>{renderPMCell(p, c)}</td>)}
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {canEdit && p.__hasPMPlan && <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(p)}><Pencil size={12}/></button>}
                    {canDelete && p.__hasPMPlan && <button className="btn-danger py-1 px-2 text-xs"  onClick={() => del(p._id || p.id)}><Trash2 size={12}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !displayRows.length && <tr><td colSpan={cols.length+1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={!!detailRec} onClose={() => setDetailRec(null)}
        title={detailRec?.Machine_MC} subtitle={detailRec?.Machine_KI || detailRec?.PM_Type}
        icon={Calendar} accentColor="#10b981" iconColor="#34d399"
        badge={detailRec && <StatusBadge value={detailRec.Status} />}
        canEdit={canEdit && detailRec?.__hasPMPlan} canDelete={canDelete && detailRec?.__hasPMPlan}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          { label: t('dr_main_info'), fields: [
            { label: 'เครื่องปัจจุบัน',  value: detailRec.Machine_MC },
            { label: 'ตำแหน่ง',          value: detailRec.Location },
            { label: 'ซีเรียลเดิม',       value: detailRec.Machine_KI, mono: true },
            { label: 'รอบ PM (วัน)',      value: formatPMCycle(detailRec) },
            { label: t('pm_th_dept'),     value: detailRec.Department },
            { label: t('priority'),       value: detailRec.Priority },
            { label: t('pm_th_tech'),     value: detailRec.Assigned_Tech },
          ]},
          { label: t('dr_schedule'), fields: [
            { label: t('field_last_pm'),  value: detailRec.Last_PM_Date ? format(new Date(detailRec.Last_PM_Date),'dd/MM/yyyy') : null },
            { label: t('pm_th_next'),     value: detailRec.Next_PM_Date ? format(new Date(detailRec.Next_PM_Date),'dd/MM/yyyy') : null },
            { label: 'นับถอยหลัง',        value: getPMCountdown(detailRec.Next_PM_Date).label,
              node: <PMCountdownBadge date={detailRec.Next_PM_Date} /> },
            { label: 'รูปแบบ',            value: detailRec.Frequency_Type },
            { label: t('field_est_hours'),value: detailRec.Estimated_Hours },
            { label: 'แผนเวลาหยุดเครื่อง', value: detailRec.Downtime_Plan },
          ]},
          { label: t('dr_details'), single: true, fields: [
            { label: 'ลิงก์รูป',         value: getPMImageUrl(detailRec), full: true },
            { label: t('field_req_parts'), value: detailRec.Required_Parts, full: true },
            { label: t('remark'),          value: stripImageUrlMeta(detailRec.Remark), full: true },
          ]},
        ] : []}
      />

      <Modal open={syncModal} onClose={() => setSyncModal(false)}
        title="อัพเดตแผน PM จากเมนูกระบอก" size="xl"
        footer={<>
          <button className="btn-outline" onClick={() => setSyncModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={updatePMPlansFromCylinders} disabled={syncingPM || !pmSyncPreviewRows.length || !syncCycleDays || !syncNextPMDate}>
            <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''}/>
            {syncingPM ? 'กำลังอัพเดต...' : 'ยืนยันอัพเดต + เพิ่ม Log PM'}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <div className="text-xs" style={{color:'var(--text-400)'}}>รายการจากกระบอก In-use</div>
              <div className="text-2xl font-bold">{pmSyncPreviewRows.length}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs" style={{color:'var(--text-400)'}}>เพิ่มใหม่</div>
              <div className="text-2xl font-bold">{pmSyncPreviewRows.filter(r => r.action === 'เพิ่มใหม่').length}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs" style={{color:'var(--text-400)'}}>อัพเดต/เพิ่ม Log</div>
              <div className="text-2xl font-bold">{pmSyncPreviewRows.filter(r => r.action !== 'เพิ่มใหม่').length}</div>
            </div>
          </div>

          <div className="text-sm" style={{color:'var(--text-500)'}}>
            ระบบจะดึง `ซีเรียลเดิม`, `เครื่องปัจจุบัน`, `ตำแหน่ง` จากเมนูกระบอกอัตโนมัติ และเพิ่มแถวใน Log PM ทุกครั้งที่ยืนยัน
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-3">เลือกข้อมูลจากเมนูกระบอก</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Location อัตโนมัติ</label>
                <input
                  className="input"
                  list="pm-sync-location-list"
                  value={syncForm.Location}
                  onChange={e => handleSyncSourceChange('Location', e.target.value)}
                  placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                />
                <datalist id="pm-sync-location-list">
                  {syncLocationOptions.map(value => <option key={value} value={value} />)}
                </datalist>
              </div>
              <div>
                <label className="label">เครื่องปัจจุบัน อัตโนมัติ</label>
                <input
                  className="input"
                  list="pm-sync-machine-list"
                  value={syncForm.Machine_MC}
                  onChange={e => handleSyncSourceChange('Machine_MC', e.target.value)}
                  placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                />
                <datalist id="pm-sync-machine-list">
                  {syncMachineOptions.map(value => <option key={value} value={value} />)}
                </datalist>
              </div>
              <div>
                <label className="label">ซีเรียลเดิม อัตโนมัติ</label>
                <input
                  className="input"
                  list="pm-sync-serial-list"
                  value={syncForm.Machine_KI}
                  onChange={e => handleSyncSourceChange('Machine_KI', e.target.value)}
                  placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                />
                <datalist id="pm-sync-serial-list">
                  {syncSerialOptions.map(value => <option key={value} value={value} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-3">ข้อมูล PM ที่จะบันทึก</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">รอบ PM</label>
                <select
                  className="input"
                  value={syncForm.PM_Cycle}
                  onChange={e => setSyncForm(p => ({ ...p, PM_Cycle: e.target.value }))}
                >
                  <option value="30">30 วัน</option>
                  <option value="90">90 วัน</option>
                  <option value="120">120 วัน</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              {syncForm.PM_Cycle === 'CUSTOM' && (
                <div>
                  <label className="label">Custom (วัน)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={syncForm.Custom_PM_Days}
                    onChange={e => setSyncForm(p => ({ ...p, Custom_PM_Days: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="label">PM ล่าสุด</label>
                <input
                  className="input"
                  type="date"
                  value={syncForm.Last_PM_Date}
                  onChange={e => setSyncForm(p => ({ ...p, Last_PM_Date: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">PM ครั้งถัดไป</label>
                <input className="input" value={syncNextPMDate || ''} readOnly />
              </div>
              <div>
                <label className="label">นับถอยหลัง</label>
                <div className="input flex items-center">
                  {syncNextPMDate ? <PMCountdownBadge date={syncNextPMDate} /> : '—'}
                </div>
              </div>
              <div>
                <label className="label">ช่าง</label>
                <input
                  className="input"
                  value={syncForm.Assigned_Tech}
                  onChange={e => setSyncForm(p => ({ ...p, Assigned_Tech: e.target.value }))}
                  placeholder="ชื่อช่าง"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">URL รูป</label>
                <input
                  className="input"
                  value={syncForm.ImageUrl}
                  onChange={e => setSyncForm(p => ({ ...p, ImageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label">รูป</label>
                <div className="input flex items-center">
                  {syncForm.ImageUrl
                    ? <a href={syncForm.ImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">เปิดรูป</a>
                    : '—'}
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="label">หมายเหตุ</label>
                <textarea
                  className="input"
                  rows={2}
                  value={syncForm.Remark}
                  onChange={e => setSyncForm(p => ({ ...p, Remark: e.target.value }))}
                  placeholder="เพิ่มหมายเหตุ"
                />
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{maxHeight: 420, overflow: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>ซีเรียลเดิม</th>
                  <th>เครื่องปัจจุบัน</th>
                  <th>ตำแหน่ง</th>
                  <th>รอบ PM</th>
                  <th>รายการที่จะทำ</th>
                  <th>ซ้ำ</th>
                </tr>
              </thead>
              <tbody>
                {pmSyncPreviewRows.map((row, i) => (
                  <tr key={`${row.serialOld}-${row.machine}-${i}`}>
                    <td className="font-mono text-xs">{row.serialOld}</td>
                    <td>{row.machine}</td>
                    <td>{row.location || '—'}</td>
                    <td><span className="badge badge-blue">{syncCycleDays ? `${syncCycleDays} วัน` : '—'}</span></td>
                    <td><StatusBadge value={row.action} /></td>
                    <td>{row.duplicateCount ? `${row.duplicateCount} แถว` : '—'}</td>
                  </tr>
                ))}
                {!pmSyncPreviewRows.length && (
                  <tr><td colSpan={6} className="text-center py-8" style={{color:'var(--text-400)'}}>ไม่พบข้อมูล In-use จากเมนูกระบอก</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)}
        title={t('pm_edit')} size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">ซีเรียลเดิม</label>
            <input className="input" value={form.Machine_KI || ''} readOnly />
          </div>
          <div>
            <label className="label">เครื่องปัจจุบัน *</label>
            <input className="input" value={form.Machine_MC || ''} readOnly />
          </div>
          <F form={form} setForm={setForm} label="PM ล่าสุด"           id="Last_PM_Date"   type="date" />
          <F form={form} setForm={setForm} label="PM ครั้งถัดไป *"     id="Next_PM_Date"   type="date" />
          <div>
            <label className="label">รอบ PM (วัน)</label>
            <input className="input" value="90 วัน" readOnly />
          </div>
          <F form={form} setForm={setForm} label={t('pm_th_tech')}    id="Assigned_Tech" />
          <div className="col-span-2">
            <F form={form} setForm={setForm} label="ลิงก์รูป (Google Drive)" id="ImageUrl" useBuilder={false} />
            <div style={{ marginTop: 10 }}>
              <label className="label">อัปโหลดรูปประวัติเช็คศูนย์</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={(e) => onPickImageFile(e.target.files?.[0])}
              />
              {uploadingImage && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-500)' }}>กำลังอัปโหลดรูป...</div>}
              {form.ImageUrl && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <a href={form.ImageUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>
                    {form.ImageUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
          <F
            form={form}
            setForm={setForm}
            label={t('remark')}
            id="Remark"
            onChange={value => setForm(p => ({ ...p, Remark: appendPMImageMeta(value, p.ImageUrl) }))}
          />
        </div>
      </Modal>
        </>
      )}
    </div>
  )
}
