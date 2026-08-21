import { useMemo, useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Check,
  X,
  Layers,
  Sparkles,
  Phone,
  Mail,
  User,
  Building,
} from 'lucide-react'
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
  ORDERED: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#2563eb', dot: '#2563eb' },
  RECEIVED: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#059669', dot: '#059669' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#dc2626', dot: '#dc2626' },
}
const STATUS_TH = Object.fromEntries(PO_STATUS.map((s) => [s.value, s.label]))
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
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: cfg.bg || 'var(--bg-card)',
        border: `1px solid ${cfg.border || 'var(--border)'}`,
        color: cfg.color || 'var(--text-500)',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot || 'currentColor', flexShrink: 0 }} />
      {STATUS_TH[value] || value}
    </span>
  )
}

const getPOFallbackCols = () => [
  { field: 'PO_Number', label: 'เลข PO', type: 'text' },
  { field: 'Order_Date', label: 'วันที่สั่ง', type: 'date' },
  { field: 'Received_Date', label: 'วันที่รับ', type: 'date' },
  { field: 'Status', label: 'สถานะ', type: 'select' },
  { field: 'Part_Code', label: 'รหัสอะไหล่', type: 'text', width: '130px' },
  { field: 'Part_Name_EN', label: 'ชื่ออะไหล่', type: 'text', width: '180px' },
  { field: 'Category', label: 'หมวดหมู่', type: 'select', width: '140px', options: CATEGORY_OPTIONS },
  { field: 'Detail', label: 'รายละเอียด', type: 'text' },
  { field: 'Qty', label: 'จำนวน', type: 'number' },
  { field: 'UnitPrice', label: 'ราคาต่อหน่วย', type: 'number' },
  { field: 'Total_Amount', label: 'ราคารวม', type: 'number' },
  { field: 'Supplier', label: 'แหล่งที่มา', type: 'text' },
  { field: 'Phone', label: 'โทรศัพท์', type: 'text' },
  { field: 'Email', label: 'อีเมล', type: 'text' },
  { field: 'Line', label: 'ไลน์', type: 'text' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Note', label: 'หมายเหตุ', type: 'text', width: '220px' },
  { field: 'LastUpdated', label: 'อัปเดตล่าสุด', type: 'date' },
]

const REQUIRED_PO_COLUMNS = [
  { field: 'PO_Number', label: 'เลข PO' },
  { field: 'Order_Date', label: 'วันที่สั่ง' },
  { field: 'Received_Date', label: 'วันที่รับ' },
  { field: 'Status', label: 'สถานะ' },
  { field: 'Part_Code', label: 'รหัสอะไหล่', width: '130px' },
  { field: 'Part_Name_EN', label: 'ชื่ออะไหล่', width: '180px' },
  { field: 'Category', label: 'หมวดหมู่', width: '140px' },
  { field: 'Detail', label: 'รายละเอียด' },
  { field: 'Qty', label: 'จำนวน' },
  { field: 'UnitPrice', label: 'ราคาต่อหน่วย' },
  { field: 'Total_Amount', label: 'ราคารวม' },
  { field: 'Supplier', label: 'แหล่งที่มา' },
  { field: 'Phone', label: 'โทรศัพท์' },
  { field: 'Email', label: 'อีเมล' },
  { field: 'Line', label: 'ไลน์' },
  { field: 'ImageUrl', label: 'URL', width: '220px' },
  { field: 'ImagePreview', label: 'รูป', width: '110px' },
  { field: 'Note', label: 'หมายเหตุ', width: '220px' },
  { field: 'LastUpdated', label: 'อัปเดตล่าสุด' },
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
    (col.field === 'Note' ? { ...col, width: urlWidth } : col)
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

function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

function getMissingPurchaseOrderColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || null
}

const EMPTY = {
  PO_Number: '',
  Supplier: '',
  Status: 'ORDERED',
  Order_Date: '',
  Received_Date: '',
  Detail: '',
  Qty: '',
  UnitPrice: '',
  Total_Amount: '',
  Phone: '',
  Email: '',
  Line: '',
  Note: '',
  LastUpdated: '',
  Part_Code: '',
  Part_Name_EN: '',
  Category: '',
  ImageUrl: '',
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
  const [detailRec, setDetailRec] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  // Summary statistics
  const stats = useMemo(() => {
    const total = data.length
    const ordered = data.filter((p) => p.Status === 'ORDERED').length
    const received = data.filter((p) => p.Status === 'RECEIVED').length
    const totalAmount = data.reduce((acc, p) => acc + (Number(p.Total_Amount) || 0), 0)
    return { total, ordered, received, totalAmount }
  }, [data])

  const baseRows = useMemo(() => {
    return data.filter((p) =>
      [p.PO_Number, p.Supplier, getPOPartCode(p), getPOPartName(p), getPOCategory(p), p.Detail, stripHiddenNoteMeta(p.Note)].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    )
  }, [data, search])

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
    if (qty > 0 && price > 0) {
      setForm((p) => ({ ...p, Total_Amount: qty * price }))
    }
  }, [form.Qty, form.UnitPrice])

  const openNew = () => {
    setForm(EMPTY)
    setModal(true)
  }

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
      toast.success('อัปโหลดรูปสำเร็จ', `บันทึกไว้ในโฟลเดอร์ ${PURCHASE_IMAGE_FOLDER}`)
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
      Performed_By: 'System (PO)',
      Note: `อัปเดตสต๊อกจากใบสั่งซื้อ ${po.PO_Number || ''} (${delta >= 0 ? '+' : ''}${delta})`,
      created_date: now.toISOString(),
    })
  }

  const syncInventoryOnStatusChange = async (nextForm, currentRecord) => {
    const nextStatus = nextForm.Status
    const previousStatus = currentRecord?.Status || 'ORDERED'
    const targetPartCode = getPOPartCode(nextForm) || getPOAppliedPartCode(currentRecord)
    if (!targetPartCode) return nextForm

    const previousAppliedQty = getPOAppliedQty(currentRecord)
    const targetQty = toNumber(nextForm.Qty)
    let appliedQtyDelta = 0
    let nextAppliedQty = previousAppliedQty

    if (nextStatus === 'RECEIVED') {
      if (previousStatus === 'RECEIVED') {
        appliedQtyDelta = targetQty - previousAppliedQty
        nextAppliedQty = targetQty
      } else {
        appliedQtyDelta = targetQty
        nextAppliedQty = targetQty
      }
    } else if (previousStatus === 'RECEIVED') {
      appliedQtyDelta = -previousAppliedQty
      nextAppliedQty = 0
    }

    if (appliedQtyDelta !== 0) {
      await updateSparePartStock(targetPartCode, appliedQtyDelta, nextForm)
      await loadParts()
    }

    return {
      ...nextForm,
      Note: appendPOMetaToNote(nextForm.Note, {
        imageUrl: getPOImageUrl(nextForm),
        category: getPOCategory(nextForm),
        partCode: getPOPartCode(nextForm),
        partName: getPOPartName(nextForm),
        appliedQty: nextAppliedQty,
        appliedPartCode: targetPartCode,
      }),
    }
  }

  const submit = async () => {
    if (!form.PO_Number) {
      toast.warning('กรุณากรอกข้อมูล', 'เลข PO จำเป็นต้องกรอก')
      return
    }
    setSaving(true)
    const isEdit = !!(form._id || form.id)
    const currentRecord = isEdit ? data.find((item) => (item.id || item._id) === (form.id || form._id)) : null
    try {
      const syncedForm = await syncInventoryOnStatusChange(form, currentRecord)
      const payload = buildPurchasePayload({
        ...syncedForm,
        LastUpdated: format(new Date(), 'yyyy-MM-dd'),
      })
      const { removedColumns } = await saveWithColumnFallback(payload)
      if (removedColumns.length > 0) {
        toast.warning(
          isEdit ? 'แก้ไขใบสั่งซื้อสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)' : 'เพิ่มใบสั่งซื้อสำเร็จ (บางคอลัมน์บันทึกลงหมายเหตุ)',
          `คอลัมน์ที่ฐานข้อมูลยังไม่มี: ${removedColumns.join(', ')}`
        )
      } else {
        toast.success(
          isEdit ? 'แก้ไขใบสั่งซื้อสำเร็จ' : 'เพิ่มใบสั่งซื้อสำเร็จ',
          `PO: ${form.PO_Number}`
        )
      }
      setModal(false)
      await load()
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('ยืนยันการลบใบสั่งซื้อนี้?')) return
    try {
      await remove(id)
      toast.success('ลบใบสั่งซื้อสำเร็จ')
    } catch (e) {
      toast.error('เกิดข้อผิดพลาด', e.message)
    }
  }

  const renderCellContent = (row, col) => {
    const val = col.field === 'ImageUrl' || col.field === 'ImagePreview'
      ? getPOImageUrl(row)
      : col.field === 'Part_Code'
        ? getPOPartCode(row)
        : col.field === 'Part_Name_EN'
          ? getPOPartName(row)
          : col.field === 'Category'
            ? getPOCategory(row)
            : row[col.field]

    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
    }

    if (col.field === 'PO_Number') {
      return (
        <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
          {String(val)}
        </span>
      )
    }

    if (col.field === 'Status') {
      return <StatusPill value={val} />
    }

    if (col.field === 'Part_Code') {
      return <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{String(val)}</span>
    }

    if (col.field === 'Part_Name_EN') {
      return <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
    }

    if (col.field === 'Total_Amount' || col.field === 'UnitPrice') {
      return <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">฿{Number(val).toLocaleString()}</span>
    }

    if (col.field === 'Qty') {
      return <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{Number(val).toLocaleString()}</span>
    }

    if (col.type === 'date' || col.field.includes('Date') || col.field === 'LastUpdated') {
      try {
        return <span className="font-mono text-slate-500 text-[11px]">{format(new Date(val), 'dd/MM/yy')}</span>
      } catch {
        return <span className="font-mono text-slate-500 text-[11px]">{String(val)}</span>
      }
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
      const imgUrl = String(val)
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setPreviewImageModal({ url: imgUrl, title: `PO: ${row.PO_Number}` })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all border border-blue-500/20"
          >
            <ImageIcon size={13} />
            <span>เปิดรูป</span>
          </button>
        </div>
      )
    }

    if (col.field === 'Note') {
      return <span className="text-slate-500 truncate max-w-[200px] block">{stripHiddenNoteMeta(val)}</span>
    }

    return <span className="text-slate-700 dark:text-slate-300 text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-5">
      {/* ── SUMMARY STATS CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ใบสั่งซื้อทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingCart size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รอรับสินค้า (Ordered)</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.ordered} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รับสินค้าแล้ว (Received)</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.received} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">มูลค่าสั่งซื้อรวม</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              ฿{stats.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ค้นหา เลข PO / รหัสอะไหล่ / ชื่ออะไหล่ / ผู้จัดจำหน่าย..."
            className="w-full sm:w-80"
          />
          <FilterSortPanel cols={FS_COLS} value={filterSort} onChange={setFilterSort} />
          <GoogleSheetSyncButton
            sheetName="จัดซื้อ"
            columns={cols}
            rows={displayRows}
            valueGetters={{
              Part_Code: getPOPartCode,
              Part_Name_EN: getPOPartName,
              Category: getPOCategory,
              ImageUrl: getPOImageUrl,
              ImagePreview: getPOImageUrl,
              Note: (row) => stripHiddenNoteMeta(row.Note),
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
            title={t('refresh')}
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
              <span>สร้างใบสั่งซื้อ</span>
            </button>
          )}
        </div>
      </div>

      {/* ── DATA TABLE ────────────────────────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                {cols.map((c) => (
                  <th key={c.field} style={getColumnWidthStyle(c)} className="py-3 px-3 text-left whitespace-nowrap">
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
              {!loading && displayRows.map((p, i) => (
                <tr
                  key={p._id || p.id || i}
                  onClick={() => setDetailRec(p)}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c.field} style={getColumnWidthStyle(c)} className="py-2.5 px-3 whitespace-nowrap">
                      {renderCellContent(p, c)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขใบสั่งซื้อ"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(p._id || p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="ลบใบสั่งซื้อ"
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
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ สร้างใบสั่งซื้อ" เพื่อเริ่มต้นบันทึก</p>
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
        title={detailRec?.PO_Number}
        subtitle={detailRec ? `${getPOPartCode(detailRec)} · ${getPOPartName(detailRec)}` : ''}
        icon={ShoppingCart}
        accentColor="#2563eb"
        badge={detailRec && <StatusPill value={detailRec.Status} />}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => openEdit(detailRec)}
        onDelete={() => {
          del(detailRec._id || detailRec.id)
          setDetailRec(null)
        }}
        groups={detailRec ? [
          {
            label: 'ข้อมูลใบสั่งซื้อ',
            fields: [
              { label: 'เลข PO', value: detailRec.PO_Number, mono: true },
              { label: 'วันที่สั่ง', value: detailRec.Order_Date },
              { label: 'วันที่รับ', value: detailRec.Received_Date },
              { label: 'รหัสอะไหล่', value: getPOPartCode(detailRec), mono: true },
              { label: 'ชื่ออะไหล่', value: getPOPartName(detailRec) },
              { label: 'หมวดหมู่', value: getPOCategory(detailRec) },
              { label: 'รายละเอียด', value: detailRec.Detail },
              { label: 'ลิงก์รูปภาพ', value: getPOImageUrl(detailRec), full: true },
            ].filter((f) => f.value),
          },
          {
            label: 'จำนวนและยอดเงิน',
            fields: [
              { label: 'จำนวน', value: detailRec.Qty },
              { label: 'ราคาต่อหน่วย', value: detailRec.UnitPrice ? `฿${Number(detailRec.UnitPrice).toLocaleString()}` : null },
              { label: 'ราคารวม', value: detailRec.Total_Amount ? `฿${Number(detailRec.Total_Amount).toLocaleString()}` : null },
            ].filter((f) => f.value),
          },
          {
            label: 'ผู้จัดจำหน่าย & ติดต่อ',
            fields: [
              { label: 'แหล่งที่มา/ผู้จัดจำหน่าย', value: detailRec.Supplier },
              { label: 'โทรศัพท์', value: detailRec.Phone },
              { label: 'อีเมล', value: detailRec.Email },
              { label: 'LINE', value: detailRec.Line },
            ].filter((f) => f.value),
          },
          {
            label: 'หมายเหตุ',
            single: true,
            fields: [
              { label: 'หมายเหตุ', value: stripHiddenNoteMeta(detailRec.Note), full: true },
            ].filter((f) => f.value),
          },
        ].filter((g) => g.fields.length > 0) : []}
      />

      {/* ── ADD / EDIT MODAL ──────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลใบสั่งซื้อ' : '➕ สร้างใบสั่งซื้อใหม่'}
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
          {/* Section 1: PO Header */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <ShoppingCart size={14} className="text-blue-500" />
              <span>ข้อมูลใบสั่งซื้อและสถานะ</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label="เลข PO *" id="PO_Number" placeholder="เช่น PO-2026-001" />
              <F form={form} setForm={setForm} label="สถานะ" id="Status" opts={PO_STATUS} />
              <F form={form} setForm={setForm} label="วันที่สั่ง" id="Order_Date" type="date" />
              <F form={form} setForm={setForm} label="วันที่รับ" id="Received_Date" type="date" />
            </div>
          </div>

          {/* Section 2: Part & Price */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-blue-500" />
                <span>รายการอะไหล่และราคา</span>
              </div>
              {parts?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">เลือกจากอะไหล่ที่มี:</span>
                  <select
                    className="select text-[11px] py-0.5 px-2 max-w-[180px]"
                    onChange={(e) => applyPartToForm(e.target.value)}
                    value=""
                  >
                    <option value="">— เลือกอะไหล่ —</option>
                    {parts.map((p) => (
                      <option key={p.Part_Code} value={p.Part_Code}>
                        {p.Part_Code} - {p.Part_Name_EN}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <F form={form} setForm={setForm} label="รหัสอะไหล่" id="Part_Code" placeholder="เช่น SP-001" />
              <F form={form} setForm={setForm} label="ชื่ออะไหล่" id="Part_Name_EN" placeholder="ชื่ออะไหล่" />
              <F form={form} setForm={setForm} label="หมวดหมู่" id="Category" opts={CATEGORY_OPTIONS} />
              <F form={form} setForm={setForm} label="จำนวน" id="Qty" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label="ราคาต่อหน่วย" id="UnitPrice" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label="ราคารวม" id="Total_Amount" type="number" placeholder="0" />
              <div className="sm:col-span-3">
                <F form={form} setForm={setForm} label="รายละเอียดเพิ่มเติมของรายการ" id="Detail" placeholder="สเปกเฉพาะ หรือข้อกำหนดการจัดซื้อ" />
              </div>
            </div>
          </div>

          {/* Section 3: Supplier */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Building size={14} className="text-emerald-500" />
              <span>ผู้จัดจำหน่ายและช่องทางติดต่อ</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <F form={form} setForm={setForm} label="ผู้จัดจำหน่าย/แหล่งที่มา" id="Supplier" placeholder="ชื่อบริษัทหรือร้านค้า" />
              <F form={form} setForm={setForm} label="เบอร์โทรศัพท์" id="Phone" placeholder="02-xxx-xxxx" />
              <F form={form} setForm={setForm} label="อีเมล" id="Email" placeholder="supplier@example.com" />
              <F form={form} setForm={setForm} label="LINE ID" id="Line" placeholder="LINE ID" />
            </div>
          </div>

          {/* Section 4: Photo & Note */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายบิล/เอกสาร & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปเอกสาร PO เข้า Google Drive</label>
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
                  label="หมายเหตุ (Note)"
                  id="Note"
                  placeholder="ข้อคิดเห็น หรือบันทึกเพิ่มเติม"
                  onChange={(value) => setForm((p) => ({
                    ...p,
                    Note: appendPOMetaToNote(value, {
                      imageUrl: getPOImageUrl(p),
                      category: getPOCategory(p),
                      partCode: getPOPartCode(p),
                      partName: getPOPartName(p),
                      appliedQty: getPOAppliedQty(p),
                      appliedPartCode: getPOAppliedPartCode(p),
                    }),
                  }))}
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
