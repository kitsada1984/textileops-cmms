import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Package } from 'lucide-react'
import useEntity from '../hooks/useEntity'
import { SparePartAPI, PART_STATUS } from '../api/entities'
import useWebBuilderMenu, { useFieldOptions } from '../hooks/useWebBuilderMenu'
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
import { generatePartCode, getPartStockStatus } from '../utils/inventory'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import {
  appendSparePartImageMeta,
  buildSparePartImagePayload,
  getSparePartImageUrl,
  preserveRemarkWithSparePartImageMeta,
  stripSparePartImageMeta,
} from '../utils/sparePartImage'

const SP_FIELD_KEYS = {
  Part_Code:'sp_th_code', Part_Name_EN:'sp_th_name_en',
  Category:'sp_th_cat', Stock_Qty:'sp_th_stock', Min_Qty:'sp_th_min',
  Unit_Price:'sp_th_price', Status:'status', Remark:'remark',
  Unit:'field_unit', Supplier:'field_supplier', Location_Store:'field_warehouse',
}

const MISSING_SPAREPART_COLUMN_RE = /Could not find the '([^']+)' column of 'spareparts'|column spareparts\.([^ ]+) does not exist/i
const SPARE_PART_IMAGE_FOLDER = 'รูปอะไหล่'
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']
const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']
const SP_FILTER_KEYS = ['Category', 'Status']

function optionRawValue(option) {
  if (option && typeof option === 'object') return option.value ?? option.id ?? option.label ?? ''
  return option ?? ''
}

function optionRawLabel(option) {
  if (option && typeof option === 'object') return option.label ?? option.value ?? option.id ?? ''
  return option ?? ''
}

function buildSparePartFilterOptions(rows = [], key, fallbackOptions = []) {
  const seen = new Map()
  fallbackOptions.forEach((option) => {
    const value = String(optionRawValue(option) ?? '').trim()
    if (!value || seen.has(value)) return
    seen.set(value, { value, label: optionRawLabel(option) || value })
  })
  rows.forEach((row) => {
    const raw = key === 'Status' ? getSparePartStatus(row) : row?.[key]
    const value = String(raw ?? '').trim()
    if (!value || seen.has(value)) return
    seen.set(value, { value, label: value })
  })

  return [...seen.values()].sort((a, b) =>
    String(a.label ?? '').localeCompare(String(b.label ?? ''), 'th', {
      numeric: true,
      sensitivity: 'base',
    })
  )
}

const getSPFallbackCols = (t) => [
  { field:'Part_Code',           label:t('sp_th_code'),       type:'text',     width:'130px' },
  { field:'Category',            label:t('sp_th_cat'),        type:'select',   width:'130px', options: CATEGORY_OPTIONS },
  { field:'Part_Name_EN',        label:t('sp_th_name_en'),    type:'text',     width:'180px' },
  { field:'Unit',                label:t('field_unit'),       type:'text',     width:'80px' },
  { field:'Status',              label:t('status'),           type:'select',   width:'130px' },
  { field:'Stock_Qty',           label:t('sp_th_stock'),      type:'number',   width:'90px' },
  { field:'Min_Qty',             label:t('sp_th_min'),        type:'number',   width:'90px' },
  { field:'Unit_Price',          label:t('sp_th_price'),      type:'number',   width:'120px' },
  { field:'Location_Store',      label:t('field_warehouse'),  type:'select',   width:'130px', options: WAREHOUSE_OPTIONS },
  { field:'Supplier',            label:t('field_supplier'),   type:'text',     width:'150px' },
  { field:'Compatible_Machines', label:'เครื่องที่ใช้ได้',    type:'text',     width:'180px' },
  { field:'ImageUrl',            label:'URL',                  type:'text',     width:'220px' },
  { field:'ImagePreview',        label:'รูป',                  type:'text',     width:'110px' },
  { field:'Remark',              label:t('remark'),           type:'textarea', width:'220px' },
]

const getSPRequiredCols = (t) => getSPFallbackCols(t).map(({ field, label, width }) => ({ field, label, width }))

