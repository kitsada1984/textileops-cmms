import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowLeftRight,
  Settings2,
  Disc,
  QrCode,
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import useWebBuilderMenu, { useWebBuilderColumn } from '../hooks/useWebBuilderMenu'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { AuditLogAPI, CylinderAPI, CYL_STATUS } from '../api/entities'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import SwapCylinderModal, { buildCylinderSwapPayload, SwapSettingsModal } from '../components/SwapCylinder'
import usePagePerms from '../hooks/usePagePerms'
import { useToast } from '../components/ui/Toast'
import DetailDrawer from '../components/ui/DetailDrawer'
import CylinderQRModal from '../components/CylinderQR'
import BatchQRModal from '../components/CylinderQRBatch'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { applyFilterSort } from '../utils/filterSort'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import {
  appendCylinderImageMeta,
  getCylinderImageUrl,
  stripCylinderImageMeta,
} from '../utils/cylinderImage'

const CYLINDER_IMAGE_FOLDER = 'รูปกระบอก'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'cylinders'|column cylinders\.([^ ]+) does not exist/i
const MACHINE_REF_OPTIONS = ['In-use-GMK1', 'Spare-GMK1', 'In-use-GMK3', 'Spare-GMK3']

const EMPTY = {
  ITEM: '',
  Location: '',
  Standard: '',
  NewMC: '',
  Serial_OLD: '',
  Serial_NOW: '',
  Status_Now: 'STANDARD',
  Feeder: '',
  Manufacturer: '',
  Type: '',
  Diameter: '',
  Gauge: '',
  Needle: '',
  Machine_Ref: '',
  Comment: '',
  ImageUrl: '',
}

function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

function getMissingCylinderColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

// Friendly label for the abbreviated Type column in the summary card.
const TYPE_LABEL = { S: 'Single', D: 'Double', 'Jac.': 'Jacquard' }
const formatCylType = (v) => TYPE_LABEL[v] || v || '—'

