import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ArrowLeftRight, Settings2, Disc, QrCode } from 'lucide-react'
import useWebBuilderMenu, { useWebBuilderColumn } from '../hooks/useWebBuilderMenu'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { CylinderAPI, CYL_STATUS } from '../api/entities'
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
  ITEM:'', Location:'', Standard:'', NewMC:'', Serial_OLD:'', Serial_NOW:'',
  Status_Now:'STANDARD', Feeder:'', Manufacturer:'', Type:'', Diameter:'',
  Gauge:'', Needle:'', Machine_Ref:'', Comment:'', ImageUrl:''
}

function omitKeys(item, keys = []) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
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
  ITEM:'cyl_th_item', Location:'cyl_th_loc', Standard:'cyl_th_standard',
  NewMC:'cyl_th_newmc', Serial_OLD:'cyl_th_serial_old', Serial_NOW:'cyl_th_serial_now',
  Status_Now:'cyl_th_status_now', Feeder:'cyl_th_feeder', Manufacturer:'cyl_th_mfr',
  Type:'cyl_th_type', Diameter:'cyl_th_dia', Gauge:'cyl_th_gauge',
  Needle:'cyl_th_needle', Machine_Ref:'cyl_th_machine_ref', Comment:'cyl_th_comment',
  updated_at:'mc_th_updated', ImageUrl:'URL', ImagePreview:'รูป',
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

function renderCylinderImageUrl(row) {
  const imageUrl = getCylinderImageUrl(row)
  if (!imageUrl) return <span style={{color:'var(--text-400)'}}>—</span>
  return <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{imageUrl}</a>
}

function renderCylinderImagePreview(row) {
  const imageUrl = getCylinderImageUrl(row)
  if (!imageUrl) return <span style={{color:'var(--text-400)'}}>—</span>
  return <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
}

const useCols = (t) => [
  { key: 'ITEM',        label: t('cyl_th_item'),       render: (c, i) => c.ITEM || i+1 },
  { key: 'Location',    label: t('cyl_th_loc'),        render: c => c.Location },
  { key: 'Standard',    label: t('cyl_th_standard'),   render: c => <span className="font-semibold">{c.Standard || '—'}</span> },
  { key: 'NewMC',       label: t('cyl_th_newmc'),      render: c => c.NewMC || '—' },
  { key: 'Serial_OLD',  label: t('cyl_th_serial_old'), render: c => <span className="font-mono text-xs">{c.Serial_OLD || '—'}</span> },
  { key: 'Serial_NOW',  label: t('cyl_th_serial_now'), render: c => <span className="font-mono text-xs font-semibold">{c.Serial_NOW || '—'}</span> },
  { key: 'Status_Now',  label: t('cyl_th_status_now'), render: c => {
    const display = (c.Serial_OLD && c.Serial_NOW && c.Serial_OLD === c.Serial_NOW)
      ? 'STANDARD'
      : (c.Serial_NOW || '—')
    const clean = ['STANDARD','SCRAP','REPAIR','RESERVE'].includes(display)
    return clean
      ? <StatusBadge value={display} />
      : <span className="font-mono text-xs" style={{color:'var(--text-500)'}}>{display}</span>
  }},
  { key: 'Feeder',      label: t('cyl_th_feeder'),     render: c => c.Feeder || '—' },
  { key: 'Manufacturer',label: t('cyl_th_mfr'),        render: c => c.Manufacturer || '—' },
  { key: 'Type',        label: t('cyl_th_type'),       render: c => c.Type || '—' },
  { key: 'Diameter',    label: t('cyl_th_dia'),        render: c => c.Diameter || '—' },
  { key: 'Gauge',       label: t('cyl_th_gauge'),      render: c => c.Gauge || '—' },
  { key: 'Needle',      label: t('cyl_th_needle'),     render: c => c.Needle || '—' },
  { key: 'Machine_Ref', label: t('cyl_th_machine_ref'),render: c => <span className="max-w-[100px] truncate block">{c.Machine_Ref || '—'}</span> },
  { key: 'ImageUrl',    label: 'URL',                  render: renderCylinderImageUrl },
  { key: 'ImagePreview',label: 'รูป',                  render: renderCylinderImagePreview },
  { key: 'Comment',     label: t('cyl_th_comment'),    render: c => <span className="max-w-[120px] truncate block">{stripCylinderImageMeta(c.Comment) || '—'}</span> },
  { key: 'updated_at',  label: t('mc_th_updated'),     render: c => {
    const d = c.updated_at
    return d ? <span className="text-xs" style={{color:'var(--text-400)'}}>{format(new Date(d),'dd/MM/yy HH:mm')}</span> : '—'
  }},
]


