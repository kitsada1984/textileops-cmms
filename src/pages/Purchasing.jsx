import { useMemo, useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import useEntity from '../hooks/useEntity'
import { PurchaseOrderAPI, PO_STATUS, SparePartAPI, StockTxnAPI } from '../api/entities'
import useWebBuilderMenu from '../hooks/useWebBuilderMenu'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import { useT } from '../contexts/LanguageContext'
import usePagePerms from '../hooks/usePagePerms'
import DetailDrawer from '../components/ui/DetailDrawer'
import { useToast } from '../components/ui/Toast'
import F from '../components/ui/FormField'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { uploadImageToGoogleDrive } from '../utils/googleDriveUpload'
import { generateStockTxnId, getPartStockStatus, toNumber } from '../utils/inventory'
import { appendSparePartImageMeta, getSparePartImageUrl } from '../utils/sparePartImage'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'

const STATUS_CFG = {
  ORDERED:   { bg:'rgba(59,130,246,0.12)',  border:'rgba(59,130,246,0.35)',  color:'#3b82f6', dot:'#3b82f6'  },
  RECEIVED:  { bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.35)',  color:'#10b981', dot:'#10b981'  },
  CANCELLED: { bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.35)',   color:'#ef4444', dot:'#ef4444'  },
}
const STATUS_TH = Object.fromEntries(PO_STATUS.map(s => [s.value, s.label]))
const CATEGORY_OPTIONS = ['อะไหล่', 'เครื่องมือช่าง']
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'purchaseorders'/i
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const CATEGORY_NOTE_PREFIX = 'Category:'
const PART_CODE_NOTE_PREFIX = 'PartCode:'
const PART_NAME_NOTE_PREFIX = 'PartName:'
const APPLIED_QTY_NOTE_PREFIX = 'InventoryAppliedQty:'
const APPLIED_PART_NOTE_PREFIX = 'InventoryAppliedPartCode:'
const PO_NUMERIC_FIELDS = ['Qty', 'UnitPrice', 'Total_Amount']
const HIDDEN_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  CATEGORY_NOTE_PREFIX,
  PART_CODE_NOTE_PREFIX,
  PART_NAME_NOTE_PREFIX,
  APPLIED_QTY_NOTE_PREFIX,
  APPLIED_PART_NOTE_PREFIX,
]
const PURCHASE_IMAGE_FOLDER = 'จัดซื้อ'

function StatusPill({ value }) {
  const cfg = STATUS_CFG[value] || {}
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700,
      background:cfg.bg||'var(--bg-card)', border:`1px solid ${cfg.border||'var(--border)'}`, color:cfg.color||'var(--text-500)',
    }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.dot||'currentColor', flexShrink:0 }} />
      {STATUS_TH[value] || value}
    </span>
  )
}

const getPOFallbackCols = () => [
  { field:'PO_Number',    label:'เลข PO',          type:'text'   },
  { field:'Order_Date',   label:'วันที่สั่ง',      type:'date'   },
  { field:'Received_Date',label:'วันที่รับ',       type:'date'   },
  { field:'Status',       label:'สถานะ',           type:'select' },
  { field:'Part_Code',    label:'รหัสอะไหล่',      type:'text',   width:'130px' },
  { field:'Part_Name_EN', label:'ชื่ออะไหล่',      type:'text',   width:'180px' },
  { field:'Category',     label:'หมวดหมู่',        type:'select', width:'140px', options: CATEGORY_OPTIONS },
  { field:'Detail',       label:'รายละเอียด',      type:'text'   },
  { field:'Qty',          label:'จำนวน',           type:'number' },
  { field:'UnitPrice',    label:'ราคาต่อหน่วย',    type:'number' },
  { field:'Total_Amount', label:'ราคารวม',         type:'number' },
  { field:'Supplier',     label:'แหล่งที่มา',      type:'text'   },
  { field:'Phone',        label:'โทรศัพท์',        type:'text'   },
  { field:'Email',        label:'อีเมล',           type:'text'   },
  { field:'Line',         label:'ไลน์',            type:'text'   },
  { field:'ImageUrl',     label:'URL',             type:'text',   width:'220px' },
  { field:'ImagePreview', label:'รูป',             type:'text',   width:'110px' },
  { field:'Note',         label:'หมายเหตุ',        type:'text',   width:'220px' },
  { field:'LastUpdated',  label:'อัปเดตล่าสุด',    type:'date'   },
]

