import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { StockTxnAPI, TXN_TYPE, SparePartAPI } from '../api/entities'
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
import { generateStockTxnId, getPartStockStatus, getSignedStockDelta, toNumber } from '../utils/inventory'
import { getSparePartImageUrl } from '../utils/sparePartImage'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

const SM_FIELD_KEYS = {
  created_date:'sm_th_date', TXN_Type:'sm_th_type',
  Part_Name_EN:'sm_th_name', Qty_Before:'sm_th_before', Qty_Change:'sm_th_change',
  Qty_After:'sm_th_after', Reference:'sm_th_ref', Performed_By:'sm_th_by',
}
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const CATEGORY_NOTE_PREFIX = 'Category:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column/i
const HIDDEN_IMAGE_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  CATEGORY_NOTE_PREFIX,
]
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']
const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']

const getSMFallbackCols = (t) => [
  { field:'created_date',  label:t('sm_th_date'),   type:'datetime' },
  { field:'TXN_ID',        label:'เลขรายการ',        type:'text'     },
  { field:'TXN_Type',      label:t('sm_th_type'),   type:'select'   },
  { field:'Part_Code',     label:'รหัสอะไหล่',       type:'text'     },
  { field:'Part_Name_EN',  label:t('sm_th_name'),   type:'text'     },
  { field:'Category',      label:'หมวดหมู่',         type:'select',   width:'140px', options: CATEGORY_OPTIONS },
  { field:'Qty_Before',    label:t('sm_th_before'), type:'number'   },
  { field:'Qty_Change',    label:t('sm_th_change'), type:'number'   },
  { field:'Qty_After',     label:t('sm_th_after'),  type:'number'   },
  { field:'Unit',          label:t('field_unit'),    type:'text',     width:'80px' },
  { field:'Unit_Price',    label:'ราคาต่อหน่วย',     type:'number',   width:'110px' },
  { field:'Reference',     label:t('sm_th_ref'),    type:'text'     },
  { field:'Location_Store',label:t('field_warehouse'), type:'select', width:'130px', options: WAREHOUSE_OPTIONS },
  { field:'Performed_By',  label:t('sm_th_by'),     type:'text'     },
  { field:'ImageUrl',      label:'URL',              type:'text',     width:'220px' },
  { field:'ImagePreview',  label:'รูป',              type:'text',     width:'110px' },
  { field:'Note',          label:'หมายเหตุ',         type:'text',     width:'220px' },
]

const getSMRequiredCols = (t) => [
  { field:'created_date',  label:t('sm_th_date') },
  { field:'TXN_ID',        label:'เลขรายการ' },
  { field:'TXN_Type',      label:t('sm_th_type') },
  { field:'Part_Code',     label:'รหัสอะไหล่' },
  { field:'Part_Name_EN',  label:t('sm_th_name') },
  { field:'Category',      label:'หมวดหมู่', width:'140px' },
  { field:'Qty_Before',    label:t('sm_th_before') },
  { field:'Qty_Change',    label:t('sm_th_change') },
  { field:'Qty_After',     label:t('sm_th_after') },
  { field:'Unit',          label:t('field_unit'), width:'80px' },
  { field:'Unit_Price',    label:'ราคาต่อหน่วย', width:'110px' },
  { field:'Reference',     label:t('sm_th_ref') },
  { field:'Location_Store',label:t('field_warehouse'), width:'130px' },
  { field:'Performed_By',  label:t('sm_th_by') },
  { field:'ImageUrl',      label:'URL', width:'220px' },
  { field:'ImagePreview',  label:'รูป', width:'110px' },
  { field:'Note',          label:'หมายเหตุ', width:'220px' },
]

const EMPTY = {
  TXN_Type: 'ISSUE', Part_Code: '', Part_Name_EN: '', Category: '', Qty_Before: 0,
  Qty_Change: 0, Qty_After: 0, Unit: '', Unit_Price: 0,
  Reference: '', Reference_Type: 'MANUAL', Location_Store: '', Performed_By: '', Note: '',
}