function normalizeOptions(opts = []) {
  return opts.map(o => (
    typeof o === 'string'
      ? { label: o, value: o }
      : { label: o.label ?? o.value ?? o.id, value: o.value ?? o.label ?? o.id }
  )).filter(o => o.value !== undefined && o.value !== null)
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
  const currentOptionExists = effectiveOptions.some(o => String(o.value) === String(val))
  const handleChange = e => onChange(id, e.target.value)

  const handlePaste = e => {
    const pasted = e.clipboardData?.getData('text/plain') ?? ''
    if (!pasted) return
    e.preventDefault()
    const el    = e.target
    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const next  = el.value.slice(0, start) + pasted + el.value.slice(end)
    onChange(id, next)
    requestAnimationFrame(() => {
      el.setSelectionRange(start + pasted.length, start + pasted.length)
    })
  }

  return (
    <div>
      <label className="label">{effectiveLabel}</label>
      {effectiveType === 'select'
        ? <select className="select" value={val} onChange={handleChange}>
            <option value="">—</option>
            {val !== '' && !currentOptionExists && <option value={val}>{val}</option>}
            {effectiveOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : effectiveType === 'textarea'
          ? <textarea
              className="input"
              rows={effectiveRows}
              value={val}
              onChange={handleChange}
              onPaste={handlePaste}
            />
          : effectiveType === 'boolean'
            ? <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-700)' }}>
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={e => onChange(id, e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span>{val ? 'Yes' : 'No'}</span>
              </label>
            : <input
                className="input"
                type={effectiveType}
                value={val}
                onChange={e => onChange(id, effectiveType === 'number'
                  ? (e.target.value === '' ? '' : +e.target.value)
                  : e.target.value
                )}
                onPaste={effectiveType !== 'number' ? handlePaste : undefined}
              />
      }
    </div>
  )
}

export default function Cylinders() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('cylinders')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(CylinderAPI)
  const [search,       setSearch]      = useState('')
  const [filterSort,   setFilterSort]  = useState(INIT_FS)
  const [modal,        setModal]       = useState(false)
  const [form,         setForm]        = useState(EMPTY)
  const [saving,       setSaving]      = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [swapOpen,     setSwapOpen]    = useState(false)
  const [swapCfgOpen,  setSwapCfgOpen] = useState(false)
  const [openingSwap,  setOpeningSwap] = useState(false)

  const allCols = useCols(t)
  const wbCols  = useWebBuilderMenu('/cylinders')
  const normalizedWbCols = useMemo(() => wbCols?.length
    ? [
        ...wbCols,
        ...[
          { field:'ImageUrl', label:'URL', type:'text', width:'220px' },
          { field:'ImagePreview', label:'รูป', type:'text', width:'110px' },
        ].filter((required) => !wbCols.some((col) => col.field === required.field)),
      ]
    : null, [wbCols])
  const cols = normalizedWbCols?.length
    ? normalizedWbCols.map(wbc => {
        const label = CYL_FIELD_KEYS[wbc.field] ? t(CYL_FIELD_KEYS[wbc.field]) : wbc.label
        if (wbc.field === 'ImageUrl') return { key: wbc.field, label, render: renderCylinderImageUrl }
        if (wbc.field === 'ImagePreview') return { key: wbc.field, label, render: renderCylinderImagePreview }
        if (wbc.type === 'select') {
          return { key: wbc.field, label, render: c => {
            const val = c[wbc.field]
            if (!val) return <span style={{color:'var(--text-400)'}}>—</span>
            const optColor = wbc.options?.find(o => o.value === val || o.label === val)?.color
            return <StatusBadge value={val} color={optColor} />
          }}
        }
        const known = allCols.find(c => c.key === wbc.field)
        if (known) return { ...known, label }
        return { key: wbc.field, label, render: c => c[wbc.field] ?? '—' }
      })
    : allCols

  const searched = data.filter(c =>
    [c.Serial_NOW, c.Serial_OLD, c.NewMC, c.Location, c.Standard, c.Type, c.Manufacturer, getCylinderImageUrl(c), stripCylinderImageMeta(c.Comment)].some(v =>
      String(v||'').toLowerCase().includes(search.toLowerCase())
    )
  )

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
      { field:'Location',    type:'text'   },
      { field:'Machine_Ref', type:'select', options: MACHINE_REF_OPTIONS },
      { field:'Type',        type:'text'   },
      { field:'Manufacturer',type:'text'   },
      { field:'Diameter',    type:'text'   },
      { field:'Gauge',       type:'text'   },
      { field:'updated_at',  type:'date'   },
    ]
    return src.map(col => {
      const key   = col.field || col.key
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
      if (['date','datetime','datetime-local'].includes(col.type))
        return { key, label, sortable: true, filter: { type: 'date' } }
      if (col.type === 'number')
        return { key, label, sortable: true, filter: { type: 'number' } }
      if (['boolean','textarea'].includes(col.type))
        return { key, label, sortable: true, filter: { type: 'text' } }
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

  const displayRows = useMemo(() => applyFilterSort(searched, FS_COLS, filterSort), [searched, FS_COLS, filterSort])

  const [detailRec,  setDetailRec]  = useState(null)
  const [qrRec,      setQrRec]      = useState(null)
  const [batchQrOpen,setBatchQrOpen] = useState(false)
  const [showMachineRefSummary, setShowMachineRefSummary] = useState(true)
  const [showSummary, setShowSummary] = useState(false)

  const summary = useMemo(() => buildCylinderSummary(data), [data])
  const machineRefSummary = useMemo(() => buildMachineRefSummary(data), [data])

  const openNew  = () => { setForm(EMPTY);   setModal(true) }
  const openEdit = (c) => {
    setForm({ ...c, ImageUrl: getCylinderImageUrl(c), Comment: stripCylinderImageMeta(c.Comment) })
    setModal(true)
    setDetailRec(null)
  }
  const openQR   = (c, e) => { e?.stopPropagation(); setQrRec(c) }

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
    if (!form.Serial_NOW) return toast.warning('กรุณากรอกข้อมูล', t('cyl_req'))
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
    await load()
    toast.success('สลับกระบอกสำเร็จ', `${payload.newIn.Serial_NOW} ↔ ${payload.newOut.Serial_NOW}`)
  }

  const handleFieldChange = (id, value) => setForm(p => ({ ...p, [id]: value }))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="cylinder-toolbar" style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('cyl_search')} />

        {/* Right group — pushed to far right, never wraps */}
        <div className="cylinder-toolbar-actions" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
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
            className="btn-outline"
          />
          <button className="btn-outline" onClick={load} title={t('refresh')}
            style={{ padding:'7px 10px', gap:6 }}>
            <RefreshCw size={13}/>
            <span className="hidden md:inline" style={{fontSize:12}}>{t('refresh')}</span>
          </button>

          <button className="btn-outline" onClick={() => setBatchQrOpen(true)} title="ดาวน์โหลด QR ทั้งหมด"
            style={{ padding:'7px 10px', gap:6 }}>
            <QrCode size={13}/>
            <span className="hidden lg:inline" style={{fontSize:12}}>QR ทั้งหมด</span>
          </button>

          {/* Swap + settings joined button */}
          {canEdit && <div style={{
            display:'flex', alignItems:'center', borderRadius:12, overflow:'hidden',
            border:'1px solid var(--border)',
            boxShadow:'0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>
            <button onClick={openSwapWithLatestData} disabled={openingSwap || loading} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 12px', fontSize:12, fontWeight:600, cursor:(openingSwap || loading) ? 'wait' : 'pointer',
              background:'var(--bg-card)', color:'var(--text-700)',
              border:'none', borderRight:'1px solid var(--border)',
              transition:'all 150ms', whiteSpace:'nowrap',
              opacity:(openingSwap || loading) ? 0.65 : 1,
            }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-thead)'; e.currentTarget.style.color='var(--text-900)' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--bg-card)';  e.currentTarget.style.color='var(--text-700)' }}
            >
              {openingSwap ? <RefreshCw size={13} className="animate-spin"/> : <ArrowLeftRight size={13}/>}
              <span className="hidden sm:inline">{openingSwap ? 'โหลดข้อมูลล่าสุด...' : 'สลับกระบอก'}</span>
            </button>
            <button onClick={() => setSwapCfgOpen(true)} title="ตั้งค่าสลับกระบอก" style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'7px 9px', cursor:'pointer',
              background:'var(--bg-card)', color:'var(--text-400)',
              border:'none', transition:'all 150ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-thead)'; e.currentTarget.style.color='var(--text-600)' }}
              onMouseLeave={e => { e.currentTarget.style.background='var(--bg-card)';  e.currentTarget.style.color='var(--text-400)' }}
            >
              <Settings2 size={12}/>
            </button>
          </div>}

          {canAdd && <button className="btn-primary" onClick={openNew}
            style={{ padding:'7px 14px', gap:6, fontSize:12 }}>
            <Plus size={13}/>
            <span className="hidden sm:inline">{t('cyl_add')}</span>
            <span className="sm:hidden">+</span>
          </button>}
        </div>
      </div>

      <div className="cylinder-ref-panel">
        <div className="cylinder-ref-header">
          <span>สรุปอ้างอิงกระบอก</span>
          <span className="badge badge-blue">{data.length} กระบอก</span>
          <button onClick={() => setShowMachineRefSummary(s => !s)}>
            {showMachineRefSummary ? 'ซ่อน' : 'แสดง'}
          </button>
        </div>
        {showMachineRefSummary && (
          <div className="cylinder-ref-grid">
            {machineRefSummary.map((item) => {
              const isInUse = item.value.startsWith('In-use-')
              const color = isInUse ? '#2563eb' : '#059669'
              const bg = isInUse ? 'rgba(37,99,235,.12)' : 'rgba(5,150,105,.12)'
              return (
                <div key={item.value} className="cylinder-ref-card">
                  <div>
                    <div className="cylinder-ref-label">{item.value}</div>
                    <div className="cylinder-ref-count">{item.count.toLocaleString()}</div>
                  </div>
                  <div className="cylinder-ref-icon" style={{ color, background:bg }}>
                    <Disc size={18} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {summary.length > 0 && (
        <div className="card" style={{flexShrink: 0}}>
          <div style={{
            display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
            padding:'6px 12px',
            borderBottom: showSummary ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span style={{fontSize:12, fontWeight:700, color:'var(--text-900)'}}>
              สรุปจำนวนกระบอก
            </span>
            <span className="badge badge-blue" style={{fontSize:10, padding:'1px 8px'}}>
              {data.length} กระบอก · {summary.length} กลุ่ม
            </span>
            <button onClick={() => setShowSummary(s => !s)} style={{
              marginLeft:'auto', fontSize:11, padding:'2px 10px',
              border:'1px solid var(--border)', borderRadius:6,
              background:'transparent', color:'var(--text-500)', cursor:'pointer',
            }}>
              {showSummary ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
          {showSummary && (
            <div style={{
              padding:'8px 10px',
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))',
              gap:5,
            }}>
              {summary.map(g => (
                <span key={`${g.Type}|${g.Diameter}|${g.Gauge}`} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  gap:6, padding:'2px 4px 2px 9px', borderRadius:999,
                  fontSize:11,
                  background:'var(--bg-page)', border:'1px solid var(--border)',
                }}>
                  <span style={{display:'inline-flex', alignItems:'center', gap:6, minWidth:0, overflow:'hidden'}}>
                    <span style={{fontWeight:700, color:'var(--text-900)'}}>
                      {formatCylType(g.Type)}
                    </span>
                    <span style={{color:'var(--text-500)', fontFamily:'monospace'}}>
                      {g.Diameter || '—'}"·{g.Gauge || '—'}G
                    </span>
                  </span>
                  <span style={{
                    fontWeight:800, color:'#4f46e5',
                    background:'rgba(99,102,241,0.12)', padding:'1px 7px', borderRadius:999,
                    minWidth:22, textAlign:'center', flexShrink:0,
                  }}>{g.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Table (all devices, horizontal scroll on mobile) ── */}
      <div className="table-wrap">
        <table style={{fontSize:'12px'}}>
          <thead>
            <tr>
              {cols.map(c => <th key={c.key} style={{padding:'10px 12px'}}>{c.label}</th>)}
              <th style={{padding:'10px 12px'}}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={cols.length + 1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>
            )}
            {!loading && displayRows.map((c, i) => (
              <tr key={c._id || c.id || i}
                onClick={() => setDetailRec(c)}
                style={{cursor:'pointer'}}
              >
                {cols.map(col => (
                  <td key={col.key} style={{padding:'8px 12px', color:'var(--text-700)'}}>
                    {col.render(c, i)}
                  </td>
                ))}
                <td style={{padding:'8px 12px'}} onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    <button className="btn-outline py-1 px-2" style={{fontSize:'11px'}} onClick={(e) => openQR(c, e)} title="QR Code"><QrCode size={11}/></button>
                    {canEdit && <button className="btn-outline py-1 px-2" style={{fontSize:'11px'}} onClick={() => openEdit(c)}><Pencil size={11}/></button>}
                    {canDelete && <button className="btn-danger  py-1 px-2" style={{fontSize:'11px'}} onClick={() => del(c._id || c.id)}><Trash2 size={11}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !displayRows.length && (
              <tr><td colSpan={cols.length + 1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={!!detailRec} onClose={() => setDetailRec(null)}
        title={detailRec?.Serial_NOW} subtitle={detailRec?.Location}
        icon={Disc} accentColor="#8b5cf6" iconColor="#a78bfa"
        badge={detailRec && <StatusBadge value={detailRec.Status_Now || 'STANDARD'} />}
        canEdit={canEdit} canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        extraActions={detailRec && (
          <button onClick={() => { setQrRec(detailRec); setDetailRec(null) }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: 'var(--bg-page)', color: 'var(--text-700)',
            border: '1px solid var(--border)', transition: 'all 150ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-thead)'; e.currentTarget.style.color = 'var(--text-900)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-700)' }}
          >
            <QrCode size={12} /> QR
          </button>
        )}
        groups={detailRec ? [
          { label: t('dr_general_info'), fields: [
            { label: t('cyl_th_serial_now'),  value: detailRec.Serial_NOW, mono: true },
            { label: t('cyl_th_serial_old'),  value: detailRec.Serial_OLD, mono: true },
            { label: t('cyl_th_standard'),    value: detailRec.Standard },
            { label: t('cyl_th_loc'),         value: detailRec.Location },
            { label: t('cyl_th_newmc'),       value: detailRec.NewMC },
            { label: t('cyl_th_machine_ref'), value: detailRec.Machine_Ref },
            { label: 'ลิงก์รูป',              value: getCylinderImageUrl(detailRec), full: true },
          ]},
          { label: t('dr_specs'), fields: [
            { label: t('cyl_th_type'),    value: detailRec.Type },
            { label: t('cyl_th_mfr'),     value: detailRec.Manufacturer },
            { label: t('cyl_th_feeder'),  value: detailRec.Feeder },
            { label: t('cyl_th_dia'),     value: detailRec.Diameter },
            { label: t('cyl_th_gauge'),   value: detailRec.Gauge },
            { label: t('cyl_th_needle'),  value: detailRec.Needle },
          ]},
          { label: t('remark'), single: true, fields: [
            { label: t('remark'), value: stripCylinderImageMeta(detailRec.Comment), full: true },
          ]},
          { label: t('dr_updated'), fields: [
            { label: t('field_updated_at'), value: detailRec.updated_at
                ? format(new Date(detailRec.updated_at), 'dd/MM/yyyy HH:mm') : null },
          ]},
        ] : []}
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

      {/* ── Edit/Add Modal ── */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={form._id ? t('cyl_edit') : t('cyl_add')} size="xl"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label={`${t('cyl_th_serial_now')} *`} id="Serial_NOW"   form={form} onChange={handleFieldChange} />
          <FormField label={t('status')}                    id="Status_Now"   form={form} onChange={handleFieldChange} opts={CYL_STATUS} />
          <FormField label={t('cyl_th_item')}               id="ITEM"         form={form} onChange={handleFieldChange} type="number" />
          <FormField label={t('cyl_th_loc')}                id="Location"     form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_standard')}           id="Standard"     form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_newmc')}              id="NewMC"        form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_serial_old')}         id="Serial_OLD"   form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_machine_ref')}        id="Machine_Ref"  form={form} onChange={handleFieldChange} opts={MACHINE_REF_OPTIONS} />
          <FormField label={t('cyl_th_type')}               id="Type"         form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_mfr')}                id="Manufacturer" form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_feeder')}             id="Feeder"       form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_dia')}                id="Diameter"     form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_gauge')}              id="Gauge"        form={form} onChange={handleFieldChange} />
          <FormField label={t('cyl_th_needle')}             id="Needle"       form={form} onChange={handleFieldChange} />
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <FormField label="ลิงก์รูป (Google Drive)" id="ImageUrl" form={form} onChange={handleFieldChange} />
            <div style={{ marginTop: 10 }}>
              <label className="label">อัปโหลดรูปกระบอก</label>
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
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <FormField
              label={t('cyl_th_comment')}
              id="Comment"
              form={form}
              onChange={(id, value) => setForm(p => ({ ...p, [id]: stripCylinderImageMeta(value) }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
