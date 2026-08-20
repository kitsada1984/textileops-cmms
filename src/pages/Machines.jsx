import { useState, useMemo, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Cpu } from 'lucide-react'
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

const MACHINE_IMAGE_FOLDER = 'แท็กเครื่องจักร'
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'machines'|column machines\.([^ ]+) does not exist/i

const EMPTY = {
  ITEM:'', Location:'', Mc:'', WaterCheck:'', Serial_OLD:'', Serial_NEW:'',
  Feeder:'', Manufacturer:'', Type:'', Diameter:'', Gauge:'', Needle:'', Oil:'',
  Model:'', Model_Inverter:'', Sinker:'',
  Tape1_No:'', Tape2_No:'', Tape3_No:'', Tape4_No:'',
  Dial_Front:'', Dial_Rear:'', Leg1:'', Leg2:'', Leg3:'', Leg4:'',
  Status:'RUNNING', Remark:'', ImageUrl:'',
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
  keys.forEach((key) => { delete clone[key] })
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
  ITEM:'mc_th_item', Location:'mc_th_loc', Mc:'mc_th_mc', WaterCheck:'mc_th_watercheck',
  Serial_OLD:'mc_th_serial_old', Serial_NEW:'mc_th_serial_new', Feeder:'mc_th_feeder',
  Manufacturer:'mc_th_mfr', Type:'mc_th_type', Diameter:'mc_th_dia', Gauge:'mc_th_gauge',
  Needle:'mc_th_needle', Oil:'mc_th_oil', Model:'mc_th_model', Model_Inverter:'mc_th_model_inv',
  Sinker:'mc_th_sinker', Tape1_No:'mc_th_tape1', Tape2_No:'mc_th_tape2',
  Tape3_No:'mc_th_tape3', Tape4_No:'mc_th_tape4', Dial_Front:'mc_th_dial_front',
  Dial_Rear:'mc_th_dial_rear', Leg1:'mc_th_leg1', Leg2:'mc_th_leg2',
  Leg3:'mc_th_leg3', Leg4:'mc_th_leg4', Remark:'mc_th_remark',
  updated_at:'mc_th_updated', Status:'status', ImageUrl:'URL', ImagePreview:'รูป',
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

const useCols = (t) => [
  { key: 'ITEM',          label: t('mc_th_item'),       render: (m, i) => m.ITEM || i+1 },
  { key: 'Location',      label: t('mc_th_loc'),        render: m => m.Location },
  { key: 'Mc',            label: t('mc_th_mc'),         render: m => <span className="font-semibold">{m.Mc}</span> },
  { key: 'WaterCheck',    label: t('mc_th_watercheck'), render: m => m.WaterCheck || '—' },
  { key: 'Serial_OLD',    label: t('mc_th_serial_old'), render: m => <span className="font-mono text-xs">{m.Serial_OLD || '—'}</span> },
  { key: 'Serial_NEW',    label: t('mc_th_serial_new'), render: m => <span className="font-mono text-xs">{m.Serial_NEW || '—'}</span> },
  { key: 'Feeder',        label: t('mc_th_feeder'),     render: m => m.Feeder || '—' },
  { key: 'Manufacturer',  label: t('mc_th_mfr'),        render: m => m.Manufacturer || '—' },
  { key: 'Type',          label: t('mc_th_type'),       render: m => m.Type || '—' },
  { key: 'Diameter',      label: t('mc_th_dia'),        render: m => m.Diameter || '—' },
  { key: 'Gauge',         label: t('mc_th_gauge'),      render: m => m.Gauge || '—' },
  { key: 'Needle',        label: t('mc_th_needle'),     render: m => m.Needle || '—' },
  { key: 'Oil',           label: t('mc_th_oil'),        render: m => m.Oil || '—' },
  { key: 'Model',         label: t('mc_th_model'),      render: m => m.Model || '—' },
  { key: 'Model_Inverter',label: t('mc_th_model_inv'),  render: m => m.Model_Inverter || '—' },
  { key: 'Sinker',        label: t('mc_th_sinker'),     render: m => m.Sinker || '—' },
  { key: 'Tape1_No',      label: t('mc_th_tape1'),      render: m => m.Tape1_No || '—' },
  { key: 'Tape2_No',      label: t('mc_th_tape2'),      render: m => m.Tape2_No || '—' },
  { key: 'Tape3_No',      label: t('mc_th_tape3'),      render: m => m.Tape3_No || '—' },
  { key: 'Tape4_No',      label: t('mc_th_tape4'),      render: m => m.Tape4_No || '—' },
  { key: 'Dial_Front',    label: t('mc_th_dial_front'), render: m => m.Dial_Front || '—' },
  { key: 'Dial_Rear',     label: t('mc_th_dial_rear'),  render: m => m.Dial_Rear || '—' },
  { key: 'Leg1',          label: t('mc_th_leg1'),       render: m => m.Leg1 || '—' },
  { key: 'Leg2',          label: t('mc_th_leg2'),       render: m => m.Leg2 || '—' },
  { key: 'Leg3',          label: t('mc_th_leg3'),       render: m => m.Leg3 || '—' },
  { key: 'Leg4',          label: t('mc_th_leg4'),       render: m => m.Leg4 || '—' },
  { key: 'ImageUrl',      label: 'URL',                  render: renderMachineImageUrl },
  { key: 'ImagePreview',  label: 'รูป',                  render: renderMachineImagePreview },
  { key: 'Remark',        label: t('mc_th_remark'),     render: m => <span className="max-w-[120px] truncate block">{stripImageUrlMeta(m.Remark) || '—'}</span> },
  { key: 'updated_at',    label: t('mc_th_updated'),    render: m => {
    const d = m.updated_at || m.LastUpdated
    return d ? <span className="text-xs" style={{color:'var(--text-400)'}}>{format(new Date(d),'dd/MM/yy HH:mm')}</span> : '—'
  }},
  { key: 'Status',        label: t('status'),           render: m => <StatusBadge value={m.Status} /> },
]

function renderMachineImageUrl(row) {
  const imageUrl = getMachineImageUrl(row)
  if (!imageUrl) return <span style={{color:'var(--text-400)'}}>—</span>
  return <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{imageUrl}</a>
}

function renderMachineImagePreview(row) {
  const imageUrl = getMachineImageUrl(row)
  if (!imageUrl) return <span style={{color:'var(--text-400)'}}>—</span>
  return <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
}

export default function Machines() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('machines')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(MachineAPI)
  const [search,     setSearch]    = useState('')
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [modal,      setModal]     = useState(false)
  const [form,       setForm]      = useState(EMPTY)
  const [saving,     setSaving]    = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const allCols  = useCols(t)
  const wbCols   = useWebBuilderMenu('/machines')
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
        const label = MC_FIELD_KEYS[wbc.field] ? t(MC_FIELD_KEYS[wbc.field]) : wbc.label
        if (wbc.field === 'ImageUrl') return { key: wbc.field, label, render: renderMachineImageUrl }
        if (wbc.field === 'ImagePreview') return { key: wbc.field, label, render: renderMachineImagePreview }
        if (wbc.type === 'select') {
          return { key: wbc.field, label, render: m => {
            const val = m[wbc.field]
            if (!val) return <span style={{color:'var(--text-400)'}}>—</span>
            const optColor = wbc.options?.find(o => o.value === val || o.label === val)?.color
            return <StatusBadge value={val} color={optColor} />
          }}
        }
        const known = allCols.find(c => c.key === wbc.field)
        if (known) return { ...known, label }
        return { key: wbc.field, label, render: m => m[wbc.field] ?? '—' }
      })
    : allCols

  const searched = data.filter(m =>
    [m.Mc, m.Location, m.Type, m.Manufacturer, m.Serial_NEW, m.Serial_OLD, getMachineImageUrl(m), stripImageUrlMeta(m.Remark)].some(v =>
      String(v||'').toLowerCase().includes(search.toLowerCase())
    )
  )

  const machineFilterOptions = useMemo(() => {
    return MACHINE_MULTI_FILTER_KEYS.reduce((acc, key) => {
      acc[key] = buildMachineFilterOptions(data, key)
      return acc
    }, {})
  }, [data])

  const FS_COLS = useMemo(() => {
    const src = normalizedWbCols?.length ? normalizedWbCols : [
      { field:'Location',    type:'text'   },
      { field:'Status',      type:'select' },
      { field:'Type',        type:'text'   },
      { field:'Manufacturer',type:'text'   },
      { field:'Diameter',    type:'text'   },
      { field:'Gauge',       type:'text'   },
      { field:'updated_at',  type:'date'   },
    ]
    return src.map(col => {
      const key   = col.field || col.key
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
      if (['date','datetime','datetime-local'].includes(col.type))
        return { key, label, sortable: true, filter: { type: 'date' } }
      if (col.type === 'number')
        return { key, label, sortable: true, filter: { type: 'number' } }
      if (['boolean','textarea'].includes(col.type))
        return { key, label, sortable: true, filter: { type: 'text' } }
      if (col.type === 'select') {
        const opts = col.options?.length ? col.options : (key === 'Status' ? MACHINE_STATUS : null)
        return { key, label, sortable: true, ...(opts ? { filter: { type: 'select', opts } } : {}) }
      }
      return { key, label, sortable: true, filter: { type: 'text' } }
    }).filter(Boolean)
  }, [machineFilterOptions, normalizedWbCols, t])

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

  const [detailRec, setDetailRec] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  const summary = useMemo(() => buildMachineSummary(data), [data])

  const openNew  = () => { setForm(EMPTY);   setModal(true) }
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
    if (!form.Mc || !form.Location) return toast.warning('กรุณากรอกข้อมูล', 'Mc และ Location จำเป็นต้องกรอก')
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      await saveWithImageFallback({
        ...form,
        Remark: appendMachineImageMeta(form.Remark, form.ImageUrl),
      })
      toast.success(isEdit ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', `เครื่อง ${form.Mc}`)
      setModal(false)
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('mc_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบข้อมูลสำเร็จ')
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('mc_search')} />
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
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        {canAdd && <button className="btn-primary" onClick={openNew}><Plus size={15}/> {t('mc_add')}</button>}
      </div>

      {summary.length > 0 && (
        <div className="card" style={{flexShrink: 0}}>
          <div style={{
            display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
            padding:'6px 12px',
            borderBottom: showSummary ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <span style={{fontSize:12, fontWeight:700, color:'var(--text-900)'}}>
              สรุปจำนวนเครื่อง
            </span>
            <span className="badge badge-blue" style={{fontSize:10, padding:'1px 8px'}}>
              {data.length} เครื่อง · {summary.length} กลุ่ม
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
                      {formatMcType(g.Type)}
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
            {!loading && displayRows.map((m, i) => (
              <tr key={m._id || m.id || i}
                onClick={() => setDetailRec(m)}
                style={{cursor:'pointer'}}
              >
                {cols.map(c => (
                  <td key={c.key} style={{padding:'8px 12px', color:'var(--text-700)'}}>
                    {c.render(m, i)}
                  </td>
                ))}
                <td style={{padding:'8px 12px'}} onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    {canEdit && <button className="btn-outline py-1 px-2" style={{fontSize:'11px'}} onClick={() => openEdit(m)}><Pencil size={11}/></button>}
                    {canDelete && <button className="btn-danger  py-1 px-2" style={{fontSize:'11px'}} onClick={() => del(m._id || m.id)}><Trash2 size={11}/></button>}
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
        title={detailRec?.Mc} subtitle={detailRec?.Location}
        icon={Cpu} accentColor="#6366f1"
        badge={detailRec && <StatusBadge value={detailRec.Status} />}
        canEdit={canEdit} canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          { label: t('dr_general_info'), fields: [
            { label: t('mc_th_mc'),          value: detailRec.Mc },
            { label: t('mc_th_loc'),         value: detailRec.Location },
            { label: t('mc_th_type'),        value: detailRec.Type },
            { label: t('mc_th_mfr'),         value: detailRec.Manufacturer },
            { label: t('mc_th_model'),       value: detailRec.Model },
            { label: t('mc_th_watercheck'),  value: detailRec.WaterCheck },
            { label: 'ลิงก์รูป',              value: getMachineImageUrl(detailRec), full: true },
          ]},
          { label: t('dr_specs'), fields: [
            { label: t('mc_th_dia'),         value: detailRec.Diameter },
            { label: t('mc_th_gauge'),       value: detailRec.Gauge },
            { label: t('mc_th_needle'),      value: detailRec.Needle },
            { label: t('mc_th_oil'),         value: detailRec.Oil },
            { label: t('mc_th_feeder'),      value: detailRec.Feeder },
            { label: t('mc_th_model_inv'),   value: detailRec.Model_Inverter },
            { label: t('mc_th_sinker'),      value: detailRec.Sinker },
          ]},
          { label: 'Serial Numbers', fields: [
            { label: t('mc_th_serial_old'),  value: detailRec.Serial_OLD, mono: true },
            { label: t('mc_th_serial_new'),  value: detailRec.Serial_NEW, mono: true },
          ]},
          { label: 'Tape & Dial & Leg', fields: [
            { label: t('mc_th_tape1'),       value: detailRec.Tape1_No },
            { label: t('mc_th_tape2'),       value: detailRec.Tape2_No },
            { label: t('mc_th_tape3'),       value: detailRec.Tape3_No },
            { label: t('mc_th_tape4'),       value: detailRec.Tape4_No },
            { label: t('mc_th_dial_front'),  value: detailRec.Dial_Front },
            { label: t('mc_th_dial_rear'),   value: detailRec.Dial_Rear },
            { label: t('mc_th_leg1'),        value: detailRec.Leg1 },
            { label: t('mc_th_leg2'),        value: detailRec.Leg2 },
            { label: t('mc_th_leg3'),        value: detailRec.Leg3 },
            { label: t('mc_th_leg4'),        value: detailRec.Leg4 },
          ]},
          { label: t('remark'), single: true, fields: [
            { label: t('remark'), value: stripImageUrlMeta(detailRec.Remark), full: true },
          ]},
          { label: t('dr_updated'), fields: [
            { label: t('field_updated_at'), value: (detailRec.updated_at || detailRec.LastUpdated)
                ? format(new Date(detailRec.updated_at || detailRec.LastUpdated), 'dd/MM/yyyy HH:mm')
                : null },
          ]},
        ] : []}
      />

      <Modal open={modal} onClose={() => setModal(false)}
        title={form._id ? t('mc_edit') : t('mc_add')} size="xl"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-3 gap-4">
          <F form={form} setForm={setForm} label={`${t('mc_th_mc')} (Mc) *`}      id="Mc" />
          <F form={form} setForm={setForm} label={`${t('mc_th_loc')} *`}           id="Location" />
          <F form={form} setForm={setForm} label={t('mc_th_item')}                 id="ITEM" type="number" />
          <F form={form} setForm={setForm} label={t('status')}                     id="Status" opts={MACHINE_STATUS} />
          <F form={form} setForm={setForm} label={t('mc_th_type')}                 id="Type" />
          <F form={form} setForm={setForm} label={t('mc_th_mfr')}                  id="Manufacturer" />
          <F form={form} setForm={setForm} label={t('mc_th_model')}                id="Model" />
          <F form={form} setForm={setForm} label={t('mc_th_dia')}                  id="Diameter" />
          <F form={form} setForm={setForm} label={t('mc_th_gauge')}                id="Gauge" />
          <F form={form} setForm={setForm} label={t('mc_th_needle')}               id="Needle" />
          <F form={form} setForm={setForm} label={t('mc_th_oil')}                  id="Oil" />
          <F form={form} setForm={setForm} label={t('mc_th_feeder')}               id="Feeder" />
          <F form={form} setForm={setForm} label={t('mc_th_model_inv')}            id="Model_Inverter" />
          <F form={form} setForm={setForm} label={t('mc_th_sinker')}               id="Sinker" />
          <F form={form} setForm={setForm} label={t('mc_th_watercheck')}           id="WaterCheck" />
          <F form={form} setForm={setForm} label={t('mc_th_serial_old')}           id="Serial_OLD" />
          <F form={form} setForm={setForm} label={t('mc_th_serial_new')}           id="Serial_NEW" />
          <F form={form} setForm={setForm} label={t('mc_th_tape1')}                id="Tape1_No" />
          <F form={form} setForm={setForm} label={t('mc_th_tape2')}                id="Tape2_No" />
          <F form={form} setForm={setForm} label={t('mc_th_tape3')}                id="Tape3_No" />
          <F form={form} setForm={setForm} label={t('mc_th_tape4')}                id="Tape4_No" />
          <F form={form} setForm={setForm} label={t('mc_th_dial_front')}           id="Dial_Front" />
          <F form={form} setForm={setForm} label={t('mc_th_dial_rear')}            id="Dial_Rear" />
          <F form={form} setForm={setForm} label={t('mc_th_leg1')}                 id="Leg1" />
          <F form={form} setForm={setForm} label={t('mc_th_leg2')}                 id="Leg2" />
          <F form={form} setForm={setForm} label={t('mc_th_leg3')}                 id="Leg3" />
          <F form={form} setForm={setForm} label={t('mc_th_leg4')}                 id="Leg4" />
          <div className="col-span-3">
            <F form={form} setForm={setForm} label="ลิงก์รูป (Google Drive)" id="ImageUrl" useBuilder={false} />
            <div style={{ marginTop: 10 }}>
              <label className="label">อัปโหลดรูปแท็กเครื่องจักร</label>
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
          <div className="col-span-3">
            <F
              form={form}
              setForm={setForm}
              label={t('mc_th_remark')}
              id="Remark"
              onChange={value => setForm(p => ({ ...p, Remark: appendMachineImageMeta(value, p.ImageUrl) }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