function resolveSPColumns(wbCols, t) {
  const fallbackCols = getSPFallbackCols(t)
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : fallbackCols
  return getSPRequiredCols(t).map((requiredCol) => {
    const match = sourceCols.find((c) =>
      c?.field === requiredCol.field || c?.label === requiredCol.label
    )
    if (match) return { ...match, field: requiredCol.field, label: requiredCol.label }
    const fallback = fallbackCols.find((c) => c.field === requiredCol.field)
    return fallback || { ...requiredCol, type: 'text' }
  })
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function getSPColumnLabel(col, t) {
  if (col.field === 'Compatible_Machines') return col.label || 'เครื่องที่ใช้ได้'
  if (col.field === 'ImageUrl' || col.field === 'ImagePreview') return col.label
  return SP_FIELD_KEYS[col.field] ? t(SP_FIELD_KEYS[col.field]) : col.label
}

function getSparePartName(row = {}) {
  if (!row) return ''
  return row.Part_Name_EN || row.Part_Name_TH || ''
}

function getSparePartStatus(row = {}) {
  return getPartStockStatus(row.Stock_Qty, row.Min_Qty)
}

function renderSPCell(row, col) {
  const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getSparePartImageUrl(row)
    : col.field === 'Part_Name_EN'
      ? getSparePartName(row)
    : col.field === 'Status'
      ? getSparePartStatus(row)
    : row[col.field]
  if (val === null || val === undefined || val === '')
    return <span style={{ color:'var(--text-400)' }}>—</span>
  if (col.field === 'ImageUrl')
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(val)}</a>
  if (col.field === 'ImagePreview')
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
  if (col.field === 'Compatible_Machines') {
    const text = Array.isArray(val) ? val.join(', ') : String(val)
    return <span style={{ fontSize:12, display:'block', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{text}</span>
  }
  if (col.field === 'Remark')
    return <span style={{ fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stripSparePartImageMeta(val)}</span>
  if (col.type === 'select') {
    const optColor = col.options?.find(o => o.value === val || o.label === val)?.color
    if (optColor) return <StatusBadge value={val} color={optColor} />
  }
  if (col.field === 'Status') return <StatusBadge value={val} />
  if (col.field === 'Stock_Qty')
    return <span className={`font-semibold ${val <= (row.Min_Qty||0) ? 'text-red-500' : 'text-emerald-600'}`}>{val}</span>
  if (col.field === 'Unit_Price')
    return <span>{`฿${Number(val).toLocaleString()}`}</span>
  return <span>{String(val)}</span>
}

const EMPTY = {
  Part_Code:'', Part_Name_TH:'', Part_Name_EN:'', Category:'', Unit:'',
  Stock_Qty:0, Min_Qty:0, Location_Store:'', Supplier:'', Unit_Price:0,
  Compatible_Machines:'', Status:'IN_STOCK', Remark:'',
  ImageUrl:'',
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingSparePartColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_SPAREPART_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

function getSparePartSaveErrorMessage(error) {
  const missingColumn = getMissingSparePartColumn(error)
  if (missingColumn === 'ImageUrl') {
    return 'ยังบันทึกลิงก์รูปลงคอลัมน์จริงไม่ได้ เพราะ Supabase ยังไม่มีคอลัมน์ ImageUrl ในตาราง spareparts'
  }
  return error.message
}

export default function SpareParts() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('spareparts')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(SparePartAPI)
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const byText = data.filter(p =>
    [p.Part_Code, p.Part_Name_EN, p.Part_Name_TH, p.Category, p.Supplier, stripSparePartImageMeta(p.Remark)].some(v =>
      String(v||'').toLowerCase().includes(search.toLowerCase())
    )
  )
  const baseRows = byText

  const lowStock = data.filter(p => getSparePartStatus(p) !== 'IN_STOCK').length

  const wbCols      = useWebBuilderMenu('/spareparts')
  const cols        = resolveSPColumns(wbCols, t)
  const statusOpts  = useFieldOptions('/spareparts', 'Status', PART_STATUS)
  const categoryFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Category', CATEGORY_OPTIONS),
    [data]
  )
  const statusFilterOptions = useMemo(
    () => buildSparePartFilterOptions(data, 'Status', statusOpts || PART_STATUS),
    [data, statusOpts]
  )
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    include: SP_FILTER_KEYS,
    selectOptions: { Status: statusFilterOptions, Category: categoryFilterOptions },
    valueGetters: {
      Part_Name_EN: getSparePartName,
      ImageUrl: getSparePartImageUrl,
      ImagePreview: getSparePartImageUrl,
      Remark: (row) => stripSparePartImageMeta(row.Remark),
      Status: getSparePartStatus,
    },
  }), [categoryFilterOptions, cols, statusFilterOptions])
  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const [detailRec, setDetailRec] = useState(null)

  const openNew  = () => { setForm({ ...EMPTY, Part_Code: generatePartCode(data) }); setModal(true) }
  const openEdit = (p) => {
    setForm({
      ...p,
      Compatible_Machines: Array.isArray(p.Compatible_Machines)
        ? p.Compatible_Machines.join(',') : p.Compatible_Machines || '',
      Status: getSparePartStatus(p),
      ImageUrl: getSparePartImageUrl(p),
    })
    setModal(true)
    setDetailRec(null)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: SPARE_PART_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Remark: appendSparePartImageMeta(prev.Remark, { imageUrl }),
      }))
      toast.success('อัปโหลดรูปสำเร็จ', imageUrl)
    } catch (e) {
      toast.error('อัปโหลดรูปไม่สำเร็จ', e.message)
    }
    setUploadingImage(false)
  }

  const saveWithColumnFallback = async (payload) => {
    let nextPayload = { ...payload }
    const removedColumns = []

    while (true) {
      try {
        await save(nextPayload)
        return removedColumns
      } catch (error) {
        const missingColumn = getMissingSparePartColumn(error)
        if (missingColumn === 'ImageUrl') {
          removedColumns.push(missingColumn)
          nextPayload = {
            ...omitKeys(nextPayload, ['ImageUrl']),
            Remark: appendSparePartImageMeta(nextPayload.Remark, { imageUrl: nextPayload.ImageUrl }),
          }
          continue
        }
        if (!missingColumn || removedColumns.includes(missingColumn)) {
          throw error
        }
        removedColumns.push(missingColumn)
        nextPayload = omitKeys(nextPayload, [missingColumn])
      }
    }
  }

  const submit = async () => {
    if (!form.Part_Code || !form.Part_Name_EN) return toast.warning('กรุณากรอกข้อมูล', t('sp_req'))
    const nextStatus = getSparePartStatus(form)
    const payload = buildSparePartImagePayload({
      ...form,
      Status: nextStatus,
      Compatible_Machines: form.Compatible_Machines
        ? String(form.Compatible_Machines).split(',').map(s=>s.trim()).filter(Boolean) : []
    })
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      const removedColumns = await saveWithColumnFallback(payload)
      if (removedColumns.length > 0) {
        toast.success(isEdit ? 'แก้ไขอะไหล่สำเร็จ' : 'เพิ่มอะไหล่สำเร็จ', 'บันทึกลิงก์รูปเรียบร้อย')
      } else {
        toast.success(isEdit ? 'แก้ไขอะไหล่สำเร็จ' : 'เพิ่มอะไหล่สำเร็จ', form.Part_Code)
      }
      setModal(false)
    } catch (e) { toast.error('เกิดข้อผิดพลาด', getSparePartSaveErrorMessage(e)) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('sp_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบอะไหล่สำเร็จ')
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }


  return (
    <div className="space-y-4">
      {lowStock > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.25)',color:'#c2410c'}}>
          <AlertTriangle size={16}/> {t('sp_alert', { n: lowStock })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('sp_search')} />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <GoogleSheetSyncButton
          sheetName="อะไหล่"
          columns={cols}
          rows={displayRows}
          valueGetters={{
            Part_Name_EN: getSparePartName,
            Status: getSparePartStatus,
            ImageUrl: getSparePartImageUrl,
            ImagePreview: getSparePartImageUrl,
            Remark: (row) => stripSparePartImageMeta(row.Remark),
          }}
        />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        {canAdd && <button className="btn-primary" onClick={openNew}><Plus size={15}/> {t('sp_add')}</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field||c.id} style={getColumnWidthStyle(c)}>{getSPColumnLabel(c, t)}</th>)}
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length+1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((p, i) => (
              <tr key={p._id || p.id || i} onClick={() => setDetailRec(p)} style={{cursor:'pointer'}}>
                {cols.map(c => <td key={c.field||c.id} style={getColumnWidthStyle(c)}>{renderSPCell(p, c)}</td>)}
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {canEdit && <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(p)}><Pencil size={12}/></button>}
                    {canDelete && <button className="btn-danger py-1 px-2 text-xs"  onClick={() => del(p._id || p.id)}><Trash2 size={12}/></button>}
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
        title={getSparePartName(detailRec)} subtitle={detailRec?.Part_Code}
        icon={Package} accentColor="#f59e0b" iconColor="#fbbf24"
        badge={detailRec && <StatusBadge value={getSparePartStatus(detailRec)} />}
        canEdit={canEdit} canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          { label: t('dr_part_info'), fields: [
            { label: t('sp_th_code'),     value: detailRec.Part_Code, mono: true },
            { label: t('sp_th_cat'),      value: detailRec.Category },
            { label: t('sp_th_name_en'),  value: getSparePartName(detailRec) },
            { label: t('field_unit'),     value: detailRec.Unit },
            { label: t('field_supplier'), value: detailRec.Supplier },
            { label: t('field_warehouse'),value: detailRec.Location_Store },
            { label: 'ลิงก์รูป',          value: getSparePartImageUrl(detailRec) },
          ]},
          { label: t('dr_stock'), fields: [
            { label: t('status'), value: getSparePartStatus(detailRec),
              node: <StatusBadge value={getSparePartStatus(detailRec)} /> },
            { label: t('sp_th_stock'), value: detailRec.Stock_Qty != null ? String(detailRec.Stock_Qty) : null,
              node: <span style={{ fontSize:15, fontWeight:800,
                color: (detailRec.Stock_Qty <= detailRec.Min_Qty) ? '#ef4444' : '#10b981' }}>
                {detailRec.Stock_Qty}
              </span> },
            { label: t('sp_th_min'),   value: detailRec.Min_Qty != null ? String(detailRec.Min_Qty) : null },
            { label: t('sp_th_price'), value: detailRec.Unit_Price
                ? `฿${Number(detailRec.Unit_Price).toLocaleString()}` : null },
          ]},
          { label: t('dr_compat_mc'), single: true, fields: [
            { label: 'เครื่องที่ใช้ได้', value: Array.isArray(detailRec.Compatible_Machines)
                ? detailRec.Compatible_Machines.join(', ') : detailRec.Compatible_Machines, full: true },
            { label: t('remark'), value: stripSparePartImageMeta(detailRec.Remark), full: true },
          ]},
        ] : []}
      />

      <Modal open={modal} onClose={() => setModal(false)}
        title={form._id ? t('sp_edit') : t('sp_add')} size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{(form._id || form.id) ? 'รหัสอะไหล่' : 'รหัสอะไหล่ (สร้างอัตโนมัติ)'}</label>
            <input className="input" value={form.Part_Code || ''} readOnly
              style={{ fontFamily:'monospace', background:'var(--bg-page)', color:'var(--text-500)', cursor:'not-allowed' }} />
          </div>
          <F form={form} setForm={setForm} label="หมวดหมู่"              id="Category" opts={CATEGORY_OPTIONS} />
          <F form={form} setForm={setForm} label={t('sp_th_name_en')+' *'} id="Part_Name_EN" />
          <F form={form} setForm={setForm} label="หน่วย"                 id="Unit" />
          <div>
            <label className="label">{t('status')} (อัตโนมัติ)</label>
            <div className="input" style={{ display:'flex', alignItems:'center', minHeight:42, background:'var(--bg-page)' }}>
              <StatusBadge value={getSparePartStatus(form)} />
            </div>
          </div>
          <F form={form} setForm={setForm} label="จำนวนคงเหลือ"          id="Stock_Qty"  type="number" />
          <F form={form} setForm={setForm} label="จำนวนขั้นต่ำ"          id="Min_Qty"    type="number" />
          <F form={form} setForm={setForm} label="ราคาต่อหน่วย (฿)"       id="Unit_Price" type="number" />
          <F form={form} setForm={setForm} label="ที่เก็บ"               id="Location_Store" opts={WAREHOUSE_OPTIONS} />
          <F form={form} setForm={setForm} label="ผู้จัดจำหน่าย"          id="Supplier" />
          <F form={form} setForm={setForm} label="เครื่องที่ใช้ได้ (คั่นด้วย ,)" id="Compatible_Machines" />
          <F form={form} setForm={setForm} label="ลิงก์รูป (Google Drive)" id="ImageUrl" useBuilder={false} />
          <div className="col-span-2">
            <label className="label">อัปโหลดรูป (Google Drive อัตโนมัติ)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => onPickImageFile(e.target.files?.[0])}
            />
            {uploadingImage && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-500)' }}>กำลังอัปโหลดรูป...</div>}
            {form.ImageUrl && (
              <div style={{ marginTop: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-500)' }}>ลิงก์รูป:</span>
                <a href={form.ImageUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  {form.ImageUrl}
                </a>
              </div>
            )}
          </div>
          <div className="col-span-2">
          </div>
          <div className="col-span-2">
            <label className="label">{t('remark')}</label>
            <textarea
              className="input"
              rows={2}
              value={stripSparePartImageMeta(form.Remark)}
              onChange={e => setForm(p => ({...p, Remark: preserveRemarkWithSparePartImageMeta(e.target.value, p)}))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