const REQUIRED_PO_COLUMNS = [
  { field:'PO_Number',    label:'เลข PO' },
  { field:'Order_Date',   label:'วันที่สั่ง' },
  { field:'Received_Date',label:'วันที่รับ' },
  { field:'Status',       label:'สถานะ' },
  { field:'Part_Code',    label:'รหัสอะไหล่', width:'130px' },
  { field:'Part_Name_EN', label:'ชื่ออะไหล่', width:'180px' },
  { field:'Category',     label:'หมวดหมู่', width:'140px' },
  { field:'Detail',       label:'รายละเอียด' },
  { field:'Qty',          label:'จำนวน' },
  { field:'UnitPrice',    label:'ราคาต่อหน่วย' },
  { field:'Total_Amount', label:'ราคารวม' },
  { field:'Supplier',     label:'แหล่งที่มา' },
  { field:'Phone',        label:'โทรศัพท์' },
  { field:'Email',        label:'อีเมล' },
  { field:'Line',         label:'ไลน์' },
  { field:'ImageUrl',     label:'URL', width:'220px' },
  { field:'ImagePreview', label:'รูป', width:'110px' },
  { field:'Note',         label:'หมายเหตุ', width:'220px' },
  { field:'LastUpdated',  label:'อัปเดตล่าสุด' },
]

function resolvePOColumns(wbCols) {
  const fallbackCols = getPOFallbackCols()
  const sourceCols = (wbCols && wbCols.length > 0) ? wbCols : fallbackCols
  const resolvedCols = REQUIRED_PO_COLUMNS.map((requiredCol) => {
    const match = sourceCols.find((c) =>
      c?.field === requiredCol.field || c?.label === requiredCol.label
    )
    if (match) return { ...match, field: requiredCol.field, label: requiredCol.label }
    const fallback = fallbackCols.find((c) => c.field === requiredCol.field)
    return fallback || { ...requiredCol, type: 'text' }
  })
  const urlWidth = resolvedCols.find((c) => c.field === 'ImageUrl')?.width || '220px'
  return resolvedCols.map((col) =>
    col.field === 'Note' ? { ...col, width: urlWidth } : col
  )
}

function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function extractHiddenNoteValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

function stripHiddenNoteMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !HIDDEN_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

function appendPOMetaToNote(note = '', {
  imageUrl = '',
  category = '',
  partCode = '',
  partName = '',
  appliedQty,
  appliedPartCode = '',
} = {}) {
  const cleanNote = stripHiddenNoteMeta(note)
  const appliedQtyText = appliedQty !== undefined && appliedQty !== null ? String(toNumber(appliedQty)) : ''
  return [
    cleanNote,
    imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : '',
    category ? `${CATEGORY_NOTE_PREFIX} ${category}` : '',
    partCode ? `${PART_CODE_NOTE_PREFIX} ${partCode}` : '',
    partName ? `${PART_NAME_NOTE_PREFIX} ${partName}` : '',
    appliedQtyText ? `${APPLIED_QTY_NOTE_PREFIX} ${appliedQtyText}` : '',
    appliedPartCode ? `${APPLIED_PART_NOTE_PREFIX} ${appliedPartCode}` : '',
  ].filter(Boolean).join('\n')
}

function getPOImageUrl(row = {}) {
  return row.ImageUrl || extractHiddenNoteValue(row.Note, IMAGE_NOTE_PREFIX) || ''
}

