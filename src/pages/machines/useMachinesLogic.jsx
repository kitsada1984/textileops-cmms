// src/pages/machines/useMachinesLogic.js
// Headless Logic Hook for Machines Feature (ADR-0002)
// Handles 100% of data loading, filters, permissions, mutation, and PDF generation

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import useWebBuilderMenu from '../../hooks/useWebBuilderMenu'
import useEntity from '../../hooks/useEntity'
import { MachineAPI, MACHINE_STATUS } from '../../api/entities'
import { useT } from '../../contexts/LanguageContext'
import usePagePerms from '../../hooks/usePagePerms'
import { useToast } from '../../components/ui/Toast'
import { INIT_FS } from '../../components/ui/FilterSortPanel'
import { applyFilterSort } from '../../utils/filterSort'
import { uploadMedia } from '../../modules/media'
import StatusBadge from '../../components/ui/StatusBadge'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { ExternalLink } from 'lucide-react'

const MACHINE_IMAGE_FOLDER = 'แท็กเครื่องจักร'

export const EMPTY_MACHINE = {
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
  Tape5_No: '',
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

const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const TAPE5_NOTE_PREFIX = 'Tape5:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'machines'|column machines\.([^ ]+) does not exist/i

export function extractImageUrl(note = '') {
  const match = String(note || '').match(/ImageUrl:\s*(https?:\/\/[^\s\r\n]+)/i)
  return match?.[1]?.trim() || ''
}

export function extractTape5(note = '') {
  const match = String(note || '').match(/Tape5:\s*([^\r\n]+)/i)
  return match?.[1]?.trim() || ''
}

export function stripMachineMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      return !t.match(/^ImageUrl:\s*/i) && !t.match(/^Tape5:\s*/i)
    })
    .join('\n')
    .trim()
}

export function getMachineImageUrl(row = {}) {
  return row.ImageUrl || extractImageUrl(row.Remark) || ''
}

export function getMachineTape5(row = {}) {
  return row.Tape5_No || row.tape5_no || extractTape5(row.Remark) || ''
}

export function appendMachineMeta(remark = '', { imageUrl = '', tape5 = '' } = {}) {
  const cleanRemark = stripMachineMeta(remark)
  const metaLines = []
  if (imageUrl) metaLines.push(`${IMAGE_NOTE_PREFIX} ${imageUrl}`)
  if (tape5) metaLines.push(`${TAPE5_NOTE_PREFIX} ${tape5}`)
  return [cleanRemark, ...metaLines].filter(Boolean).join('\n')
}

export function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

export function getMissingMachineColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

export const TYPE_LABEL = { S: 'Single', D: 'Double', 'Jac.': 'Jacquard' }
export const formatMcType = (v) => TYPE_LABEL[v] || v || '—'

