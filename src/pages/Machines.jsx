import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Cpu,
  Layers,
  MapPin,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Check,
  X,
  SlidersHorizontal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
} from 'lucide-react'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { MachineAPI, MACHINE_STATUS } from '../api/entities'
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
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generateMachinePdfProps } from '../utils/pdfDocGenerators'

const MACHINE_IMAGE_FOLDER = 'แท็กเครื่องจักร'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'machines'|column machines\.([^ ]+) does not exist/i

const EMPTY = {
  ITEM: '',
  Location: '',
  Mc: '',
  WaterCheck: '',
  Serial_OLD: '',
  Serial_NEW: '',
  Feeder: '',
  Manufacturer: '',
  Type: '',
  Diameter: '',
  Gauge: '',
  Needle: '',
  Oil: '',
  Model: '',
  Model_Inverter: '',
  Sinker: '',
  Tape1_No: '',
  Tape2_No: '',
  Tape3_No: '',
  Tape4_No: '',
  Dial_Front: '',
  Dial_Rear: '',
  Leg1: '',
  Leg2: '',
  Leg3: '',
  Leg4: '',
  Status: 'RUNNING',
  Remark: '',
  ImageUrl: '',
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

function getMachineImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Remark) || ''
}

function appendMachineImageMeta(remark = '', imageUrl = '') {
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

function getMissingMachineColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

// Friendly label for the abbreviated Type column in the summary card.
const TYPE_LABEL = { S: 'Single', D: 'Double', 'Jac.': 'Jacquard' }
const formatMcType = (v) => TYPE_LABEL[v] || v || '—'

// Build a Type/Diameter/Gauge grouping with counts, sorted numerically.
function buildMachineSummary(rows = []) {
  const groups = new Map()
  for (const m of rows) {
    const type = m?.Type || ''
    const dia = m?.Diameter || ''
    const gauge = m?.Gauge || ''
    const key = `${type}|${dia}|${gauge}`
    const entry = groups.get(key) || { Type: type, Diameter: dia, Gauge: gauge, count: 0 }
    entry.count += 1
    groups.set(key, entry)
  }
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^\d.]/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return [...groups.values()].sort((a, b) =>
    String(a.Type).localeCompare(String(b.Type)) ||
    toNum(a.Diameter) - toNum(b.Diameter) ||
    toNum(a.Gauge) - toNum(b.Gauge)
  )
}

const MC_FIELD_KEYS = {
  ITEM: 'mc_th_item',
  Location: 'mc_th_loc',
  Mc: 'mc_th_mc',
  WaterCheck: 'mc_th_watercheck',
  Serial_OLD: 'mc_th_serial_old',
  Serial_NEW: 'mc_th_serial_new',
  Feeder: 'mc_th_feeder',
  Manufacturer: 'mc_th_mfr',
  Type: 'mc_th_type',
  Diameter: 'mc_th_dia',
  Gauge: 'mc_th_gauge',
  Needle: 'mc_th_needle',
  Oil: 'mc_th_oil',
  Model: 'mc_th_model',
  Model_Inverter: 'mc_th_model_inv',
  Sinker: 'mc_th_sinker',
  Tape1_No: 'mc_th_tape1',
  Tape2_No: 'mc_th_tape2',
  Tape3_No: 'mc_th_tape3',
  Tape4_No: 'mc_th_tape4',
  Dial_Front: 'mc_th_dial_front',
  Dial_Rear: 'mc_th_dial_rear',
  Leg1: 'mc_th_leg1',
  Leg2: 'mc_th_leg2',
  Leg3: 'mc_th_leg3',
  Leg4: 'mc_th_leg4',
  Remark: 'mc_th_remark',
  updated_at: 'mc_th_updated',
  Status: 'status',
  ImageUrl: 'URL',
  ImagePreview: 'รูป',
}

/* ── Column definitions ── */
const MACHINE_MULTI_FILTER_KEYS = ['Location', 'Manufacturer', 'Type', 'Diameter', 'Gauge']
const MACHINE_MULTI_FILTER_SET = new Set(MACHINE_MULTI_FILTER_KEYS)
const MACHINE_FILTER_EXCLUDE_SET = new Set(['Mc'])