function getPOCategory(row = {}) {
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

function getPOPartCode(row = {}) {
  return row.Part_Code || extractHiddenNoteValue(row.Note, PART_CODE_NOTE_PREFIX) || ''
}

function getPOPartName(row = {}) {
  return row.Part_Name_EN || extractHiddenNoteValue(row.Note, PART_NAME_NOTE_PREFIX) || row.Detail || ''
}

function getPOAppliedQty(row = {}) {
  return toNumber(extractHiddenNoteValue(row.Note, APPLIED_QTY_NOTE_PREFIX))
}

function getPOAppliedPartCode(row = {}) {
  return extractHiddenNoteValue(row.Note, APPLIED_PART_NOTE_PREFIX) || getPOPartCode(row)
}

function preserveCommentWithPOMeta(comment = '', form = {}) {
  return appendPOMetaToNote(comment, {
    imageUrl: getPOImageUrl(form),
    category: getPOCategory(form),
    partCode: getPOPartCode(form),
    partName: getPOPartName(form),
    appliedQty: getPOAppliedQty(form),
    appliedPartCode: getPOAppliedPartCode(form),
  })
}

function normalizePONumericFields(payload = {}) {
  return PO_NUMERIC_FIELDS.reduce((nextPayload, field) => ({
    ...nextPayload,
    [field]: toNumber(nextPayload[field]),
  }), { ...payload })
}

function buildPurchasePayload(form = {}) {
  return normalizePONumericFields({
    ...omitKeys(form, ['ImageUrl', 'Part_Code', 'Part_Name_EN']),
    Note: appendPOMetaToNote(form.Note, {
      imageUrl: getPOImageUrl(form),
      category: getPOCategory(form),
      partCode: getPOPartCode(form),
      partName: getPOPartName(form),
      appliedQty: getPOAppliedQty(form),
      appliedPartCode: getPOAppliedPartCode(form),
    }),
  })
}

function buildColumnSafePurchasePayload(payload = {}, removedColumns = []) {
  const nextPayload = normalizePONumericFields({
    ...payload,
    Note: appendPOMetaToNote(payload.Note, {
      imageUrl: getPOImageUrl(payload),
      category: getPOCategory(payload),
      partCode: getPOPartCode(payload),
      partName: getPOPartName(payload),
      appliedQty: getPOAppliedQty(payload),
      appliedPartCode: getPOAppliedPartCode(payload),
    }),
  })
  removedColumns.forEach((column) => { delete nextPayload[column] })
  return nextPayload
}

function renderPOCell(row, col) {
  const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
    ? getPOImageUrl(row)
    : col.field === 'Part_Code'
      ? getPOPartCode(row)
      : col.field === 'Part_Name_EN'
        ? getPOPartName(row)
        : col.field === 'Category'
          ? getPOCategory(row)
        : row[col.field]
  if (val === null || val === undefined || val === '')
    return <span style={{ color:'var(--text-400)' }}>-</span>
  if (col.field === 'Status')
    return <StatusPill value={val} />
  if (col.field === 'Total_Amount' || col.field === 'UnitPrice')
    return <span style={{ fontWeight:600, fontSize:12 }}>{`฿${Number(val).toLocaleString()}`}</span>
  if (col.field === 'Qty')
    return <span style={{ fontWeight:600, fontSize:12 }}>{val}</span>
  if (col.type === 'date' || col.field.includes('Date') || col.field === 'LastUpdated') {
    try { return <span style={{ fontSize:11 }}>{format(new Date(val), 'dd/MM/yy')}</span> }
    catch { return <span>{val}</span> }
  }
  if (col.field === 'ImageUrl') {
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(val)}</a>
  }
  if (col.field === 'ImagePreview') {
    return <a href={String(val)} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
  }
  if (col.field === 'Note')
    return <span style={{ fontSize:12, display:'block', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stripHiddenNoteMeta(val)}</span>
  if (col.field === 'Detail')
    return <span style={{ fontSize:12, display:'block', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(val)}</span>
  return <span style={{ fontSize:12 }}>{String(val)}</span>
}

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => { delete clone[key] })
  return clone
}

function getMissingPurchaseOrderColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || null
}

function getPurchaseOrderSaveErrorMessage(error) {
  const missingColumn = getMissingPurchaseOrderColumn(error)
  if (missingColumn === 'ImageUrl') {
    return 'ยังบันทึกลิงก์รูปไม่ได้ เพราะ Supabase ยังไม่มีคอลัมน์ ImageUrl ในตาราง purchaseorders'
  }
  if (missingColumn === 'Category') {
    return 'ยังบันทึกหมวดหมู่ลงคอลัมน์จริงไม่ได้ เพราะ Supabase ยังไม่มีคอลัมน์ Category ในตาราง purchaseorders'
  }
  return error.message
}