// Build a Type/Diameter/Gauge grouping with counts, sorted numerically.
function buildCylinderSummary(rows = []) {
  const groups = new Map()
  for (const c of rows) {
    const type = c?.Type || ''
    const dia = c?.Diameter || ''
    const gauge = c?.Gauge || ''
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

function buildMachineRefSummary(rows = []) {
  return MACHINE_REF_OPTIONS.map((value) => ({
    value,
    count: rows.filter((row) => String(row.Machine_Ref || '').trim() === value).length,
  }))
}

const CYL_FIELD_KEYS = {
  ITEM: 'cyl_th_item',
  Location: 'cyl_th_loc',
  Standard: 'cyl_th_standard',
  NewMC: 'cyl_th_newmc',
  Serial_OLD: 'cyl_th_serial_old',
  Serial_NOW: 'cyl_th_serial_now',
  Status_Now: 'cyl_th_status_now',
  Feeder: 'cyl_th_feeder',
  Manufacturer: 'cyl_th_mfr',
  Type: 'cyl_th_type',
  Diameter: 'cyl_th_dia',
  Gauge: 'cyl_th_gauge',
  Needle: 'cyl_th_needle',
  Machine_Ref: 'cyl_th_machine_ref',
  Comment: 'cyl_th_comment',
  updated_at: 'mc_th_updated',
  ImageUrl: 'URL',
  ImagePreview: 'รูป',
}

const CYLINDER_MULTI_FILTER_KEYS = ['Location', 'Manufacturer', 'Type', 'Diameter', 'Gauge', 'Machine_Ref']
const CYLINDER_MULTI_FILTER_SET = new Set(CYLINDER_MULTI_FILTER_KEYS)
const CYLINDER_FILTER_EXCLUDE_SET = new Set(['ITEM', 'Feeder', 'Status_Now', 'Standard', 'Serial_NOW'])

function cylinderFilterValue(row, key, index) {
  if (key === 'ITEM') return row?.ITEM || index + 1
  return row?.[key]
}

function cylinderFilterLabel(row, key, index) {
  const value = cylinderFilterValue(row, key, index)
  if (key === 'Type') return formatCylType(value)
  return value
}

function buildCylinderFilterOptions(rows = [], key) {
  const seen = new Map()
  rows.forEach((row, index) => {
    const value = cylinderFilterValue(row, key, index)
    const normalized = String(value ?? '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.set(normalized, { value: normalized, label: cylinderFilterLabel(row, key, index) || normalized })
  })

  return [...seen.values()].sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'th', {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

function normalizeOptions(opts = []) {
  return opts.map((o) => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter((o) => o.value !== undefined && o.value !== null)
}

function FormField({ label, id, type = 'text', opts, form, onChange }) {
  const wbCol = useWebBuilderColumn('/cylinders', id)
  const forcedOptions = id === 'Machine_Ref' ? MACHINE_REF_OPTIONS : opts
  const effectiveType = id === 'Machine_Ref' ? 'select' : (wbCol?.type || (forcedOptions ? 'select' : type))
  const effectiveOptions = effectiveType === 'select'
    ? normalizeOptions((id === 'Machine_Ref' ? MACHINE_REF_OPTIONS : (wbCol?.options?.length ? wbCol.options : forcedOptions)) || [])
    : []
  const effectiveRows = Number(wbCol?.height || 2)
  const effectiveLabel = wbCol?.label
    ? `${wbCol.label}${wbCol.required ? ' *' : ''}`
    : label
  const val = form[id] ?? ''
  const currentOptionExists = effectiveOptions.some((o) => String(o.value) === String(val))
  const handleChange = (e) => onChange(id, e.target.value)

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text/plain') ?? ''
    if (!pasted) return
    e.preventDefault()
    const el = e.target
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + pasted + el.value.slice(end)
    onChange(id, next)
    requestAnimationFrame(() => {
      el.setSelectionRange(start + pasted.length, start + pasted.length)
    })
  }

  return (
    <div>
      <label className="label">{effectiveLabel}</label>
      {effectiveType === 'select'
        ? (
          <select className="select" value={val} onChange={handleChange}>
            <option value="">—</option>
            {val !== '' && !currentOptionExists && <option value={val}>{val}</option>}
            {effectiveOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
        : effectiveType === 'textarea'
          ? (
            <textarea
              className="input"
              rows={effectiveRows}
              value={val}
              onChange={handleChange}
              onPaste={handlePaste}
            />
          )
          : effectiveType === 'boolean'
            ? (
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => onChange(id, e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>{val ? 'Yes' : 'No'}</span>
              </label>
            )
            : (
              <input
                className="input"
                type={effectiveType}
                value={val}
                onChange={(e) => onChange(id, effectiveType === 'number'
                  ? (e.target.value === '' ? '' : +e.target.value)
                  : e.target.value
                )}
                onPaste={effectiveType !== 'number' ? handlePaste : undefined}
              />
            )}
    </div>
  )
}

export default function Cylinders() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('cylinders')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(CylinderAPI)
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapCfgOpen, setSwapCfgOpen] = useState(false)
  const [openingSwap, setOpeningSwap] = useState(false)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  const renderCylinderImageUrl = (row) => {
    const imageUrl = getCylinderImageUrl(row)
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

  const renderCylinderImagePreview = (row) => {
    const imageUrl = getCylinderImageUrl(row)
    if (!imageUrl) return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setPreviewImageModal({ url: imageUrl, title: `กระบอก ${row.Serial_NOW || row.Standard || ''}` })}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all border border-blue-500/20"
        >
          <ImageIcon size={13} />
          <span>เปิดรูป</span>
        </button>
      </div>
    )
  }

  const defaultCols = useMemo(() => [
    { key: 'ITEM', label: t('cyl_th_item'), render: (c, i) => <span className="font-mono text-slate-500">{c.ITEM || i + 1}</span> },
    { key: 'Location', label: t('cyl_th_loc'), render: (c) => <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px]">{c.Location || '—'}</span> },
    { key: 'Standard', label: t('cyl_th_standard'), render: (c) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.Standard || '—'}</span> },
    { key: 'NewMC', label: t('cyl_th_newmc'), render: (c) => <span className="font-mono text-slate-700 dark:text-slate-300">{c.NewMC || '—'}</span> },
    { key: 'Serial_OLD', label: t('cyl_th_serial_old'), render: (c) => <span className="font-mono text-[11px] text-slate-500">{c.Serial_OLD || '—'}</span> },
    { key: 'Serial_NOW', label: t('cyl_th_serial_now'), render: (c) => <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">{c.Serial_NOW || '—'}</span> },
    {
      key: 'Status_Now',
      label: t('cyl_th_status_now'),
      render: (c) => {
        const display = (c.Serial_OLD && c.Serial_NOW && c.Serial_OLD === c.Serial_NOW)
          ? 'STANDARD'
          : (c.Serial_NOW || '—')
        const clean = ['STANDARD', 'SCRAP', 'REPAIR', 'RESERVE'].includes(display)
        return clean
          ? <StatusBadge value={display} />
          : <span className="font-mono text-xs text-slate-500">{display}</span>
      },
    },
    { key: 'Feeder', label: t('cyl_th_feeder'), render: (c) => <span className="font-mono">{c.Feeder || '—'}</span> },
    { key: 'Manufacturer', label: t('cyl_th_mfr'), render: (c) => <span className="font-medium text-slate-800 dark:text-slate-200">{c.Manufacturer || '—'}</span> },
    { key: 'Type', label: t('cyl_th_type'), render: (c) => <span className="font-bold text-slate-700 dark:text-slate-300">{c.Type || '—'}</span> },
    { key: 'Diameter', label: t('cyl_th_dia'), render: (c) => <span className="font-mono">{c.Diameter ? `${c.Diameter}"` : '—'}</span> },
    { key: 'Gauge', label: t('cyl_th_gauge'), render: (c) => <span className="font-mono">{c.Gauge ? `${c.Gauge}G` : '—'}</span> },
    { key: 'Needle', label: t('cyl_th_needle'), render: (c) => <span className="font-mono">{c.Needle || '—'}</span> },
    {
      key: 'Machine_Ref',
      label: t('cyl_th_machine_ref'),
      render: (c) => {
        if (!c.Machine_Ref) return <span className="text-slate-400">—</span>
        const isInUse = String(c.Machine_Ref).startsWith('In-use')
        return (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
            isInUse
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
          }`}>
            {c.Machine_Ref}
          </span>
        )
      },
    },
    { key: 'ImageUrl', label: 'URL', render: renderCylinderImageUrl },
    { key: 'ImagePreview', label: 'รูป', render: renderCylinderImagePreview },
    { key: 'Comment', label: t('cyl_th_comment'), render: (c) => <span className="max-w-[130px] truncate block text-slate-500">{stripCylinderImageMeta(c.Comment) || '—'}</span> },
    {
      key: 'updated_at',
      label: t('mc_th_updated'),
      render: (c) => {
        const d = c.updated_at
        return d ? <span className="font-mono text-[11px] text-slate-400">{format(new Date(d), 'dd/MM/yy HH:mm')}</span> : <span className="text-slate-400">—</span>
      },
    },
  ], [t])

  const allCols = defaultCols
  const wbCols = useWebBuilderMenu('/cylinders')
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
        const label = CYL_FIELD_KEYS[wbc.field] ? t(CYL_FIELD_KEYS[wbc.field]) : wbc.label
        if (wbc.field === 'ImageUrl') return { key: wbc.field, label, render: renderCylinderImageUrl }
        if (wbc.field === 'ImagePreview') return { key: wbc.field, label, render: renderCylinderImagePreview }
        if (wbc.type === 'select') {
          return {
            key: wbc.field,
            label,
            render: (c) => {
              const val = c[wbc.field]
              if (!val) return <span className="text-slate-400">—</span>
              const optColor = wbc.options?.find((o) => o.value === val || o.label === val)?.color
              return <StatusBadge value={val} color={optColor} />
            },
          }
        }
        const known = allCols.find((c) => c.key === wbc.field)
        if (known) return { ...known, label }
        return { key: wbc.field, label, render: (c) => c[wbc.field] ?? '—' }
      })
    : allCols

  const searched = useMemo(() => {
    return data.filter((c) =>
      [c.Serial_NOW, c.Serial_OLD, c.NewMC, c.Location, c.Standard, c.Type, c.Manufacturer, getCylinderImageUrl(c), stripCylinderImageMeta(c.Comment)].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

  const cylinderFilterOptions = useMemo(() => {
    return CYLINDER_MULTI_FILTER_KEYS.reduce((acc, key) => {
      acc[key] = key === 'Machine_Ref'
        ? normalizeOptions(MACHINE_REF_OPTIONS)
        : buildCylinderFilterOptions(data, key)
      return acc
    }, {})
  }, [data])

  const FS_COLS = useMemo(() => {
    const src = normalizedWbCols?.length ? normalizedWbCols : [
      { field: 'Location', type: 'text' },
      { field: 'Machine_Ref', type: 'select', options: MACHINE_REF_OPTIONS },
      { field: 'Type', type: 'text' },
      { field: 'Manufacturer', type: 'text' },
      { field: 'Diameter', type: 'text' },
      { field: 'Gauge', type: 'text' },
      { field: 'updated_at', type: 'date' },
    ]
    return src.map((col) => {
      const key = col.field || col.key
      if (CYLINDER_FILTER_EXCLUDE_SET.has(key)) return null
      const label = CYL_FIELD_KEYS[key] ? t(CYL_FIELD_KEYS[key]) : (col.label || key)
      if (CYLINDER_MULTI_FILTER_SET.has(key)) {
        return {
          key,
          label,
          sortable: true,
          getValue: key === 'ITEM' ? (row, index) => cylinderFilterValue(row, key, data.indexOf(row)) : undefined,
          filter: { type: 'select', opts: cylinderFilterOptions[key] || [], multi: true },
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
        const opts = col.options?.length
          ? col.options
          : key === 'Status_Now'
            ? CYL_STATUS
            : key === 'Machine_Ref'
              ? MACHINE_REF_OPTIONS
              : null
        return { key, label, sortable: true, ...(opts ? { filter: { type: 'select', opts } } : {}) }
      }
      return { key, label, sortable: true, filter: { type: 'text' } }
    }).filter(Boolean)
  }, [cylinderFilterOptions, data, normalizedWbCols, t])

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

  const [detailRec, setDetailRec] = useState(null)
  const [qrRec, setQrRec] = useState(null)
  const [batchQrOpen, setBatchQrOpen] = useState(false)
  const [showMachineRefSummary, setShowMachineRefSummary] = useState(true)
  const [showSummary, setShowSummary] = useState(false)

  const summary = useMemo(() => buildCylinderSummary(data), [data])
  const machineRefSummary = useMemo(() => buildMachineRefSummary(data), [data])

  const openNew = () => {
    setForm(EMPTY)
    setModal(true)
  }

  const openEdit = (c) => {
    setForm({ ...c, ImageUrl: getCylinderImageUrl(c), Comment: stripCylinderImageMeta(c.Comment) })
    setModal(true)
    setDetailRec(null)
  }

  const openQR = (c, e) => {
    e?.stopPropagation()
    setQrRec(c)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: CYLINDER_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Comment: stripCylinderImageMeta(prev.Comment),
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${CYLINDER_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithImageFallback = async (payload) => {
    try {
      await save(payload)
    } catch (error) {
      if (getMissingCylinderColumn(error) === 'ImageUrl') {
        await save({
          ...omitKeys(payload, ['ImageUrl']),
          Comment: appendCylinderImageMeta(payload.Comment, payload.ImageUrl),
        })
        if (payload.ImageUrl) toast.success('บันทึกลิงก์รูปในหมายเหตุแล้ว', 'ฐานข้อมูลยังไม่มีคอลัมน์ ImageUrl ของกระบอก')
        return
      }
      throw error
    }
  }

  const updateCylinderWithImageFallback = async (id, payload) => {
    try {
      await CylinderAPI.update(id, payload)
    } catch (error) {
      if (getMissingCylinderColumn(error) === 'ImageUrl') {
        await CylinderAPI.update(id, {
          ...omitKeys(payload, ['ImageUrl']),
          Comment: appendCylinderImageMeta(payload.Comment, payload.ImageUrl),
        })
        return
      }
      throw error
    }
  }

  const submit = async () => {
    if (!form.Serial_NOW) {
      toast.warning('กรุณากรอกข้อมูล', t('cyl_req'))
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      await saveWithImageFallback({
        ...form,
        Comment: appendCylinderImageMeta(form.Comment, form.ImageUrl),
      })
      toast.success(
        isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ',
        `กระบอก ${form.Serial_NOW}`
      )
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('cyl_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบข้อมูลสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const openSwapWithLatestData = async () => {
    setOpeningSwap(true)
    try {
      await load()
      setSwapOpen(true)
    } finally {
      setOpeningSwap(false)
    }
  }

  const handleSwap = async (newIn, newOut, meta = {}) => {
    let payload = { newIn, newOut }
    if (meta.inId && meta.outId && meta.swapCols) {
      const [latestIn, latestOut] = await Promise.all([
        CylinderAPI.get(meta.inId),
        CylinderAPI.get(meta.outId),
      ])
      payload = buildCylinderSwapPayload(latestIn, latestOut, meta.swapCols) || payload
    }

    await updateCylinderWithImageFallback(payload.newIn.id || payload.newIn._id, payload.newIn)
    await updateCylinderWithImageFallback(payload.newOut.id || payload.newOut._id, payload.newOut)

    try {
      await AuditLogAPI.create({
        Module: 'CYLINDERS',
        ActionType: 'SWAP',
        RecordID: `${payload.newIn.Serial_NOW || ''} <-> ${payload.newOut.Serial_NOW || ''}`,
        FieldName: 'SwapCylinder',
        OldValue: JSON.stringify({ in: meta.inId, out: meta.outId }),
        NewValue: JSON.stringify({
          in: { id: payload.newIn.id, serial: payload.newIn.Serial_NOW, loc: payload.newIn.Location },
          out: { id: payload.newOut.id, serial: payload.newOut.Serial_NOW, loc: payload.newOut.Location },
        }),
        Comment: `สลับกระบอก ${payload.newIn.Serial_NOW} กับ ${payload.newOut.Serial_NOW}`,
      })
    } catch {}

    await load()
    toast.success('สลับกระบอกสำเร็จ', `${payload.newIn.Serial_NOW} ↔ ${payload.newOut.Serial_NOW}`)
  }

  const handleFieldChange = (id, value) => setForm((p) => ({ ...p, [id]: value }))

  return (
    <div className="space-y-5">
      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('cyl_search')}
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="กระบอก"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              ImageUrl: getCylinderImageUrl,
              ImagePreview: getCylinderImageUrl,
              Comment: (row) => stripCylinderImageMeta(row.Comment),
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={load}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title={t('refresh')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('refresh')}</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchQrOpen(true)}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title="ดาวน์โหลด QR ทั้งหมด"
          >
            <QrCode size={13} />
            <span className="hidden lg:inline">QR ทั้งหมด</span>
          </button>

          {/* Swap + settings button */}
          {canEdit && (
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={openSwapWithLatestData}
                disabled={openingSwap || loading}
                className="btn text-xs px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800"
              >
                {openingSwap ? <RefreshCw size={13} className="animate-spin" /> : <ArrowLeftRight size={13} />}
                <span className="hidden sm:inline">{openingSwap ? 'โหลด...' : 'สลับกระบอก'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSwapCfgOpen(true)}
                title="ตั้งค่าสลับกระบอก"
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Settings2 size={13} />
              </button>
            </div>
          )}

          {canAdd && (
            <button
              type="button"
              onClick={openNew}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus size={15} />
              <span>{t('cyl_add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MACHINE REF SUMMARY CARDS ─────────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">สรุปอ้างอิงกระบอก</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
              {data.length} กระบอก
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMachineRefSummary((s) => !s)}
            className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1"
          >
            <span>{showMachineRefSummary ? 'ซ่อน' : 'แสดง'}</span>
            {showMachineRefSummary ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {showMachineRefSummary && (
          <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            {machineRefSummary.map((item) => {
              const isInUse = item.value.startsWith('In-use-')
              return (
                <div
                  key={item.value}
                  className="card p-3.5 flex items-center justify-between border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.value}</div>
                    <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
                      {item.count.toLocaleString()}
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    isInUse
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Disc size={18} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SUMMARY ACCORDION (TYPE / DIA / GAUGE) ─────────────── */}
      {summary.length > 0 && (
        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">สรุปจำนวนกระบอกตามกลุ่ม</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {data.length} กระบอก · {summary.length} กลุ่ม
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSummary((s) => !s)}
              className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1"
            >
              <span>{showSummary ? 'ซ่อน' : 'แสดง'}</span>
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
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCylType(g.Type)}</span>
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
                <th className="py-3 px-3 text-center w-28">จัดการ</th>
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
              {!loading && displayRows.map((c, i) => (
                <tr
                  key={c._id || c.id || i}
                  onClick={() => setDetailRec(c)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((col) => (
                    <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                      {col.render(c, i)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => openQR(c, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title="QR Code"
                      >
                        <QrCode size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขข้อมูลกระบอก"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(c._id || c.id)}
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
                    <Disc size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่ม Cylinder" เพื่อเริ่มต้นบันทึก</p>
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
        title={detailRec?.Serial_NOW}
        subtitle={detailRec?.Location ? `ตำแหน่ง: ${detailRec.Location}` : ''}
        icon={Disc}
        accentColor="#2563eb"
        badge={detailRec && <StatusBadge value={detailRec.Status_Now || 'STANDARD'} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        extraActions={detailRec && (
          <button
            type="button"
            onClick={() => {
              setQrRec(detailRec)
              setDetailRec(null)
            }}
            className="btn-outline text-xs flex items-center gap-1.5"
          >
            <QrCode size={13} />
            <span>QR Code</span>
          </button>
        )}
        groups={detailRec ? [
          {
            label: t('dr_general_info'),
            fields: [
              { label: t('cyl_th_serial_now'), value: detailRec.Serial_NOW, mono: true },
              { label: t('cyl_th_serial_old'), value: detailRec.Serial_OLD, mono: true },
              { label: t('cyl_th_standard'), value: detailRec.Standard },
              { label: t('cyl_th_loc'), value: detailRec.Location },
              { label: t('cyl_th_newmc'), value: detailRec.NewMC },
              { label: t('cyl_th_machine_ref'), value: detailRec.Machine_Ref },
              { label: 'ลิงก์รูปถ่าย', value: getCylinderImageUrl(detailRec), full: true },
            ].filter((f) => f.value),
          },
          {
            label: t('dr_specs'),
            fields: [
              { label: t('cyl_th_type'), value: detailRec.Type },
              { label: t('cyl_th_mfr'), value: detailRec.Manufacturer },
              { label: t('cyl_th_feeder'), value: detailRec.Feeder },
              { label: t('cyl_th_dia'), value: detailRec.Diameter ? `${detailRec.Diameter}"` : null },
              { label: t('cyl_th_gauge'), value: detailRec.Gauge ? `${detailRec.Gauge}G` : null },
              { label: t('cyl_th_needle'), value: detailRec.Needle },
            ].filter((f) => f.value),
          },
          {
            label: t('remark'),
            single: true,
            fields: [
              { label: t('remark'), value: stripCylinderImageMeta(detailRec.Comment), full: true },
            ].filter((f) => f.value),
          },
          {
            label: t('dr_updated'),
            fields: [
              {
                label: t('field_updated_at'),
                value: detailRec.updated_at
                  ? format(new Date(detailRec.updated_at), 'dd/MM/yyyy HH:mm')
                  : null,
              },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── Batch QR Modal ── */}
      <BatchQRModal
        open={batchQrOpen}
        onClose={() => setBatchQrOpen(false)}
        cylinders={data}
      />

      {/* ── QR Modal ── */}
      <CylinderQRModal
        open={!!qrRec}
        onClose={() => setQrRec(null)}
        cylinder={qrRec}
      />

      {/* ── Swap Cylinder Modals ── */}
      <SwapCylinderModal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        data={data}
        onSwap={handleSwap}
      />
      <SwapSettingsModal
        open={swapCfgOpen}
        onClose={() => setSwapCfgOpen(false)}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลกระบอก' : '➕ เพิ่มข้อมูลกระบอกใหม่'}
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
              <Disc size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและสถานะกระบอก</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField label={`${t('cyl_th_serial_now')} *`} id="Serial_NOW" form={form} onChange={handleFieldChange} placeholder="ซีเรียลปัจจุบัน" />
              <FormField label={t('status')} id="Status_Now" form={form} onChange={handleFieldChange} opts={CYL_STATUS} />
              <FormField label={t('cyl_th_item')} id="ITEM" form={form} onChange={handleFieldChange} type="number" placeholder="ลำดับ" />
              <FormField label={t('cyl_th_loc')} id="Location" form={form} onChange={handleFieldChange} placeholder="ตำแหน่ง" />
              <FormField label={t('cyl_th_standard')} id="Standard" form={form} onChange={handleFieldChange} placeholder="มาตรฐาน MC" />
              <FormField label={t('cyl_th_newmc')} id="NewMC" form={form} onChange={handleFieldChange} placeholder="เครื่องปัจจุบัน" />
              <FormField label={t('cyl_th_serial_old')} id="Serial_OLD" form={form} onChange={handleFieldChange} placeholder="ซีเรียลเดิม" />
              <FormField label={t('cyl_th_machine_ref')} id="Machine_Ref" form={form} onChange={handleFieldChange} opts={MACHINE_REF_OPTIONS} />
            </div>
          </div>

          {/* Section 2: Specs */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers size={14} className="text-blue-500" />
              <span>สเปกและคุณลักษณะกระบอก</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <FormField label={t('cyl_th_type')} id="Type" form={form} onChange={handleFieldChange} placeholder="ประเภท เช่น S หรือ D" />
              <FormField label={t('cyl_th_mfr')} id="Manufacturer" form={form} onChange={handleFieldChange} placeholder="ผู้ผลิต" />
              <FormField label={t('cyl_th_feeder')} id="Feeder" form={form} onChange={handleFieldChange} placeholder="ฟีดเดอร์" />
              <FormField label={t('cyl_th_dia')} id="Diameter" form={form} onChange={handleFieldChange} placeholder="เส้นผ่าศูนย์" />
              <FormField label={t('cyl_th_gauge')} id="Gauge" form={form} onChange={handleFieldChange} placeholder="เกจ" />
              <FormField label={t('cyl_th_needle')} id="Needle" form={form} onChange={handleFieldChange} placeholder="เข็ม" />
            </div>
          </div>

          {/* Section 3: Photo & Comments */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายกระบอก & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปกระบอกเข้า Google Drive</label>
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
                <FormField label="หรือวางลิงก์รูป (URL)" id="ImageUrl" form={form} onChange={handleFieldChange} placeholder="https://..." />
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
                <FormField
                  label={t('cyl_th_comment')}
                  id="Comment"
                  form={form}
                  onChange={(id, value) => setForm((p) => ({ ...p, [id]: stripCylinderImageMeta(value) }))}
                  placeholder="ข้อสังเกต หรือข้อมูลประกอบกระบอก"
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
    </div>
  )
}