function machineFilterLabel(row, key) {
  const value = row?.[key]
  if (key === 'Type') return formatMcType(value)
  return value
}

function buildMachineFilterOptions(rows = [], key) {
  const seen = new Map()
  rows.forEach((row) => {
    const value = row?.[key]
    const normalized = String(value ?? '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.set(normalized, { value: normalized, label: machineFilterLabel(row, key) || normalized })
  })

  return [...seen.values()].sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'th', {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

export default function Machines() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('machines')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(MachineAPI)
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem, setPdfItem] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  // Top summary stats
  const stats = useMemo(() => {
    const total = data.length
    const running = data.filter((m) => m.Status === 'RUNNING').length
    const maintenance = data.filter((m) => m.Status === 'MAINTENANCE' || m.Status === 'STOP').length
    const uniqueLocations = new Set(data.map((m) => m.Location).filter(Boolean)).size
    return { total, running, maintenance, uniqueLocations }
  }, [data])

  const renderMachineImageUrl = (row) => {
    const imageUrl = getMachineImageUrl(row)
    if (!imageUrl) return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    return (
      <a
        href={imageUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] truncate"
      >
        <span className="truncate">{imageUrl}</span>
        <ExternalLink size={11} className="flex-shrink-0 opacity-70" />
      </a>
    )
  }

  const renderMachineImagePreview = (row) => {
    const imageUrl = getMachineImageUrl(row)
    if (!imageUrl) return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setPreviewImageModal({ url: imageUrl, title: `เครื่องจักร ${row.Mc}` })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all border border-blue-500/20"
        >
          <ImageIcon size={13} />
          <span>เปิดรูป</span>
        </button>
      </div>
    )
  }

  const defaultCols = useMemo(() => [
    { key: 'ITEM', label: t('mc_th_item'), render: (m, i) => <span className="font-mono text-slate-500">{m.ITEM || i + 1}</span> },
    { key: 'Location', label: t('mc_th_loc'), render: (m) => <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px]">{m.Location || '—'}</span> },
    { key: 'Mc', label: t('mc_th_mc'), render: (m) => <span className="font-mono font-black text-blue-600 dark:text-blue-400">{m.Mc}</span> },
    { key: 'WaterCheck', label: t('mc_th_watercheck'), render: (m) => <span className="text-slate-600 dark:text-slate-400">{m.WaterCheck || '—'}</span> },
    { key: 'Serial_OLD', label: t('mc_th_serial_old'), render: (m) => <span className="font-mono text-[11px] text-slate-500">{m.Serial_OLD || '—'}</span> },
    { key: 'Serial_NEW', label: t('mc_th_serial_new'), render: (m) => <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{m.Serial_NEW || '—'}</span> },
    { key: 'Feeder', label: t('mc_th_feeder'), render: (m) => <span className="font-mono">{m.Feeder || '—'}</span> },
    { key: 'Manufacturer', label: t('mc_th_mfr'), render: (m) => <span className="font-medium text-slate-800 dark:text-slate-200">{m.Manufacturer || '—'}</span> },
    { key: 'Type', label: t('mc_th_type'), render: (m) => <span className="font-bold text-slate-700 dark:text-slate-300">{m.Type || '—'}</span> },
    { key: 'Diameter', label: t('mc_th_dia'), render: (m) => <span className="font-mono">{m.Diameter ? `${m.Diameter}"` : '—'}</span> },
    { key: 'Gauge', label: t('mc_th_gauge'), render: (m) => <span className="font-mono">{m.Gauge ? `${m.Gauge}G` : '—'}</span> },
    { key: 'Needle', label: t('mc_th_needle'), render: (m) => <span className="font-mono">{m.Needle || '—'}</span> },
    { key: 'Oil', label: t('mc_th_oil'), render: (m) => <span className="font-mono">{m.Oil || '—'}</span> },
    { key: 'Model', label: t('mc_th_model'), render: (m) => <span className="text-slate-700 dark:text-slate-300">{m.Model || '—'}</span> },
    { key: 'Model_Inverter', label: t('mc_th_model_inv'), render: (m) => <span className="text-slate-600 dark:text-slate-400">{m.Model_Inverter || '—'}</span> },
    { key: 'Sinker', label: t('mc_th_sinker'), render: (m) => <span className="font-mono text-slate-500">{m.Sinker || '—'}</span> },
    { key: 'ImageUrl', label: 'URL', render: renderMachineImageUrl },
    { key: 'ImagePreview', label: 'รูป', render: renderMachineImagePreview },
    { key: 'Remark', label: t('mc_th_remark'), render: (m) => <span className="max-w-[130px] truncate block text-slate-500">{stripImageUrlMeta(m.Remark) || '—'}</span> },
    { key: 'updated_at', label: t('mc_th_updated'), render: (m) => {
      const d = m.updated_at || m.LastUpdated
      return d ? <span className="font-mono text-[11px] text-slate-400">{format(new Date(d), 'dd/MM/yy HH:mm')}</span> : <span className="text-slate-400">—</span>
    }},
    { key: 'Status', label: t('status'), render: (m) => <StatusBadge value={m.Status} /> },
  ], [t])

  const wbCols = useWebBuilderMenu('/machines')
  const normalizedWbCols = useMemo(() => (wbCols?.length
    ? [
        ...wbCols,
        ...[
          { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
          { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
        ].filter((required) => !wbCols.some((col) => col.field === required.field)),
      ]
    : null), [wbCols])

  const cols = normalizedWbCols?.length
    ? normalizedWbCols.map((wbc) => {
        const label = MC_FIELD_KEYS[wbc.field] ? t(MC_FIELD_KEYS[wbc.field]) : wbc.label
        if (wbc.field === 'ImageUrl') return { key: wbc.field, label, render: renderMachineImageUrl }
        if (wbc.field === 'ImagePreview') return { key: wbc.field, label, render: renderMachineImagePreview }
        if (wbc.type === 'select') {
          return {
            key: wbc.field,
            label,
            render: (m) => {
              const val = m[wbc.field]
              if (!val) return <span className="text-slate-400">—</span>
              const optColor = wbc.options?.find((o) => o.value === val || o.label === val)?.color
              return <StatusBadge value={val} color={optColor} />
            },
          }
        }
        const known = defaultCols.find((c) => c.key === wbc.field)
        if (known) return { ...known, label }
        return { key: wbc.field, label, render: (m) => m[wbc.field] ?? '—' }
      })
    : defaultCols

  const searched = useMemo(() => {
    return data.filter((m) =>
      [m.Mc, m.Location, m.Type, m.Manufacturer, m.Model, m.Serial_NEW, m.Serial_OLD, getMachineImageUrl(m), stripImageUrlMeta(m.Remark)].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

  const machineFilterOptions = useMemo(() => {
    return MACHINE_MULTI_FILTER_KEYS.reduce((acc, key) => {
      acc[key] = buildMachineFilterOptions(data, key)
      return acc
    }, {})
  }, [data])

  const FS_COLS = useMemo(() => {
    const src = normalizedWbCols?.length ? normalizedWbCols : [
      { field: 'Location', type: 'text' },
      { field: 'Status', type: 'select' },
      { field: 'Type', type: 'text' },
      { field: 'Manufacturer', type: 'text' },
      { field: 'Diameter', type: 'text' },
      { field: 'Gauge', type: 'text' },
      { field: 'updated_at', type: 'date' },
    ]
    return src.map((col) => {
      const key = col.field || col.key
      if (MACHINE_FILTER_EXCLUDE_SET.has(key)) return null
      const label = MC_FIELD_KEYS[key] ? t(MC_FIELD_KEYS[key]) : (col.label || key)
      if (MACHINE_MULTI_FILTER_SET.has(key)) {
        return {
          key,
          label,
          sortable: true,
          filter: { type: 'select', opts: machineFilterOptions[key] || [], multi: true },
        }
      }
      if (['date', 'datetime', 'datetime-local'].includes(col.type)) {
        return { key, label, sortable: true, filter: { type: 'date' } }
      }
      if (col.type === 'number') {
        return { key, label, sortable: true, filter: { type: 'number' } }
      }
      if (['boolean', 'textarea'].includes(col.type)) {
        return { key, label, sortable: true, filter: { type: 'text' } }
      }
      if (col.type === 'select') {
        const opts = col.options?.length ? col.options : (key === 'Status' ? MACHINE_STATUS : null)
        return { key, label, sortable: true, ...(opts ? { filter: { type: 'select', opts } } : {}) }
      }
      return { key, label, sortable: true, filter: { type: 'text' } }
    }).filter(Boolean)
  }, [machineFilterOptions, normalizedWbCols, t])

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

  const displayRows = useMemo(() => applyFilterSort(searched, FS_COLS, filterSort), [searched, FS_COLS, filterSort])
  const summary = useMemo(() => buildMachineSummary(data), [data])

  const openNew = () => {
    setForm(EMPTY)
    setModal(true)
  }

  const openEdit = (m) => {
    setForm({ ...m, ImageUrl: getMachineImageUrl(m), Remark: stripImageUrlMeta(m.Remark) })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: MACHINE_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Remark: appendMachineImageMeta(prev.Remark, imageUrl),
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${MACHINE_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithImageFallback = async (payload) => {
    try {
      await save(payload)
    } catch (error) {
      if (getMissingMachineColumn(error) === 'ImageUrl') {
        await save({
          ...omitKeys(payload, ['ImageUrl']),
          Remark: appendMachineImageMeta(payload.Remark, payload.ImageUrl),
        })
        if (payload.ImageUrl) toast.success('บันทึกลิงก์รูปในหมายเหตุแล้ว', 'ฐานข้อมูลยังไม่มีคอลัมน์ ImageUrl ของเครื่องจักร')
        return
      }
      throw error
    }
  }

  const submit = async () => {
    if (!form.Mc || !form.Location) {
      toast.warning('กรุณากรอกข้อมูล', 'Mc และ Location จำเป็นต้องกรอก')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      await saveWithImageFallback({
        ...form,
        Remark: appendMachineImageMeta(form.Remark, form.ImageUrl),
      })
      toast.success(isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', `เครื่อง ${form.Mc}`)
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('mc_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบข้อมูลสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── SUMMARY STATS CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">เครื่องจักรทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Cpu size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สถานะปกติ (Running)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.running} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ซ่อมบำรุง / หยุด</div>
            <div className="text-xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
              {stats.maintenance} <span className="text-xs font-normal text-slate-400">เครื่อง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">โซน / ตำแหน่ง</div>
            <div className="text-xl font-black mt-0.5 text-indigo-600 dark:text-indigo-400">
              {stats.uniqueLocations} <span className="text-xs font-normal text-slate-400">โซน</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <MapPin size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('mc_search')}
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="เครื่องจักร"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              ImageUrl: getMachineImageUrl,
              ImagePreview: getMachineImageUrl,
              Remark: (row) => stripImageUrlMeta(row.Remark),
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>

          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus size={15} />
              <span>{t('mc_add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SUMMARY ACCORDION ─────────────────────────────────── */}
      {summary.length > 0 && (
        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">สรุปจำนวนเครื่องจักรตามกลุ่ม</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {data.length} เครื่อง · {summary.length} กลุ่ม
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSummary((s) => !s)}
              className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1"
            >
              <span>{showSummary ? 'ซ่อน' : 'แสดงกลุ่ม'}</span>
              {showSummary ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {showSummary && (
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {summary.map((g) => (
                <div
                  key={`${g.Type}|${g.Diameter}|${g.Gauge}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="min-w-0 pr-1 truncate">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMcType(g.Type)}</span>
                    <span className="font-mono text-slate-500 text-[11px] ml-1.5">
                      {g.Diameter || '—'}" · {g.Gauge || '—'}G
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-blue-500 text-white flex-shrink-0">
                    {g.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DATA TABLE ────────────────────────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                {cols.map((c) => (
                  <th key={c.key} className="py-3 px-3 text-left whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-24">จัดการ</th>
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
              {!loading && displayRows.map((m, i) => (
                <tr
                  key={m._id || m.id || i}
                  onClick={() => setDetailRec(m)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                      {c.render(m, i)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPdfItem(m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="ดูเอกสาร PDF และพิมพ์"
                      >
                        <FileText size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขข้อมูลเครื่องจักร"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(m._id || m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="ลบข้อมูล"
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
                    <Cpu size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่มเครื่องจักร" เพื่อเริ่มต้นบันทึก</p>
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
        title={detailRec?.Mc}
        subtitle={detailRec?.Location ? `ตำแหน่ง: ${detailRec.Location}` : ''}
        icon={Cpu}
        accentColor="#2563eb"
        badge={detailRec && <StatusBadge value={detailRec.Status} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onPdf={() => setPdfItem(detailRec)}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        groups={detailRec ? [
          {
            label: t('dr_general_info'),
            fields: [
              { label: t('mc_th_mc'), value: detailRec.Mc },
              { label: t('mc_th_loc'), value: detailRec.Location },
              { label: t('mc_th_type'), value: detailRec.Type },
              { label: t('mc_th_mfr'), value: detailRec.Manufacturer },
              { label: t('mc_th_model'), value: detailRec.Model },
              { label: t('mc_th_watercheck'), value: detailRec.WaterCheck },
              { label: 'ลิงก์รูปถ่าย', value: getMachineImageUrl(detailRec), full: true },
            ].filter((f) => f.value),
          },
          {
            label: t('dr_specs'),
            fields: [
              { label: t('mc_th_dia'), value: detailRec.Diameter ? `${detailRec.Diameter}"` : null },
              { label: t('mc_th_gauge'), value: detailRec.Gauge ? `${detailRec.Gauge}G` : null },
              { label: t('mc_th_needle'), value: detailRec.Needle },
              { label: t('mc_th_oil'), value: detailRec.Oil },
              { label: t('mc_th_feeder'), value: detailRec.Feeder },
              { label: t('mc_th_model_inv'), value: detailRec.Model_Inverter },
              { label: t('mc_th_sinker'), value: detailRec.Sinker },
            ].filter((f) => f.value),
          },
          {
            label: 'Serial Numbers',
            fields: [
              { label: t('mc_th_serial_old'), value: detailRec.Serial_OLD, mono: true },
              { label: t('mc_th_serial_new'), value: detailRec.Serial_NEW, mono: true },
            ].filter((f) => f.value),
          },
          {
            label: 'Tape, Dial & Leg Parameters',
            fields: [
              { label: t('mc_th_tape1'), value: detailRec.Tape1_No },
              { label: t('mc_th_tape2'), value: detailRec.Tape2_No },
              { label: t('mc_th_tape3'), value: detailRec.Tape3_No },
              { label: t('mc_th_tape4'), value: detailRec.Tape4_No },
              { label: t('mc_th_dial_front'), value: detailRec.Dial_Front },
              { label: t('mc_th_dial_rear'), value: detailRec.Dial_Rear },
              { label: t('mc_th_leg1'), value: detailRec.Leg1 },
              { label: t('mc_th_leg2'), value: detailRec.Leg2 },
              { label: t('mc_th_leg3'), value: detailRec.Leg3 },
              { label: t('mc_th_leg4'), value: detailRec.Leg4 },
            ].filter((f) => f.value),
          },
          {
            label: t('remark'),
            single: true,
            fields: [
              { label: t('remark'), value: stripImageUrlMeta(detailRec.Remark), full: true },
            ].filter((f) => f.value),
          },
          {
            label: t('dr_updated'),
            fields: [
              {
                label: t('field_updated_at'),
                value: (detailRec.updated_at || detailRec.LastUpdated)
                  ? format(new Date(detailRec.updated_at || detailRec.LastUpdated), 'dd/MM/yyyy HH:mm')
                  : null,
              },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลเครื่องจักร' : '➕ เพิ่มข้อมูลเครื่องจักรใหม่'}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button type="button" className="btn-outline px-4" onClick={() => setModal(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn-primary px-5" onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
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
        <div className="space-y-5 text-xs">
          {/* Section 1: General Info */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Cpu size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและสถานะเครื่องจักร</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label={`${t('mc_th_mc')} (Mc) *`} id="Mc" placeholder="เช่น SA369-P" />
              <F form={form} setForm={setForm} label={`${t('mc_th_loc')} *`} id="Location" placeholder="เช่น GK3" />
              <F form={form} setForm={setForm} label={t('status')} id="Status" opts={MACHINE_STATUS} />
              <F form={form} setForm={setForm} label={t('mc_th_item')} id="ITEM" type="number" placeholder="ลำดับ" />
              <F form={form} setForm={setForm} label={t('mc_th_type')} id="Type" placeholder="เช่น S หรือ D" />
              <F form={form} setForm={setForm} label={t('mc_th_mfr')} id="Manufacturer" placeholder="เช่น Pailung" />
              <F form={form} setForm={setForm} label={t('mc_th_model')} id="Model" placeholder="เช่น PL-KS3B/C-W" />
              <F form={form} setForm={setForm} label={t('mc_th_watercheck')} id="WaterCheck" placeholder="เช่น 11/3/2566" />
            </div>
          </div>

          {/* Section 2: Specs */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers size={14} className="text-blue-500" />
              <span>สเปกและส่วนประกอบเครื่องจักร</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <F form={form} setForm={setForm} label={t('mc_th_dia')} id="Diameter" placeholder="เช่น 36" />
              <F form={form} setForm={setForm} label={t('mc_th_gauge')} id="Gauge" placeholder="เช่น 28" />
              <F form={form} setForm={setForm} label={t('mc_th_needle')} id="Needle" placeholder="เช่น 3168" />
              <F form={form} setForm={setForm} label={t('mc_th_feeder')} id="Feeder" placeholder="เช่น 110" />
              <F form={form} setForm={setForm} label={t('mc_th_oil')} id="Oil" placeholder="เช่น 41" />
              <F form={form} setForm={setForm} label={t('mc_th_sinker')} id="Sinker" placeholder="Sinker" />
              <F form={form} setForm={setForm} label={t('mc_th_model_inv')} id="Model_Inverter" placeholder="Inverter Model" />
              <F form={form} setForm={setForm} label={t('mc_th_serial_old')} id="Serial_OLD" placeholder="ซีเรียลเดิม" />
              <F form={form} setForm={setForm} label={t('mc_th_serial_new')} id="Serial_NEW" placeholder="ซีเรียลใหม่" />
            </div>
          </div>

          {/* Section 3: Tape, Dial & Leg */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <SlidersHorizontal size={14} className="text-emerald-500" />
              <span>พารามิเตอร์สายพาน, หน้าปัด และขาเครื่องจักร (Tape, Dial, Legs)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <F form={form} setForm={setForm} label={t('mc_th_tape1')} id="Tape1_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape2')} id="Tape2_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape3')} id="Tape3_No" />
              <F form={form} setForm={setForm} label={t('mc_th_tape4')} id="Tape4_No" />
              <F form={form} setForm={setForm} label={t('mc_th_dial_front')} id="Dial_Front" />
              <F form={form} setForm={setForm} label={t('mc_th_dial_rear')} id="Dial_Rear" />
              <F form={form} setForm={setForm} label={t('mc_th_leg1')} id="Leg1" />
              <F form={form} setForm={setForm} label={t('mc_th_leg2')} id="Leg2" />
              <F form={form} setForm={setForm} label={t('mc_th_leg3')} id="Leg3" />
              <F form={form} setForm={setForm} label={t('mc_th_leg4')} id="Leg4" />
            </div>
          </div>

          {/* Section 4: Photo & Remark */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายแท็กเครื่องจักร & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปแท็กเข้า Google Drive</label>
                <div className="flex items-center gap-2">
                  <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 flex-1 justify-center">
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
                  label={t('mc_th_remark')}
                  id="Remark"
                  placeholder="ข้อคิดเห็น หรือประวัติพิเศษของเครื่อง"
                  onChange={(value) => setForm((p) => ({ ...p, Remark: appendMachineImageMeta(value, p.ImageUrl) }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      {previewImageModal && (
        <Modal
          open={!!previewImageModal}
          onClose={() => setPreviewImageModal(null)}
          title={`🖼️ ${previewImageModal.title}`}
        >
          <div className="space-y-4 text-center">
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[65vh] w-auto object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <a
                href={previewImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="btn-outline text-xs flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>เปิดในแท็บใหม่ (Full Size)</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="btn-primary text-xs px-4"
              >
                ปิด
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateMachinePdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