function resolveSMColumns(wbCols, t) {
  const fallbackCols = getSMFallbackCols(t)
  const requiredCols = getSMRequiredCols(t)
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : fallbackCols
  const resolvedCols = requiredCols.map((requiredCol) => {
    const match = sourceCols.find((c) =>
      c?.field === requiredCol.field || c?.label === requiredCol.label
    )
    if (match) return { ...match, field: requiredCol.field, label: requiredCol.label }
    const fallback = fallbackCols.find((c) => c.field === requiredCol.field)
    return fallback || { ...requiredCol, type: 'text' }
  })
  const urlWidth = resolvedCols.find((c) => c.field === 'ImageUrl')?.width || '220px'
  return resolvedCols.map((col) => {
    if (col.field === 'Location_Store') {
      return { ...col, type: 'select', options: WAREHOUSE_OPTIONS }
    }
    if (col.field === 'Note') return { ...col, width: urlWidth }
    return col
  })
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function extractHiddenNoteValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

function stripImageUrlFromNote(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !HIDDEN_IMAGE_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

function appendStockMetaToNote(note = '', { category = '' } = {}) {
  const cleanNote = stripImageUrlFromNote(note)
  return [
    cleanNote,
    category ? `${CATEGORY_NOTE_PREFIX} ${category}` : '',
  ].filter(Boolean).join('\n')
}

function getHiddenStockCategory(row = {}) {
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

function buildStockPayload(form = {}) {
  return {
    ...omitKeys(form, ['ImageUrl', 'Category']),
    Note: appendStockMetaToNote(form.Note, { category: getHiddenStockCategory(form) }),
  }
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingStockColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || null
}

function getStockSaveErrorMessage(error) {
  return error.message
  const missingColumn = getMissingStockColumn(error)
  if (missingColumn === 'ImageUrl') {
    return 'ยังบันทึกลิงก์รูปไม่ได้ เพราะ Supabase ยังไม่มีคอลัมน์ ImageUrl ในตาราง stocktransactions'
  }
  return error.message
}

function getSMColumnLabel(col, t) {
  if (col.field === 'ImageUrl' || col.field === 'ImagePreview' || col.field === 'Note' || col.field === 'Category') return col.label
  return SM_FIELD_KEYS[col.field] ? t(SM_FIELD_KEYS[col.field]) : col.label
}

export default function StockMovement() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('stock')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(StockTxnAPI)
  const { data: parts, load: loadParts } = useEntity(SparePartAPI)
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const findPartForStockRow = (row = {}) =>
    parts.find((part) =>
      String(part.Part_Code || '').trim().toLowerCase() === String(row.Part_Code || '').trim().toLowerCase() ||
      (row.Part_ID && String(part.id || part._id) === String(row.Part_ID))
    )
  const getStockPartImageUrl = (row = {}) => {
    const part = findPartForStockRow(row)
    return getSparePartImageUrl(part || row)
  }
  const getStockCategory = (row = {}) => {
    const part = findPartForStockRow(row)
    return getHiddenStockCategory(row) || part?.Category || ''
  }

  const byText = data.filter(tx =>
    [tx.TXN_ID, tx.Part_Code, tx.Part_Name_EN, getStockCategory(tx), tx.Reference, tx.Performed_By, stripImageUrlFromNote(tx.Note)]
      .some(v => String(v||'').toLowerCase().includes(search.toLowerCase()))
  )
  const baseRows = byText

  const [detailRec, setDetailRec] = useState(null)

  const openNew = () => { setForm(EMPTY); setModal(true) }
  const openEdit = (tx) => {
    setForm({
      ...EMPTY,
      ...tx,
      Note: stripImageUrlFromNote(tx.Note),
      Category: getStockCategory(tx),
      ImageUrl: getStockPartImageUrl(tx),
    })
    setModal(true)
    setDetailRec(null)
  }

  useEffect(() => {
    const part = parts.find((item) => String(item.Part_Code || '').toLowerCase() === String(form.Part_Code || '').toLowerCase())
    if (!part) return
    const before = toNumber(part.Stock_Qty)
    const after = before + getSignedStockDelta(form.TXN_Type, form.Qty_Change)
    if (toNumber(form.Qty_Before) !== before || toNumber(form.Qty_After) !== after) {
      setForm((prev) => ({ ...prev, Qty_Before: before, Qty_After: after }))
    }
  }, [form.Part_Code, form.Qty_Change, form.TXN_Type, parts])

  const applyPartToForm = (partCode) => {
    const part = parts.find((item) => String(item.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase())
    setForm((prev) => ({
      ...prev,
      Part_Code: partCode,
      Part_Name_EN: part?.Part_Name_EN || prev.Part_Name_EN,
      Category: part?.Category || prev.Category,
      Qty_Before: part ? toNumber(part.Stock_Qty) : prev.Qty_Before,
      Qty_After: part ? toNumber(part.Stock_Qty) + getSignedStockDelta(prev.TXN_Type, prev.Qty_Change) : prev.Qty_After,
      Unit: part?.Unit || prev.Unit,
      Unit_Price: part?.Unit_Price || prev.Unit_Price,
      Location_Store: part?.Location_Store || prev.Location_Store,
    }))
  }

  // Picking a known part name fills the rest of the form, same as picking a code.
  const applyPartNameToForm = (partName) => {
    const part = parts.find((item) =>
      String(item.Part_Name_EN || '').toLowerCase() === String(partName || '').toLowerCase() ||
      String(item.Part_Name_TH || '').toLowerCase() === String(partName || '').toLowerCase()
    )
    if (part) { applyPartToForm(part.Part_Code); return }
    setForm((prev) => ({ ...prev, Part_Name_EN: partName }))
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadImageToGoogleDrive(file)
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Note: appendImageMetaToNote(prev.Note, { imageUrl }),
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
        const missingColumn = getMissingStockColumn(error)
        if (missingColumn === 'ImageUrl') {
          removedColumns.push(missingColumn)
          nextPayload = {
            ...omitKeys(nextPayload, ['ImageUrl']),
            Note: appendImageMetaToNote(nextPayload.Note, { imageUrl: nextPayload.ImageUrl }),
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

  const applyMovementToSparePart = async (payload) => {
    const partCode = String(payload.Part_Code || '').trim()
    if (!partCode) throw new Error('กรุณากรอกรหัสอะไหล่')

    const allParts = await SparePartAPI.list()
    const existing = allParts.find((part) => String(part.Part_Code || '').toLowerCase() === partCode.toLowerCase())
    const delta = getSignedStockDelta(payload.TXN_Type, payload.Qty_Change)
    if (!existing && delta < 0) throw new Error(`ไม่พบอะไหล่ ${partCode} ในเมนูอะไหล่`)

    const before = toNumber(existing?.Stock_Qty)
    const after = before + delta
    const partPayload = existing
      ? {
          ...existing,
          Part_Name_EN: existing.Part_Name_EN || payload.Part_Name_EN || '',
          Category: existing.Category || payload.Category || '',
          Unit: existing.Unit || payload.Unit || '',
          Unit_Price: existing.Unit_Price || toNumber(payload.Unit_Price),
          Location_Store: existing.Location_Store || payload.Location_Store || '',
          Stock_Qty: after,
          Status: getPartStockStatus(after, existing.Min_Qty),
        }
      : {
          Part_Code: partCode,
          Part_Name_TH: '',
          Part_Name_EN: payload.Part_Name_EN || partCode,
          Category: payload.Category || 'อะไหล่',
          Unit: payload.Unit || '',
          Stock_Qty: after,
          Min_Qty: 0,
          Location_Store: payload.Location_Store || '',
          Supplier: '',
          Unit_Price: toNumber(payload.Unit_Price),
          Compatible_Machines: [],
          Status: getPartStockStatus(after, 0),
          Remark: 'สร้างอัตโนมัติจากเมนูเคลื่อนไหวสต็อก',
        }

    const savedPart = existing
      ? await SparePartAPI.update(existing.id || existing._id, partPayload)
      : await SparePartAPI.create(partPayload)

    return {
      ...payload,
      Part_ID: savedPart.id || savedPart._id || existing?.id || null,
      Part_Name_EN: payload.Part_Name_EN || savedPart.Part_Name_EN || '',
      Category: payload.Category || savedPart.Category || '',
      Unit: payload.Unit || savedPart.Unit || '',
      Unit_Price: payload.Unit_Price || savedPart.Unit_Price || 0,
      Location_Store: payload.Location_Store || savedPart.Location_Store || '',
      Qty_Before: before,
      Qty_Change: Math.abs(toNumber(payload.Qty_Change)),
      Qty_After: after,
    }
  }

  const reverseMovementFromSparePart = async (movement) => {
    const allParts = await SparePartAPI.list()
    const existing = allParts.find((part) =>
      String(part.Part_Code || '').trim().toLowerCase() === String(movement.Part_Code || '').trim().toLowerCase() ||
      (movement.Part_ID && String(part.id || part._id) === String(movement.Part_ID))
    )
    if (!existing) return

    const delta = getSignedStockDelta(movement.TXN_Type, movement.Qty_Change)
    const nextQty = toNumber(existing.Stock_Qty) - delta
    await SparePartAPI.update(existing.id || existing._id, {
      ...existing,
      Stock_Qty: nextQty,
      Status: getPartStockStatus(nextQty, existing.Min_Qty),
    })
  }

  const submit = async () => {
    if (!form.Part_Code || !form.Qty_Change) return toast.warning('กรุณากรอกข้อมูล', t('sm_req'))
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    const previous = isEdit
      ? data.find((tx) => String(tx._id || tx.id) === String(form._id || form.id))
      : null
    let reversed = false
    let appliedPayload = null
    try {
      const now = new Date()
      if (previous) {
        await reverseMovementFromSparePart(previous)
        reversed = true
      }
      const stockPayload = await applyMovementToSparePart({
        ...form,
        TXN_ID: form.TXN_ID || generateStockTxnId(now),
      })
      appliedPayload = stockPayload
      await save(buildStockPayload(stockPayload))
      await loadParts()
      if (false) {
        toast.success('บันทึกรายการสำเร็จ', 'บันทึกลิงก์รูปเรียบร้อย')
      } else {
        toast.success('บันทึกรายการสำเร็จ', `${form.TXN_Type} — ${form.Part_Code}`)
      }
      setModal(false)
    } catch (e) {
      if (reversed && previous) {
        if (appliedPayload) {
          try { await reverseMovementFromSparePart(appliedPayload) } catch {}
        }
        try { await applyMovementToSparePart(buildStockPayload(previous)) } catch {}
      }
      toast.error('เกิดข้อผิดพลาด', getStockSaveErrorMessage(e))
    }
    setSaving(false)
  }

  const del = async (tx) => {
    const id = tx?._id || tx?.id
    if (!id) return
    if (!confirm('ยืนยันลบรายการเคลื่อนไหวสต็อกนี้? ระบบจะปรับยอดสต็อกคืนให้อัตโนมัติ')) return
    let reversed = false
    try {
      await reverseMovementFromSparePart(tx)
      reversed = true
      await remove(id)
      await loadParts()
      setDetailRec(null)
      toast.success('ลบรายการเคลื่อนไหวสต็อกสำเร็จ')
    } catch (e) {
      if (reversed) {
        try { await applyMovementToSparePart(buildStockPayload(tx)) } catch {}
      }
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }


  const wbCols      = useWebBuilderMenu('/stock')
  const cols        = resolveSMColumns(wbCols, t)
  const txnTypeOpts = useFieldOptions('/stock', 'TXN_Type', TXN_TYPE)
  const showActions = canEdit || canDelete
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { TXN_Type: txnTypeOpts || TXN_TYPE, Category: CATEGORY_OPTIONS, Location_Store: WAREHOUSE_OPTIONS },
    valueGetters: {
      created_date: (row) => row.created_date || row.created_at,
      Category: getStockCategory,
      ImageUrl: getStockPartImageUrl,
      ImagePreview: getStockPartImageUrl,
      Note: (row) => stripImageUrlFromNote(row.Note),
    },
  }), [cols, txnTypeOpts])
  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const txColor = (tp) => ({ RECEIVE:'text-emerald-500', ISSUE:'text-red-500', ADJUST:'text-blue-500', RETURN:'text-amber-500', SCRAP:'text-slate-400' }[tp] || '')

  const renderSMCell = (row, col) => {
    const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getStockPartImageUrl(row)
      : col.field === 'Category'
        ? getStockCategory(row)
      : col.field === 'created_date'
        ? row.created_date || row.created_at
      : row[col.field]
    if (col.type === 'select' || col.field === 'TXN_Type') {
      const optColor = col.options?.find(o => o.value === val || o.label === val)?.color
      if (optColor) return <StatusBadge value={val} color={optColor} />
    }
    if (col.field === 'TXN_Type') return <StatusBadge value={val} />
    if (col.field === 'created_date')
      return <span className="text-xs" style={{ color:'var(--text-400)' }}>
        {val ? format(new Date(val), 'dd/MM/yy HH:mm') : '—'}
      </span>
    if (col.field === 'Qty_Change')
      return <span className={`text-right font-semibold ${txColor(row.TXN_Type)}`}>
        {val != null ? (row.TXN_Type === 'ISSUE' || row.TXN_Type === 'SCRAP' ? `-${val}` : `+${val}`) : '—'}
      </span>
    if (col.field === 'Qty_Before' || col.field === 'Qty_After')
      return <span className="text-right text-sm">{val ?? '—'}</span>
    if (col.field === 'Unit_Price')
      return <span>{`฿${Number(val).toLocaleString()}`}</span>
    if (val === null || val === undefined || val === '')
      return <span style={{ color:'var(--text-400)' }}>—</span>
    if (col.field === 'ImageUrl') {
      return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(val)}</a>
    }
    if (col.field === 'ImagePreview') {
      return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
    }
    if (col.field === 'Note')
      return <span style={{ fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stripImageUrlFromNote(val)}</span>
    return <span>{String(val)}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('sm_search')} />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <GoogleSheetSyncButton
          sheetName="เคลื่อนไหวสต็อก"
          columns={cols}
          rows={displayRows}
          valueGetters={{
            created_date: (row) => row.created_date || row.created_at,
            Category: getStockCategory,
            ImageUrl: getStockPartImageUrl,
            ImagePreview: getStockPartImageUrl,
            Note: (row) => stripImageUrlFromNote(row.Note),
          }}
        />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        {canAdd && <button className="btn-primary" onClick={openNew}><Plus size={15}/> {t('sm_add')}</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field||c.id} style={getColumnWidthStyle(c)}>{getSMColumnLabel(c, t)}</th>)}
              {showActions && <th style={{ width: 128, minWidth: 128, textAlign: 'right' }}>จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length + (showActions ? 1 : 0)} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((tx, i) => (
              <tr key={tx._id || tx.id || i} onClick={() => setDetailRec(tx)} style={{cursor:'pointer'}}>
                {cols.map(c => <td key={c.field||c.id} style={getColumnWidthStyle(c)}>{renderSMCell(tx, c)}</td>)}
                {showActions && (
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {canEdit && <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(tx)}><Pencil size={12}/> แก้ไข</button>}
                      {canDelete && <button className="btn-danger py-1 px-2 text-xs" onClick={() => del(tx)}><Trash2 size={12}/> ลบ</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!loading && !displayRows.length && <tr><td colSpan={cols.length + (showActions ? 1 : 0)} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={!!detailRec} onClose={() => setDetailRec(null)}
        title={detailRec?.Part_Code} subtitle={detailRec?.TXN_ID}
        icon={ArrowLeftRight} accentColor="#06b6d4" iconColor="#22d3ee"
        badge={detailRec && <StatusBadge value={detailRec.TXN_Type} />}
        canEdit={canEdit} canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => del(detailRec)}
        groups={detailRec ? [
          { label: t('dr_movement'), fields: [
            { label: 'เลขรายการ',        value: detailRec.TXN_ID, mono: true },
            { label: t('sm_th_type'),    value: detailRec.TXN_Type },
            { label: 'รหัสอะไหล่',       value: detailRec.Part_Code, mono: true },
            { label: t('sm_th_name'),    value: detailRec.Part_Name_EN },
            { label: 'หมวดหมู่',         value: getStockCategory(detailRec) },
            { label: t('field_unit'),    value: detailRec.Unit },
            { label: t('sm_th_by'),      value: detailRec.Performed_By },
            { label: 'ลิงก์รูป',         value: getStockPartImageUrl(detailRec) },
          ]},
          { label: t('dr_quantity'), fields: [
            { label: t('sm_th_before'), value: detailRec.Qty_Before != null ? String(detailRec.Qty_Before) : null },
            { label: t('sm_th_change'), value: detailRec.Qty_Change != null ? String(detailRec.Qty_Change) : null,
              node: detailRec.Qty_Change != null ? <span style={{fontSize:15, fontWeight:800,
                color: ['ISSUE','SCRAP'].includes(detailRec.TXN_Type) ? '#ef4444' : '#10b981'}}>
                {['ISSUE','SCRAP'].includes(detailRec.TXN_Type) ? '-' : '+'}{detailRec.Qty_Change}
              </span> : null },
            { label: t('sm_th_after'),  value: detailRec.Qty_After != null ? String(detailRec.Qty_After) : null },
            { label: 'ราคาต่อหน่วย',   value: detailRec.Unit_Price ? `฿${Number(detailRec.Unit_Price).toLocaleString()}` : null },
          ]},
          { label: t('dr_reference'), fields: [
            { label: 'อ้างอิง',             value: detailRec.Reference },
            { label: t('field_warehouse'),  value: detailRec.Location_Store },
            { label: t('sm_th_date'),       value: (detailRec.created_date || detailRec.created_at)
                ? format(new Date(detailRec.created_date || detailRec.created_at),'dd/MM/yyyy HH:mm') : null },
          ]},
          { label: 'หมายเหตุ', single: true, fields: [
            { label: 'หมายเหตุ', value: stripImageUrlFromNote(detailRec.Note), full: true },
          ]},
        ] : []}
      />

      <Modal open={modal} onClose={() => setModal(false)} title={t('sm_modal')} size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <F form={form} setForm={setForm} label={t('sm_th_type')}   id="TXN_Type"       opts={txnTypeOpts} />
          <div>
            <label className="label">รหัสอะไหล่ *</label>
            <input
              className="input"
              list="sm-part-codes"
              value={form.Part_Code || ''}
              onChange={(e) => applyPartToForm(e.target.value)}
            />
            <datalist id="sm-part-codes">
              {parts.map((part) => (
                <option key={part.id || part.Part_Code} value={part.Part_Code}>
                  {part.Part_Name_EN || part.Part_Name_TH || part.Part_Code}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">{t('sm_th_name')}</label>
            <input
              className="input"
              list="sm-part-names"
              value={form.Part_Name_EN || ''}
              onChange={(e) => applyPartNameToForm(e.target.value)}
            />
            <datalist id="sm-part-names">
              {[...new Set(parts.map((part) => part.Part_Name_EN).filter(Boolean))].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <F form={form} setForm={setForm} label="หมวดหมู่" id="Category" opts={CATEGORY_OPTIONS} />
          <F form={form} setForm={setForm} label={t('sm_th_before')} id="Qty_Before"  type="number" />
          <F form={form} setForm={setForm} label={t('sm_th_change')+' *'} id="Qty_Change" type="number" />
          <F form={form} setForm={setForm} label={t('sm_th_after')}  id="Qty_After"   type="number" />
          <F form={form} setForm={setForm} label="หน่วย"             id="Unit" />
          <F form={form} setForm={setForm} label="ราคาต่อหน่วย"      id="Unit_Price"  type="number" />
          <F form={form} setForm={setForm} label={t('sm_th_ref')}    id="Reference" />
          <F form={form} setForm={setForm} label="ที่เก็บ"           id="Location_Store" opts={WAREHOUSE_OPTIONS} />
          <F form={form} setForm={setForm} label={t('sm_th_by')}     id="Performed_By" />
          <div className="col-span-2">
            <label className="label">หมายเหตุ</label>
            <textarea
              className="input"
              rows={2}
              value={stripImageUrlFromNote(form.Note)}
              onChange={e => setForm(p => ({...p, Note: e.target.value}))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