export function buildMachineSummary(rows = []) {
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

export const MC_FIELD_KEYS = {
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
  Tape5_No: 'mc_th_tape5',
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

export default function useMachinesLogic() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('machines')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(MachineAPI)
  const [search, setSearch] = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_MACHINE)
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
        <ImageThumbnail
          url={imageUrl}
          alt={`เครื่องจักร ${row.Mc}`}
          onClick={() => setPreviewImageModal({ url: imageUrl, title: `เครื่องจักร ${row.Mc}` })}
        />
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
    { key: 'Tape1_No', label: t('mc_th_tape1'), render: (m) => <span className="font-mono">{m.Tape1_No || '—'}</span> },
    { key: 'Tape2_No', label: t('mc_th_tape2'), render: (m) => <span className="font-mono">{m.Tape2_No || '—'}</span> },
    { key: 'Tape3_No', label: t('mc_th_tape3'), render: (m) => <span className="font-mono">{m.Tape3_No || '—'}</span> },
    { key: 'Tape4_No', label: t('mc_th_tape4'), render: (m) => <span className="font-mono">{m.Tape4_No || '—'}</span> },
    { key: 'Tape5_No', label: t('mc_th_tape5'), render: (m) => <span className="font-mono">{getMachineTape5(m) || '—'}</span> },
    { key: 'Dial_Front', label: t('mc_th_dial_front'), render: (m) => <span className="font-mono">{m.Dial_Front || '—'}</span> },
    { key: 'Dial_Rear', label: t('mc_th_dial_rear'), render: (m) => <span className="font-mono">{m.Dial_Rear || '—'}</span> },
    { key: 'Leg1', label: t('mc_th_leg1'), render: (m) => <span className="font-mono">{m.Leg1 || '—'}</span> },
    { key: 'Leg2', label: t('mc_th_leg2'), render: (m) => <span className="font-mono">{m.Leg2 || '—'}</span> },
    { key: 'Leg3', label: t('mc_th_leg3'), render: (m) => <span className="font-mono">{m.Leg3 || '—'}</span> },
    { key: 'Leg4', label: t('mc_th_leg4'), render: (m) => <span className="font-mono">{m.Leg4 || '—'}</span> },
    { key: 'ImageUrl', label: 'URL', render: renderMachineImageUrl },
    { key: 'ImagePreview', label: 'รูป', render: renderMachineImagePreview },
    { key: 'Remark', label: t('mc_th_remark'), render: (m) => <span className="max-w-[130px] truncate block text-slate-500">{stripMachineMeta(m.Remark) || '—'}</span> },
    { key: 'updated_at', label: t('mc_th_updated'), render: (m) => {
      const d = m.updated_at || m.LastUpdated
      if (!d) return <span className="text-slate-400">—</span>
      try {
        const dt = new Date(d)
        return isNaN(dt.getTime()) ? <span className="text-slate-400">—</span> : <span className="font-mono text-[11px] text-slate-400">{format(dt, 'dd/MM/yy HH:mm')}</span>
      } catch {
        return <span className="text-slate-400">—</span>
      }
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
        if (wbc.field === 'Tape5_No') return { key: wbc.field, label, render: (m) => <span className="font-mono">{getMachineTape5(m) || '—'}</span> }
        if (wbc.field === 'Remark') return { key: wbc.field, label, render: (m) => <span className="max-w-[130px] truncate block text-slate-500">{stripMachineMeta(m.Remark) || '—'}</span> }
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
      [m.Mc, m.Location, m.Type, m.Manufacturer, m.Model, m.Serial_NEW, m.Serial_OLD, getMachineTape5(m), getMachineImageUrl(m), stripMachineMeta(m.Remark)].some((v) =>
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
    const maxItem = data.reduce((max, m) => {
      const n = Number(m.ITEM)
      return Number.isFinite(n) && n > max ? n : max
    }, 0)
    setForm({
      ...EMPTY_MACHINE,
      ITEM: maxItem > 0 ? maxItem + 1 : '',
    })
    setModal(true)
  }

  const openEdit = (m) => {
    setForm({
      ...m,
      Tape5_No: getMachineTape5(m),
      ImageUrl: getMachineImageUrl(m),
      Remark: stripMachineMeta(m.Remark),
    })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadMedia(file, { folderName: MACHINE_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
      }))
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${MACHINE_IMAGE_FOLDER}`)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveMachineWithColumnFallback = async (payload) => {
    let nextPayload = { ...payload }
    const removedColumns = []
    while (true) {
      try {
        const saved = await save(nextPayload)
        return { saved, removedColumns }
      } catch (error) {
        const missingCol = getMissingMachineColumn(error)
        if (missingCol && !removedColumns.includes(missingCol)) {
          removedColumns.push(missingCol)
          nextPayload = omitKeys(nextPayload, [missingCol])
          continue
        }
        throw error
      }
    }
  }

  const submit = async () => {
    const mc = String(form.Mc || '').trim()
    const loc = String(form.Location || '').trim()
    if (!mc || !loc) {
      toast.warning('กรุณากรอกข้อมูล', 'Mc และ Location จำเป็นต้องกรอก')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      const itemNum = form.ITEM !== '' && form.ITEM !== null && form.ITEM !== undefined ? Number(form.ITEM) : null
      const remarkWithMeta = appendMachineMeta(form.Remark, { imageUrl: form.ImageUrl, tape5: form.Tape5_No })
      let payload = {
        ...form,
        Mc: mc,
        Location: loc,
        ITEM: Number.isFinite(itemNum) ? itemNum : null,
        Remark: remarkWithMeta,
      }
      payload = omitKeys(payload, ['ImageUrl', 'Tape5_No', 'ImagePreview'])
      await saveMachineWithColumnFallback(payload)
      toast.success(isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', `เครื่อง ${mc}`)
      setModal(false)
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    } finally {
      setSaving(false)
    }
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

  return {
    t,
    canAdd,
    canEdit,
    canDelete,
    data,
    loading,
    load,
    stats,
    summary,
    showSummary,
    setShowSummary,
    formatMcType,
    search,
    setSearch,
    filterSort,
    setFilterSort,
    FS_COLS,
    displayRows,
    cols,
    openNew,
    openEdit,
    del,
    submit,
    saving,
    form,
    setForm,
    modal,
    setModal,
    uploadingImage,
    onPickImageFile,
    detailRec,
    setDetailRec,
    pdfItem,
    setPdfItem,
    previewImageModal,
    setPreviewImageModal,
    getMachineImageUrl,
    getMachineTape5,
    stripMachineMeta,
  }
}