const EMPTY = {
  PO_Number:'', Supplier:'', Status:'ORDERED',
  Order_Date:'', Received_Date:'',
  Detail:'', Qty:'', UnitPrice:'', Total_Amount:'',
  Phone:'', Email:'', Line:'', Note:'', LastUpdated:'',
  Part_Code:'', Part_Name_EN:'', Category:'',
  ImageUrl:'',
}

export default function Purchasing() {
  const { t } = useT()
  const { canAdd, canEdit, canDelete } = usePagePerms('purchasing')
  const toast = useToast()
  const { data, loading, load, save, remove } = useEntity(PurchaseOrderAPI)
  const { data: parts, load: loadParts } = useEntity(SparePartAPI)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)

  const byText = data.filter(p =>
    [p.PO_Number, p.Supplier, getPOPartCode(p), getPOPartName(p), getPOCategory(p), p.Detail, stripHiddenNoteMeta(p.Note)].some(v =>
      String(v||'').toLowerCase().includes(search.toLowerCase())
    )
  )
  const baseRows = byText

  const wbCols = useWebBuilderMenu('/purchasing')
  const cols = resolvePOColumns(wbCols)
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { Status: PO_STATUS, Category: CATEGORY_OPTIONS },
    valueGetters: {
      Part_Code: getPOPartCode,
      Part_Name_EN: getPOPartName,
      Category: getPOCategory,
      ImageUrl: getPOImageUrl,
      ImagePreview: getPOImageUrl,
      Note: (row) => stripHiddenNoteMeta(row.Note),
    },
  }), [cols])
  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  useEffect(() => {
    const qty = parseFloat(form.Qty) || 0
    const price = parseFloat(form.UnitPrice) || 0
    if (qty > 0 && price > 0) setForm(p => ({ ...p, Total_Amount: qty * price }))
  }, [form.Qty, form.UnitPrice])

  const [detailRec, setDetailRec] = useState(null)

  const openNew = () => { setForm(EMPTY); setModal(true) }
  const openEdit = (p) => {
    setForm({
      ...p,
      ImageUrl: getPOImageUrl(p),
      Category: getPOCategory(p),
      Part_Code: getPOPartCode(p),
      Part_Name_EN: getPOPartName(p),
    })
    setModal(true)
    setDetailRec(null)
  }

  const applyPartToForm = (partCode) => {
    const part = parts.find((item) => String(item.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase())
    setForm((prev) => ({
      ...prev,
      Part_Code: partCode,
      Part_Name_EN: part?.Part_Name_EN || prev.Part_Name_EN,
      Category: part?.Category || prev.Category,
      Detail: part?.Part_Name_EN || prev.Detail,
      UnitPrice: prev.UnitPrice || part?.Unit_Price || '',
      Supplier: prev.Supplier || part?.Supplier || '',
      Note: appendPOMetaToNote(prev.Note, {
        imageUrl: getPOImageUrl(prev),
        category: part?.Category || prev.Category,
        partCode,
        partName: part?.Part_Name_EN || prev.Part_Name_EN || prev.Detail,
        appliedQty: getPOAppliedQty(prev),
        appliedPartCode: getPOAppliedPartCode(prev),
      }),
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
      const { imageUrl } = await uploadImageToGoogleDrive(file, { folderName: PURCHASE_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Note: appendPOMetaToNote(prev.Note, {
          imageUrl,
          partCode: getPOPartCode(prev),
          partName: getPOPartName(prev),
          appliedQty: getPOAppliedQty(prev),
          appliedPartCode: getPOAppliedPartCode(prev),
        }),
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
        const saved = await save(nextPayload)
        return { removedColumns, saved }
      } catch (error) {
        const missingColumn = getMissingPurchaseOrderColumn(error)
        if (missingColumn === 'ImageUrl') {
          removedColumns.push(missingColumn)
          nextPayload = {
            ...omitKeys(nextPayload, ['ImageUrl']),
            Note: appendPOMetaToNote(nextPayload.Note, { imageUrl: nextPayload.ImageUrl }),
          }
          continue
        }
        if (missingColumn === 'Category' && nextPayload.Category) {
          removedColumns.push(missingColumn)
          nextPayload = omitKeys(nextPayload, ['Category'])
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

  const updateSparePartStock = async (partCode, delta, po) => {
    const allParts = await SparePartAPI.list()
    const existing = allParts.find((part) => String(part.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase())
    const partName = getPOPartName(po)
    const poImageUrl = getPOImageUrl(po)
    const category = getPOCategory(po) || existing?.Category || 'อะไหล่'
    const before = toNumber(existing?.Stock_Qty)
    const after = before + delta
    if (!existing && delta < 0) throw new Error(`ไม่พบอะไหล่ ${partCode} ในเมนูอะไหล่`)

    const partPayload = existing
      ? {
          ...existing,
          Part_Name_EN: existing.Part_Name_EN || partName,
          Category: existing.Category || category,
          Supplier: existing.Supplier || po.Supplier || '',
          Unit_Price: existing.Unit_Price || toNumber(po.UnitPrice),
          Stock_Qty: after,
          Status: getPartStockStatus(after, existing.Min_Qty),
          Remark: appendSparePartImageMeta(existing.Remark, {
            imageUrl: getSparePartImageUrl(existing) || poImageUrl,
          }),
        }
      : {
          Part_Code: partCode,
          Part_Name_TH: '',
          Part_Name_EN: partName,
          Category: category,
          Unit: '',
          Stock_Qty: after,
          Min_Qty: 0,
          Location_Store: '',
          Supplier: po.Supplier || '',
          Unit_Price: toNumber(po.UnitPrice),
          Compatible_Machines: [],
          Status: getPartStockStatus(after, 0),
          Remark: appendSparePartImageMeta('สร้างอัตโนมัติจากเมนูจัดซื้อ', {
            imageUrl: poImageUrl,
          }),
        }

    const savedPart = existing
      ? await SparePartAPI.update(existing.id || existing._id, partPayload)
      : await SparePartAPI.create(partPayload)

    const now = new Date()
    await StockTxnAPI.create({
      TXN_ID: generateStockTxnId(now),
      TXN_Type: delta >= 0 ? 'RECEIVE' : 'ADJUST',
      Part_ID: savedPart.id || savedPart._id || existing?.id || null,
      Part_Code: partCode,
      Part_Name_EN: savedPart.Part_Name_EN || partName,
      Qty_Before: before,
      Qty_Change: Math.abs(delta),
      Qty_After: after,
      Unit: savedPart.Unit || '',
      Unit_Price: savedPart.Unit_Price || toNumber(po.UnitPrice),
      Reference: po.PO_Number || po.id || '',
      Reference_Type: 'PO',
      Location_Store: savedPart.Location_Store || '',
      Performed_By: 'ระบบจัดซื้ออัตโนมัติ',
      Note: `ระบบจัดซื้อ${delta >= 0 ? 'รับเข้าสต็อก' : 'ปรับยอดสต็อก'}อัตโนมัติ\nCategory: ${category}`,
    })
  }

  const syncInventoryFromPurchase = async (savedPO, removedColumns = []) => {
    const partCode = getPOPartCode(savedPO)
    const appliedPartCode = getPOAppliedPartCode(savedPO)
    const appliedQty = getPOAppliedQty(savedPO)
    const desiredQty = savedPO.Status === 'RECEIVED' ? toNumber(savedPO.Qty) : 0

    if (!partCode && desiredQty > 0) {
      throw new Error('กรุณาเลือกรหัสอะไหล่ก่อนเปลี่ยน PO เป็นรับแล้ว')
    }

    if (appliedQty > 0 && appliedPartCode && appliedPartCode !== partCode) {
      await updateSparePartStock(appliedPartCode, -appliedQty, savedPO)
    }

    const samePartAppliedQty = appliedPartCode === partCode ? appliedQty : 0
    const delta = desiredQty - samePartAppliedQty
    if (partCode && delta !== 0) {
      await updateSparePartStock(partCode, delta, savedPO)
    }

    if (delta !== 0 || appliedQty !== desiredQty || appliedPartCode !== partCode) {
      const note = appendPOMetaToNote(savedPO.Note, {
        imageUrl: getPOImageUrl(savedPO),
        category: getPOCategory(savedPO),
        partCode,
        partName: getPOPartName(savedPO),
        appliedQty: desiredQty,
        appliedPartCode: desiredQty > 0 ? partCode : '',
      })
      await saveWithColumnFallback(buildColumnSafePurchasePayload({ ...savedPO, Note: note }, removedColumns))
    }
  }

  const submit = async () => {
    if (!form.Supplier && !form.Detail) return toast.warning('กรุณากรอกข้อมูล', 'กรุณากรอกแหล่งที่มาหรือรายละเอียด')
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    try {
      const basePayload = buildPurchasePayload({ ...form, LastUpdated: format(new Date(), 'yyyy-MM-dd') })
      const { removedColumns, saved } = await saveWithColumnFallback(basePayload)
      const savedPOForSync = buildColumnSafePurchasePayload({
        ...saved,
        ...basePayload,
        id: saved?.id,
        _id: saved?._id,
      }, removedColumns)
      await syncInventoryFromPurchase(savedPOForSync, removedColumns)
      if (removedColumns.length > 0) {
        toast.success(isEdit ? 'แก้ไข PO สำเร็จ' : 'สร้าง PO สำเร็จ', 'บันทึกลิงก์รูปเรียบร้อย')
      } else {
        toast.success(isEdit ? 'แก้ไข PO สำเร็จ' : 'สร้าง PO สำเร็จ', form.Supplier || form.Detail)
      }
      await load()
      await loadParts()
      setModal(false)
    } catch (e) { toast.error('เกิดข้อผิดพลาด', getPurchaseOrderSaveErrorMessage(e)) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm(t('po_del_confirm'))) return
    try {
      await remove(id)
      toast.success('ลบ PO สำเร็จ')
    } catch (e) { toast.error('เกิดข้อผิดพลาด', e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={t('po_search')} />
        <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
        <GoogleSheetSyncButton
          sheetName="จัดซื้อ"
          columns={cols}
          rows={displayRows}
          valueGetters={{
            ImageUrl: getPOImageUrl,
            ImagePreview: getPOImageUrl,
            Category: getPOCategory,
            Part_Code: getPOPartCode,
            Part_Name_EN: getPOPartName,
            Note: (row) => stripHiddenNoteMeta(row.Note),
          }}
        />
        <button className="btn-outline ml-auto" onClick={load}><RefreshCw size={14}/> {t('refresh')}</button>
        {canAdd && <button className="btn-primary" onClick={openNew}><Plus size={15}/> {t('po_add')}</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => <th key={c.field||c.id} style={getColumnWidthStyle(c)}>{c.label}</th>)}
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={cols.length+1} className="text-center py-8" style={{color:'var(--text-400)'}}>{t('loading')}</td></tr>}
            {!loading && displayRows.map((p, i) => (
              <tr key={p._id || p.id || i} onClick={() => setDetailRec(p)} style={{cursor:'pointer'}}>
                {cols.map(c => <td key={c.field||c.id} style={getColumnWidthStyle(c)}>{renderPOCell(p, c)}</td>)}
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    {canEdit && <button className="btn-outline py-1 px-2 text-xs" onClick={() => openEdit(p)}><Pencil size={12}/></button>}
                    {canDelete && <button className="btn-danger py-1 px-2 text-xs" onClick={() => del(p._id || p.id)}><Trash2 size={12}/></button>}
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
        title={detailRec?.Supplier || detailRec?.Detail} subtitle={detailRec?.PO_Number}
        icon={ShoppingCart} accentColor="#ef4444" iconColor="#f87171"
        badge={detailRec && <StatusPill value={detailRec.Status} />}
        canEdit={canEdit} canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => { del(detailRec._id || detailRec.id); setDetailRec(null) }}
        groups={detailRec ? [
          { label: 'ข้อมูลคำสั่งซื้อ', fields: [
            { label: 'เลข PO',       value: detailRec.PO_Number, mono: true },
            { label: 'แหล่งที่มา',  value: detailRec.Supplier },
            { label: 'รหัสอะไหล่',  value: getPOPartCode(detailRec), mono: true },
            { label: 'ชื่ออะไหล่',  value: getPOPartName(detailRec) },
            { label: 'หมวดหมู่',    value: getPOCategory(detailRec) },
            { label: 'รายละเอียด',  value: detailRec.Detail },
            { label: 'โทรศัพท์',    value: detailRec.Phone },
            { label: 'อีเมล',       value: detailRec.Email },
            { label: 'ไลน์',        value: detailRec.Line },
            { label: 'ลิงก์รูป',    value: getPOImageUrl(detailRec) },
          ].filter(f => f.value)},
          { label: 'วันที่', fields: [
            { label: 'วันที่สั่ง',      value: detailRec.Order_Date ? format(new Date(detailRec.Order_Date), 'dd/MM/yyyy') : null },
            { label: 'วันที่รับ',       value: detailRec.Received_Date ? format(new Date(detailRec.Received_Date), 'dd/MM/yyyy') : null },
            { label: 'อัปเดตล่าสุด',   value: detailRec.LastUpdated ? format(new Date(detailRec.LastUpdated), 'dd/MM/yyyy') : null },
          ].filter(f => f.value)},
          { label: 'ราคา', fields: [
            { label: 'จำนวน',          value: detailRec.Qty },
            { label: 'ราคาต่อหน่วย',   value: detailRec.UnitPrice ? `฿${Number(detailRec.UnitPrice).toLocaleString()}` : null },
            { label: 'ราคารวม',        value: detailRec.Total_Amount ? `฿${Number(detailRec.Total_Amount).toLocaleString()}` : null },
          ].filter(f => f.value)},
          { label: 'หมายเหตุ', single: true, fields: [
            { label: 'หมายเหตุ', value: stripHiddenNoteMeta(detailRec.Note), full: true },
          ].filter(f => f.value)},
        ].filter(g => g.fields.length > 0) : []}
      />

      <Modal open={modal} onClose={() => setModal(false)}
        title={form._id ? t('po_edit') : t('po_create')} size="lg"
        footer={<>
          <button className="btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? t('saving') : t('save')}</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <F form={form} setForm={setForm} label="เลข PO" id="PO_Number" />
          <F form={form} setForm={setForm} label="สถานะ" id="Status" opts={PO_STATUS} useBuilder={false} />
          <F form={form} setForm={setForm} label="วันที่สั่ง" id="Order_Date" type="date" />
          <F form={form} setForm={setForm} label="วันที่รับ" id="Received_Date" type="date" />
          <div>
            <label className="label">รหัสอะไหล่ *</label>
            <input
              className="input"
              list="po-part-codes"
              value={form.Part_Code || ''}
              onChange={(e) => applyPartToForm(e.target.value)}
            />
            <datalist id="po-part-codes">
              {parts.map((part) => (
                <option key={part.id || part.Part_Code} value={part.Part_Code}>
                  {part.Part_Name_EN || part.Part_Name_TH || part.Part_Code}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">ชื่ออะไหล่</label>
            <input
              className="input"
              list="po-part-names"
              value={form.Part_Name_EN || ''}
              onChange={(e) => applyPartNameToForm(e.target.value)}
            />
            <datalist id="po-part-names">
              {[...new Set(parts.map((part) => part.Part_Name_EN).filter(Boolean))].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="col-span-2">
            <F form={form} setForm={setForm} label="รายละเอียด" id="Detail" />
          </div>
          <F form={form} setForm={setForm} label="หมวดหมู่" id="Category" opts={CATEGORY_OPTIONS} />
          <F form={form} setForm={setForm} label="จำนวน" id="Qty" type="number" />
          <F form={form} setForm={setForm} label="ราคาต่อหน่วย" id="UnitPrice" type="number" />
          <F form={form} setForm={setForm} label="ราคารวม (อัตโนมัติ)" id="Total_Amount" type="number" />
          <F form={form} setForm={setForm} label="แหล่งที่มา" id="Supplier" />
          <F form={form} setForm={setForm} label="โทรศัพท์" id="Phone" />
          <F form={form} setForm={setForm} label="อีเมล" id="Email" />
          <F form={form} setForm={setForm} label="ไลน์" id="Line" />
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
            <label className="label">หมายเหตุ</label>
            <textarea
              className="input"
              rows={2}
              value={stripHiddenNoteMeta(form.Note)}
              onChange={(e) => setForm((prev) => ({ ...prev, Note: preserveCommentWithPOMeta(e.target.value, prev) }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
