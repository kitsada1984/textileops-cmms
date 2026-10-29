import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
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
  Tag,
  Package,
  PackageCheck,
  Phone,
  Mail,
  User,
  Building,
  FileText,
  Ban,
  AlertTriangle,
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
import SearchableDropdown from '../components/ui/SearchableDropdown'
import FilterSortPanel, { INIT_FS } from '../components/ui/FilterSortPanel'
import GoogleSheetSyncButton from '../components/ui/GoogleSheetSyncButton'
import { uploadMedia } from '../modules/media'
import { generateStockTxnId, getPartStockStatus, toNumber, generatePartCode } from '../utils/inventory'
import { appendSparePartImageMeta, getSparePartImageUrl } from '../utils/sparePartImage'
import { useSparePartCategories, DEFAULT_SPARE_PART_CATEGORIES } from '../modules/sparePart'
import {
  buildStockMovementPartCodeOptions,
  buildStockMovementPartNameOptions,
  findMatchingSparePart,
} from '../utils/stockMovementMC'
import { applyFilterSort, buildFilterSortColumns } from '../utils/filterSort'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generatePurchasingPdfProps } from '../utils/pdfDocGenerators'
import ImagePreviewModal from '../components/ui/ImagePreviewModal'
import ImageThumbnail from '../components/ui/ImageThumbnail'

const STATUS_CFG = {
  ORDERED: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#2563eb', dot: '#2563eb' },
  RECEIVED: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#059669', dot: '#059669' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#dc2626', dot: '#dc2626' },
}
const STATUS_TH = Object.fromEntries(PO_STATUS.map((s) => [s.value, s.label]))
const CATEGORY_OPTIONS = DEFAULT_SPARE_PART_CATEGORIES
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'purchaseorders'/i
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const CATEGORY_NOTE_PREFIX = 'Category:'
const PART_CODE_NOTE_PREFIX = 'PartCode:'
const PART_NAME_NOTE_PREFIX = 'PartName:'
const APPLIED_QTY_NOTE_PREFIX = 'InventoryAppliedQty:'
const APPLIED_PART_NOTE_PREFIX = 'InventoryAppliedPartCode:'
const APPLIED_ITEMS_NOTE_PREFIX = 'InventoryAppliedItems:'
const PO_NUMERIC_FIELDS = ['Qty', 'UnitPrice', 'Total_Amount']
const HIDDEN_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  CATEGORY_NOTE_PREFIX,
  PART_CODE_NOTE_PREFIX,
  PART_NAME_NOTE_PREFIX,
  APPLIED_QTY_NOTE_PREFIX,
  APPLIED_PART_NOTE_PREFIX,
  APPLIED_ITEMS_NOTE_PREFIX,
]
const PURCHASE_IMAGE_FOLDER = 'จัดซื้อ'

export function createEmptyPOItem(overrides = {}) {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    Part_Code: '',
    Part_Name_EN: '',
    Category: '',
    Qty: 1,
    UnitPrice: '',
    Total_Amount: '',
    Detail: '',
    ...overrides,
  }
}

export function parsePOItems(row = {}) {
  if (!row) return []

  if (Array.isArray(row.Items)) {
    return row.Items.map((item, idx) => ({
      id: item.id || `item-${idx}`,
      Part_Code: item.Part_Code || '',
      Part_Name_EN: item.Part_Name_EN || item.ItemName || '',
      Category: item.Category || '',
      Qty: Number(item.Qty) || 1,
      UnitPrice: item.UnitPrice !== undefined && item.UnitPrice !== null ? item.UnitPrice : '',
      Total_Amount: item.Total_Amount !== undefined && item.Total_Amount !== null ? item.Total_Amount : '',
      Detail: item.Detail || '',
    }))
  }

  if (typeof row.Items === 'string' && row.Items.trim()) {
    try {
      const parsed = JSON.parse(row.Items)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: item.id || `item-${idx}`,
          Part_Code: item.Part_Code || '',
          Part_Name_EN: item.Part_Name_EN || item.ItemName || '',
          Category: item.Category || '',
          Qty: Number(item.Qty) || 1,
          UnitPrice: item.UnitPrice !== undefined && item.UnitPrice !== null ? item.UnitPrice : '',
          Total_Amount: item.Total_Amount !== undefined && item.Total_Amount !== null ? item.Total_Amount : '',
          Detail: item.Detail || '',
        }))
      }
    } catch {
      // fallback to legacy single item
    }
  }

  const partCode = getPOPartCode(row)
  const partName = getPOPartName(row)
  const category = getPOCategory(row)
  const qty = row.Qty !== undefined && row.Qty !== null && row.Qty !== '' ? Number(row.Qty) : 1
  const unitPrice = row.UnitPrice !== undefined && row.UnitPrice !== null ? row.UnitPrice : ''
  const totalAmount = row.Total_Amount !== undefined && row.Total_Amount !== null ? row.Total_Amount : ''
  const detail = row.Detail || ''

  if (partCode || partName || row.PO_Number) {
    return [
      {
        id: 'legacy-item-0',
        Part_Code: partCode,
        Part_Name_EN: partName,
        Category: category,
        Qty: qty,
        UnitPrice: unitPrice,
        Total_Amount: totalAmount,
        Detail: detail,
      },
    ]
  }

  return []
}

export function calculatePOTotals(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { totalQty: 0, totalAmount: 0 }
  }
  let totalQty = 0
  let totalAmount = 0
  items.forEach((item) => {
    const q = Number(item.Qty) || 0
    const p = Number(item.UnitPrice) || 0
    const rowTotal = item.Total_Amount !== undefined && item.Total_Amount !== null && item.Total_Amount !== ''
      ? Number(item.Total_Amount)
      : (q * p)
    totalQty += q
    totalAmount += rowTotal
  })
  return { totalQty, totalAmount }
}

function StatusPill({ value, row }) {
  const cfg = STATUS_CFG[value] || {}
  const appliedItems = row ? getPOAppliedItems(row) : {}
  const items = row ? parsePOItems(row) : []
  const appliedCount = Object.keys(appliedItems).filter((k) => toNumber(appliedItems[k]) > 0).length
  const totalCount = items.length

  const isPartial = value === 'ORDERED' && totalCount > 0 && appliedCount > 0 && appliedCount < totalCount

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: isPartial ? 'rgba(245, 158, 11, 0.12)' : (cfg.bg || 'var(--bg-card)'),
        border: `1px solid ${isPartial ? 'rgba(245, 158, 11, 0.35)' : (cfg.border || 'var(--border)')}`,
        color: isPartial ? '#d97706' : (cfg.color || 'var(--text-500)'),
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPartial ? '#d97706' : (cfg.dot || 'currentColor'), flexShrink: 0 }} />
      {isPartial ? `รอของ (รับแล้ว ${appliedCount}/${totalCount})` : (STATUS_TH[value] || value)}
    </span>
  )
}

export const getPOFallbackCols = (categoryOpts = DEFAULT_SPARE_PART_CATEGORIES) => [
  { field: 'Part_Code', label: 'รหัสอะไหล่', type: 'text', width: '130px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Part_Name_EN', label: 'ชื่ออะไหล่', type: 'text', width: '180px' },
  { field: 'Category', label: 'หมวดหมู่', type: 'select', width: '140px', options: categoryOpts },
  { field: 'PO_Number', label: 'เลข PO', type: 'text' },
  { field: 'Status', label: 'สถานะ', type: 'select' },
  { field: 'Qty', label: 'จำนวน', type: 'number' },
  { field: 'UnitPrice', label: 'ราคาต่อหน่วย', type: 'number' },
  { field: 'Total_Amount', label: 'ราคารวม', type: 'number' },
  { field: 'Order_Date', label: 'วันที่สั่ง', type: 'date' },
  { field: 'Received_Date', label: 'วันที่รับ', type: 'date' },
  { field: 'Supplier', label: 'แหล่งที่มา', type: 'text' },
  { field: 'Detail', label: 'รายละเอียด', type: 'text' },
  { field: 'Phone', label: 'โทรศัพท์', type: 'text' },
  { field: 'Email', label: 'อีเมล', type: 'text' },
  { field: 'Line', label: 'ไลน์', type: 'text' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'Note', label: 'หมายเหตุ', type: 'text', width: '220px' },
  { field: 'LastUpdated', label: 'อัปเดตล่าสุด', type: 'date' },
]

export const REQUIRED_PO_COLUMNS = [
  { field: 'Part_Code', label: 'รหัสอะไหล่', width: '130px' },
  { field: 'ImagePreview', label: 'รูป', width: '110px' },
  { field: 'Part_Name_EN', label: 'ชื่ออะไหล่', width: '180px' },
  { field: 'Category', label: 'หมวดหมู่', width: '140px' },
  { field: 'PO_Number', label: 'เลข PO' },
  { field: 'Status', label: 'สถานะ' },
  { field: 'Qty', label: 'จำนวน' },
  { field: 'UnitPrice', label: 'ราคาต่อหน่วย' },
  { field: 'Total_Amount', label: 'ราคารวม' },
  { field: 'Order_Date', label: 'วันที่สั่ง' },
  { field: 'Received_Date', label: 'วันที่รับ' },
  { field: 'Supplier', label: 'แหล่งที่มา' },
  { field: 'Detail', label: 'รายละเอียด' },
  { field: 'Phone', label: 'โทรศัพท์' },
  { field: 'Email', label: 'อีเมล' },
  { field: 'Line', label: 'ไลน์' },
  { field: 'ImageUrl', label: 'URL', width: '220px' },
  { field: 'Note', label: 'หมายเหตุ', width: '220px' },
  { field: 'LastUpdated', label: 'อัปเดตล่าสุด' },
]

export function resolvePOColumns(wbCols, categoryOpts = DEFAULT_SPARE_PART_CATEGORIES) {
  const fallbackCols = getPOFallbackCols(categoryOpts)
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
  return resolvedCols.map((col) => {
    if (col.field === 'Category') return { ...col, type: 'select', options: categoryOpts }
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
  appliedItems = '',
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
    appliedItems ? `${APPLIED_ITEMS_NOTE_PREFIX} ${appliedItems}` : '',
  ].filter(Boolean).join('\n')
}

function getPOImageUrl(row) {
  if (!row) return ''
  return row.ImageUrl || extractHiddenNoteValue(row.Note, IMAGE_NOTE_PREFIX) || ''
}

function getPOCategory(row) {
  if (!row) return ''
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

function getPOPartCode(row) {
  if (!row) return ''
  return row.Part_Code || extractHiddenNoteValue(row.Note, PART_CODE_NOTE_PREFIX) || ''
}

function getPOPartName(row) {
  if (!row) return ''
  return row.Part_Name_EN || extractHiddenNoteValue(row.Note, PART_NAME_NOTE_PREFIX) || row.Detail || ''
}

function getPOAppliedQty(row) {
  if (!row) return 0
  return toNumber(extractHiddenNoteValue(row.Note, APPLIED_QTY_NOTE_PREFIX))
}

function getPOAppliedPartCode(row) {
  if (!row) return ''
  return extractHiddenNoteValue(row.Note, APPLIED_PART_NOTE_PREFIX) || getPOPartCode(row)
}

export function getPOAppliedItems(row) {
  if (!row) return {}
  const raw = extractHiddenNoteValue(row.Note, APPLIED_ITEMS_NOTE_PREFIX)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }
  const legacyCode = getPOAppliedPartCode(row)
  const legacyQty = getPOAppliedQty(row)
  if (legacyCode && legacyQty > 0) {
    return { [legacyCode]: legacyQty }
  }
  return {}
}

function normalizePONumericFields(payload = {}) {
  return PO_NUMERIC_FIELDS.reduce((nextPayload, field) => ({
    ...nextPayload,
    [field]: toNumber(nextPayload[field]),
  }), { ...payload })
}

export function buildPurchasePayload(form = {}) {
  const items = Array.isArray(form.Items) && form.Items.length > 0
    ? form.Items
    : parsePOItems(form)
  const { totalQty, totalAmount } = calculatePOTotals(items)

  const firstItem = items[0] || {}
  const primaryPartCode = firstItem.Part_Code || form.Part_Code || ''
  const primaryPartName = firstItem.Part_Name_EN || form.Part_Name_EN || ''
  const primaryCategory = firstItem.Category || form.Category || ''

  let detailSummary = form.Detail || ''
  if (items.length > 1) {
    const names = items.map((it) => it.Part_Code || it.Part_Name_EN).filter(Boolean)
    const itemsPreview = names.slice(0, 2).join(', ')
    detailSummary = `${itemsPreview} (+${items.length} รายการ)`
  } else if (!detailSummary && (primaryPartName || primaryPartCode)) {
    detailSummary = primaryPartName || primaryPartCode
  }

  const itemsJson = items.length > 0 ? JSON.stringify(items) : null

  return normalizePONumericFields({
    ...omitKeys(form, ['ImageUrl', 'Part_Code', 'Part_Name_EN']),
    Qty: totalQty || toNumber(form.Qty),
    Total_Amount: totalAmount || toNumber(form.Total_Amount),
    UnitPrice: firstItem.UnitPrice !== undefined && firstItem.UnitPrice !== null ? toNumber(firstItem.UnitPrice) : toNumber(form.UnitPrice),
    Detail: detailSummary,
    Items: itemsJson,
    Note: appendPOMetaToNote(form.Note, {
      imageUrl: getPOImageUrl(form),
      category: primaryCategory || getPOCategory(form),
      partCode: primaryPartCode || getPOPartCode(form),
      partName: primaryPartName || getPOPartName(form),
      appliedQty: getPOAppliedQty(form),
      appliedPartCode: getPOAppliedPartCode(form),
      appliedItems: extractHiddenNoteValue(form.Note, APPLIED_ITEMS_NOTE_PREFIX),
    }),
  })
}

export function buildQuickReceivePayload({ po, receivedDate, note = '', selectedItemCodes = null } = {}) {
  if (!po) return null
  const items = parsePOItems(po)
  const cleanNote = stripHiddenNoteMeta(po.Note || '')
  const previouslyApplied = getPOAppliedItems(po)

  const allCodes = items.map((it) => String(it.Part_Code || '').trim()).filter(Boolean)

  const effectiveSelectedCodes = Array.isArray(selectedItemCodes)
    ? selectedItemCodes.map((c) => String(c).trim()).filter(Boolean)
    : allCodes.filter((c) => !previouslyApplied[c] || previouslyApplied[c] <= 0)

  const combinedReceivedCodes = new Set([
    ...Object.keys(previouslyApplied).filter((k) => previouslyApplied[k] > 0),
    ...effectiveSelectedCodes,
  ])

  const isAllReceived = allCodes.length > 0 && allCodes.every((c) => combinedReceivedCodes.has(c))
  const isPartial = !isAllReceived && effectiveSelectedCodes.length > 0

  let summaryText = ''
  if (isPartial) {
    const noteText = note && note.trim() ? `: ${note.trim()}` : ''
    summaryText = `[รับของบางส่วนเมื่อ ${receivedDate} (${effectiveSelectedCodes.length}/${allCodes.length} รายการ)]${noteText}`
  } else if (note && note.trim()) {
    summaryText = `[รับของเมื่อ ${receivedDate}]: ${note.trim()}`
  }

  const nextNote = summaryText
    ? (cleanNote ? `${cleanNote}\n${summaryText}` : summaryText)
    : cleanNote

  return {
    ...po,
    Status: isAllReceived ? 'RECEIVED' : (po.Status || 'ORDERED'),
    Received_Date: receivedDate,
    Items: items,
    Note: appendPOMetaToNote(nextNote, {
      imageUrl: getPOImageUrl(po),
      category: getPOCategory(po),
      partCode: getPOPartCode(po),
      partName: getPOPartName(po),
      appliedQty: getPOAppliedQty(po),
      appliedPartCode: getPOAppliedPartCode(po),
      appliedItems: extractHiddenNoteValue(po.Note, APPLIED_ITEMS_NOTE_PREFIX),
    }),
  }
}

export function buildCancelPOPayload({ po, cancelDate, reason = '' } = {}) {
  if (!po) return null
  const cleanNote = stripHiddenNoteMeta(po.Note || '')
  const reasonText = reason && reason.trim() ? `: ${reason.trim()}` : ''
  const cancelLog = `[ยกเลิกใบสั่งซื้อเมื่อ ${cancelDate}]${reasonText}`
  const nextNote = cleanNote ? `${cleanNote}\n${cancelLog}` : cancelLog

  return {
    ...po,
    Status: 'CANCELLED',
    LastUpdated: cancelDate,
    Note: appendPOMetaToNote(nextNote, {
      imageUrl: getPOImageUrl(po),
      category: getPOCategory(po),
      partCode: getPOPartCode(po),
      partName: getPOPartName(po),
      appliedQty: getPOAppliedQty(po),
      appliedPartCode: getPOAppliedPartCode(po),
      appliedItems: extractHiddenNoteValue(po.Note, APPLIED_ITEMS_NOTE_PREFIX),
    }),
  }
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
  Items: [createEmptyPOItem()],
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
  const formTotals = useMemo(() => calculatePOTotals(form.Items), [form.Items])
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [filterSort, setFilterSort] = useState(INIT_FS)
  const [detailRec, setDetailRec] = useState(null)
  const [pdfItem, setPdfItem] = useState(null)
  const [previewImageModal, setPreviewImageModal] = useState(null)
  const [receiveItem, setReceiveItem] = useState(null)
  const [selectedReceiveCodes, setSelectedReceiveCodes] = useState([])
  const [receiveDate, setReceiveDate] = useState('')
  const [receiveNote, setReceiveNote] = useState('')
  const [receiving, setReceiving] = useState(false)
  const [cancelPOItem, setCancelPOItem] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingPO, setCancellingPO] = useState(false)

  // Summary statistics
  const stats = useMemo(() => {
    const total = data.length
    const ordered = data.filter((p) => p.Status === 'ORDERED').length
    const received = data.filter((p) => p.Status === 'RECEIVED').length
    const totalAmount = data.reduce((acc, p) => acc + (Number(p.Total_Amount) || 0), 0)
    return { total, ordered, received, totalAmount }
  }, [data])

  const baseRows = useMemo(() => {
    return data.filter((p) => {
      const items = parsePOItems(p)
      const itemTexts = items.map((it) => `${it.Part_Code} ${it.Part_Name_EN} ${it.Category} ${it.Detail}`).join(' ')
      return [
        p.PO_Number,
        p.Supplier,
        getPOPartCode(p),
        getPOPartName(p),
        getPOCategory(p),
        p.Detail,
        stripHiddenNoteMeta(p.Note),
        itemTexts,
      ].some((v) =>
        String(v || '').toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [data, search])

  const { categories: sparePartCategories } = useSparePartCategories(parts)

  const categoryOptions = useMemo(() => {
    const set = new Set(sparePartCategories || DEFAULT_SPARE_PART_CATEGORIES)
    if (Array.isArray(parts)) {
      parts.forEach((p) => {
        if (p?.Category && typeof p.Category === 'string' && p.Category.trim()) {
          set.add(p.Category.trim())
        }
      })
    }
    if (Array.isArray(data)) {
      data.forEach((row) => {
        const cat = getPOCategory ? getPOCategory(row) : (row?.Category || '')
        if (cat && cat !== '—') set.add(cat.trim())
      })
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
    )
  }, [sparePartCategories, parts, data])

  const partCodeOptions = useMemo(
    () => buildStockMovementPartCodeOptions(parts, data),
    [parts, data]
  )

  const partNameOptions = useMemo(
    () => buildStockMovementPartNameOptions(parts, data),
    [parts, data]
  )

  const wbCols = useWebBuilderMenu('/purchasing')
  const cols = useMemo(() => resolvePOColumns(wbCols, categoryOptions), [wbCols, categoryOptions])
  const FS_COLS = useMemo(() => buildFilterSortColumns(cols, {
    selectOptions: { Status: PO_STATUS, Category: categoryOptions },
    valueGetters: {
      Part_Code: getPOPartCode,
      Part_Name_EN: getPOPartName,
      Category: getPOCategory,
      ImageUrl: getPOImageUrl,
      ImagePreview: getPOImageUrl,
      Note: (row) => stripHiddenNoteMeta(row.Note),
    },
  }), [cols, categoryOptions])

  const displayRows = useMemo(() => applyFilterSort(baseRows, FS_COLS, filterSort), [baseRows, FS_COLS, filterSort])

  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // 1-Click Purchase Request from SpareParts
  useEffect(() => {
    const autoOpen = searchParams.get('autoOpen') === 'true' || location.state?.autoOpen
    const partCode = searchParams.get('partCode') || location.state?.partCode
    const partName = searchParams.get('partName') || location.state?.partName
    const qty = searchParams.get('qty') || location.state?.qty
    const price = searchParams.get('price') || location.state?.price
    const supplier = searchParams.get('supplier') || location.state?.supplier
    const category = searchParams.get('category') || location.state?.category

    if (autoOpen && (partCode || partName)) {
      const qtyNum = parseFloat(qty) || 1
      const priceNum = parseFloat(price) || 0
      const initialItem = createEmptyPOItem({
        Part_Code: partCode || '',
        Part_Name_EN: partName || '',
        Detail: partName || partCode || '',
        Qty: qtyNum,
        UnitPrice: priceNum || '',
        Total_Amount: qtyNum * priceNum,
        Category: category || 'อะไหล่',
      })
      setForm({
        ...EMPTY,
        PO_Number: `PO-${Date.now().toString().slice(-6)}`,
        Order_Date: format(new Date(), 'yyyy-MM-dd'),
        Part_Code: partCode || '',
        Part_Name_EN: partName || '',
        Detail: partName || partCode || '',
        Qty: qtyNum,
        UnitPrice: priceNum || '',
        Total_Amount: qtyNum * priceNum,
        Supplier: supplier || '',
        Category: category || 'อะไหล่',
        Items: [initialItem],
      })
      setModal(true)
      if (searchParams.get('autoOpen')) {
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, location.state])

  const openNew = () => {
    setForm({
      ...EMPTY,
      PO_Number: `PO-${Date.now().toString().slice(-6)}`,
      Order_Date: format(new Date(), 'yyyy-MM-dd'),
      Items: [createEmptyPOItem()],
    })
    setModal(true)
  }

  const openEdit = (p) => {
    const items = parsePOItems(p)
    const { totalQty, totalAmount } = calculatePOTotals(items)
    setForm({
      ...p,
      ImageUrl: getPOImageUrl(p),
      Category: getPOCategory(p),
      Part_Code: getPOPartCode(p),
      Part_Name_EN: getPOPartName(p),
      Items: items.length > 0 ? items : [createEmptyPOItem()],
      Qty: totalQty || p.Qty || '',
      Total_Amount: totalAmount || p.Total_Amount || '',
    })
    setModal(true)
    setDetailRec(null)
  }

  const handleAddItem = () => {
    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      const newItem = createEmptyPOItem({
        Category: prev.Category || 'อะไหล่',
      })
      const nextItems = [...currentItems, newItem]
      const { totalQty, totalAmount } = calculatePOTotals(nextItems)
      return {
        ...prev,
        Items: nextItems,
        Qty: totalQty,
        Total_Amount: totalAmount,
      }
    })
  }

  const handleRemoveItem = (index) => {
    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      if (currentItems.length <= 1) return prev
      currentItems.splice(index, 1)
      const { totalQty, totalAmount } = calculatePOTotals(currentItems)
      return {
        ...prev,
        Items: currentItems,
        Qty: totalQty,
        Total_Amount: totalAmount,
        Part_Code: currentItems[0]?.Part_Code || '',
        Part_Name_EN: currentItems[0]?.Part_Name_EN || '',
      }
    })
  }

  const handleItemFieldChange = (index, field, value) => {
    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      if (!currentItems[index]) return prev
      const updatedItem = { ...currentItems[index], [field]: value }
      if (field === 'Qty' || field === 'UnitPrice') {
        const q = field === 'Qty' ? toNumber(value) : toNumber(updatedItem.Qty)
        const p = field === 'UnitPrice' ? toNumber(value) : toNumber(updatedItem.UnitPrice)
        updatedItem.Total_Amount = q * p
      }
      currentItems[index] = updatedItem
      const { totalQty, totalAmount } = calculatePOTotals(currentItems)
      return {
        ...prev,
        Items: currentItems,
        Qty: totalQty,
        Total_Amount: totalAmount,
      }
    })
  }

  const handleItemPartCodeChange = (index, partCode) => {
    const code = String(partCode || '').trim()
    const part = code
      ? (findMatchingSparePart(parts, code) || parts.find((item) => String(item.Part_Code || '').toLowerCase() === code.toLowerCase()))
      : null

    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      if (!currentItems[index]) return prev
      const current = currentItems[index]
      const nextUnitPrice = part?.Unit_Price !== undefined && part?.Unit_Price !== null ? toNumber(part.Unit_Price) : current.UnitPrice
      const nextQty = toNumber(current.Qty) || 1
      const updatedItem = {
        ...current,
        Part_Code: code,
        Part_Name_EN: part ? (part.Part_Name_EN || part.Part_Name_TH || current.Part_Name_EN) : current.Part_Name_EN,
        Category: part?.Category || current.Category,
        UnitPrice: nextUnitPrice,
        Total_Amount: (toNumber(nextUnitPrice) * nextQty) || current.Total_Amount,
        Detail: current.Detail || (part ? (part.Part_Name_EN || part.Part_Name_TH || '') : ''),
      }
      currentItems[index] = updatedItem
      const { totalQty, totalAmount } = calculatePOTotals(currentItems)
      return {
        ...prev,
        Items: currentItems,
        Supplier: prev.Supplier || part?.Supplier || '',
        Qty: totalQty,
        Total_Amount: totalAmount,
        Part_Code: currentItems[0]?.Part_Code || '',
        Part_Name_EN: currentItems[0]?.Part_Name_EN || '',
      }
    })
  }

  const handleItemPartNameChange = (index, partName) => {
    const name = String(partName || '').trim()
    const part = name ? findMatchingSparePart(parts, name) : null

    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      if (!currentItems[index]) return prev
      const current = currentItems[index]
      let code = part?.Part_Code || current.Part_Code
      if (!part && !code && name) {
        code = generatePartCode(parts)
      }
      const nextUnitPrice = part?.Unit_Price !== undefined && part?.Unit_Price !== null ? toNumber(part.Unit_Price) : current.UnitPrice
      const nextQty = toNumber(current.Qty) || 1
      const updatedItem = {
        ...current,
        Part_Name_EN: name,
        Part_Code: code,
        Category: part?.Category || current.Category,
        UnitPrice: nextUnitPrice,
        Total_Amount: (toNumber(nextUnitPrice) * nextQty) || current.Total_Amount,
        Detail: current.Detail || name,
      }
      currentItems[index] = updatedItem
      const { totalQty, totalAmount } = calculatePOTotals(currentItems)
      return {
        ...prev,
        Items: currentItems,
        Supplier: prev.Supplier || part?.Supplier || '',
        Qty: totalQty,
        Total_Amount: totalAmount,
        Part_Code: currentItems[0]?.Part_Code || '',
        Part_Name_EN: currentItems[0]?.Part_Name_EN || '',
      }
    })
  }

  const handleGenerateItemCode = (index) => {
    const nextCode = generatePartCode(parts)
    setForm((prev) => {
      const currentItems = Array.isArray(prev.Items) ? [...prev.Items] : []
      if (!currentItems[index]) return prev
      currentItems[index] = { ...currentItems[index], Part_Code: nextCode }
      return {
        ...prev,
        Items: currentItems,
        Part_Code: currentItems[0]?.Part_Code || '',
      }
    })
    toast.success('สร้างรหัสอะไหล่ใหม่', `กำหนดรหัส ${nextCode} สำหรับแถวที่ ${index + 1}`)
  }

  const applyPartToForm = (partCode) => {
    handleItemPartCodeChange(0, partCode)
  }

  const applyPartNameToForm = (partName) => {
    handleItemPartNameChange(0, partName)
  }

  const handleGenerateNextPartCode = () => {
    handleGenerateItemCode(0)
  }

  const onPickImageFile = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { imageUrl } = await uploadMedia(file, { folderName: PURCHASE_IMAGE_FOLDER })
      setForm((prev) => ({
        ...prev,
        ImageUrl: imageUrl,
        Note: appendPOMetaToNote(prev.Note, {
          imageUrl,
          partCode: getPOPartCode(prev),
          partName: getPOPartName(prev),
          appliedQty: getPOAppliedQty(prev),
          appliedPartCode: getPOAppliedPartCode(prev),
          appliedItems: extractHiddenNoteValue(prev.Note, APPLIED_ITEMS_NOTE_PREFIX),
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

  const updateSparePartStock = async (partCode, delta, po, itemMeta = {}) => {
    const allParts = await SparePartAPI.list()
    const targetLoc = String(po?.Location_Store || po?.Warehouse || '').trim().toLowerCase()
    const existing = allParts.find((part) => {
      const matchCode = String(part.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase()
      if (!matchCode) return false
      if (!targetLoc) return true
      return String(part.Location_Store || '').trim().toLowerCase() === targetLoc
    }) || allParts.find((part) => String(part.Part_Code || '').toLowerCase() === String(partCode || '').toLowerCase())

    const partName = itemMeta.Part_Name_EN || itemMeta.Detail || getPOPartName(po)
    const poImageUrl = itemMeta.ImageUrl || getPOImageUrl(po)
    const category = itemMeta.Category || getPOCategory(po) || existing?.Category || 'อะไหล่'
    const unitPrice = itemMeta.UnitPrice !== undefined && itemMeta.UnitPrice !== null && itemMeta.UnitPrice !== ''
      ? toNumber(itemMeta.UnitPrice)
      : toNumber(po.UnitPrice)
    const before = toNumber(existing?.Stock_Qty)
    const after = before + delta
    if (!existing && delta < 0) throw new Error(`ไม่พบอะไหล่ ${partCode} ในเมนูอะไหล่`)

    const partPayload = existing
      ? {
          ...existing,
          Part_Name_EN: existing.Part_Name_EN || partName,
          Category: existing.Category || category,
          Supplier: existing.Supplier || po.Supplier || '',
          Unit_Price: existing.Unit_Price || unitPrice,
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
          Unit: itemMeta.Unit || '',
          Stock_Qty: after,
          Min_Qty: 0,
          Location_Store: '',
          Supplier: po.Supplier || '',
          Unit_Price: unitPrice,
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
      Unit_Price: savedPart.Unit_Price || unitPrice,
      Reference: po.PO_Number || po.id || '',
      Reference_Type: 'PO',
      Location_Store: savedPart.Location_Store || '',
      Performed_By: 'System (PO)',
      Note: `อัปเดตสต๊อกจากใบสั่งซื้อ ${po.PO_Number || ''} (${delta >= 0 ? '+' : ''}${delta})`,
      created_date: now.toISOString(),
    })
  }

  const syncInventoryOnStatusChange = async (nextForm, currentRecord, selectedCodes = null) => {
    const nextStatus = nextForm.Status
    const previousStatus = currentRecord?.Status || 'ORDERED'
    const items = parsePOItems(nextForm)
    if (!items || items.length === 0) return nextForm

    const previousAppliedItems = getPOAppliedItems(currentRecord)
    const nextAppliedItems = { ...previousAppliedItems }

    if (Array.isArray(selectedCodes)) {
      // Partial or specific selected items receive
      for (const item of items) {
        const code = String(item.Part_Code || '').trim()
        if (!code || !selectedCodes.includes(code)) continue

        const targetQty = toNumber(item.Qty)
        const prevQty = toNumber(previousAppliedItems[code])
        const delta = targetQty - prevQty

        if (delta !== 0) {
          await updateSparePartStock(code, delta, nextForm, item)
        }
        nextAppliedItems[code] = targetQty
      }
      await loadParts()
    } else if (nextStatus === 'RECEIVED') {
      for (const item of items) {
        const code = String(item.Part_Code || '').trim()
        if (!code) continue

        const targetQty = toNumber(item.Qty)
        const prevQty = toNumber(previousAppliedItems[code])
        let delta = 0

        if (previousStatus === 'RECEIVED') {
          delta = targetQty - prevQty
        } else {
          delta = targetQty
        }

        if (delta !== 0) {
          await updateSparePartStock(code, delta, nextForm, item)
        }
        nextAppliedItems[code] = targetQty
      }

      // Rollback any items removed from the PO
      for (const [prevCode, prevQty] of Object.entries(previousAppliedItems)) {
        if (!nextAppliedItems[prevCode] && prevQty > 0) {
          await updateSparePartStock(prevCode, -prevQty, nextForm, { Part_Code: prevCode })
        }
      }

      await loadParts()
    } else if (previousStatus === 'RECEIVED') {
      // Changed away from RECEIVED -> rollback all applied items
      for (const [prevCode, prevQty] of Object.entries(previousAppliedItems)) {
        if (prevQty > 0) {
          await updateSparePartStock(prevCode, -prevQty, nextForm, { Part_Code: prevCode })
        }
      }
      for (const key of Object.keys(nextAppliedItems)) {
        delete nextAppliedItems[key]
      }
      await loadParts()
    }

    const appliedItemsText = Object.keys(nextAppliedItems).length > 0 ? JSON.stringify(nextAppliedItems) : ''
    const totalAppliedQty = Object.values(nextAppliedItems).reduce((sum, q) => sum + (toNumber(q) || 0), 0)
    const primaryAppliedPartCode = items[0]?.Part_Code || ''

    return {
      ...nextForm,
      Note: appendPOMetaToNote(nextForm.Note, {
        imageUrl: getPOImageUrl(nextForm),
        category: getPOCategory(nextForm),
        partCode: getPOPartCode(nextForm),
        partName: getPOPartName(nextForm),
        appliedQty: totalAppliedQty,
        appliedPartCode: primaryAppliedPartCode,
        appliedItems: appliedItemsText,
      }),
    }
  }

  const submit = async () => {
    if (!form.PO_Number) {
      toast.warning('กรุณากรอกข้อมูล', 'เลข PO จำเป็นต้องกรอก')
      return
    }

    const items = Array.isArray(form.Items) && form.Items.length > 0 ? form.Items : parsePOItems(form)
    if (!items || items.length === 0) {
      toast.warning('กรุณากรอกข้อมูล', 'ต้องมีรายการอะไหล่อย่างน้อย 1 รายการ')
      return
    }

    setSaving(true)
    const isEdit = !!(form._id || form.id)
    const currentRecord = isEdit ? data.find((item) => (item.id || item._id) === (form.id || form._id)) : null
    try {
      const allParts = await SparePartAPI.list()
      const updatedPartsList = [...(allParts || [])]

      // Validate & auto-generate codes for items lacking Part_Code
      const updatedItems = []
      for (const item of items) {
        let code = String(item.Part_Code || '').trim()
        const name = String(item.Part_Name_EN || item.Detail || '').trim()

        if (!code && name) {
          code = generatePartCode(updatedPartsList)
        }

        if (code) {
          const existing = updatedPartsList.find((p) =>
            String(p.Part_Code || '').trim().toLowerCase() === code.toLowerCase()
          )

          if (!existing) {
            const category = item.Category || getPOCategory(form) || 'อะไหล่'
            const poImageUrl = getPOImageUrl(form)
            const created = await SparePartAPI.create({
              Part_Code: code,
              Part_Name_TH: '',
              Part_Name_EN: name || code,
              Category: category,
              Unit: '',
              Stock_Qty: 0,
              Min_Qty: 0,
              Location_Store: '',
              Supplier: form.Supplier || '',
              Unit_Price: toNumber(item.UnitPrice),
              Compatible_Machines: [],
              Status: 'OUT_OF_STOCK',
              Remark: appendSparePartImageMeta(`สร้างอัตโนมัติจากใบสั่งซื้อ ${form.PO_Number || ''}`, {
                imageUrl: poImageUrl,
              }),
            })
            if (created) updatedPartsList.push(created)
          }
        }

        updatedItems.push({
          ...item,
          Part_Code: code,
          Part_Name_EN: name,
        })
      }

      await loadParts()

      const formWithUpdatedItems = {
        ...form,
        Items: updatedItems,
        Part_Code: updatedItems[0]?.Part_Code || form.Part_Code || '',
        Part_Name_EN: updatedItems[0]?.Part_Name_EN || form.Part_Name_EN || '',
        Category: updatedItems[0]?.Category || form.Category || '',
      }

      const syncedForm = await syncInventoryOnStatusChange(formWithUpdatedItems, currentRecord)
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
          `PO: ${form.PO_Number} (${updatedItems.length} รายการ)`
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

  const openQuickReceive = (po) => {
    if (!po) return
    const items = parsePOItems(po)
    const appliedItems = getPOAppliedItems(po)
    const unappliedCodes = items
      .map((it) => String(it.Part_Code || '').trim())
      .filter((code) => code && (!appliedItems[code] || appliedItems[code] <= 0))

    setReceiveItem(po)
    setSelectedReceiveCodes(unappliedCodes)
    setReceiveDate(format(new Date(), 'yyyy-MM-dd'))
    setReceiveNote('')
  }

  const confirmQuickReceive = async () => {
    if (!receiveItem) return
    if (!receiveDate) {
      toast.warning('กรุณากรอกข้อมูล', 'กรุณาระบุวันที่รับสินค้า')
      return
    }

    if (!selectedReceiveCodes || selectedReceiveCodes.length === 0) {
      toast.warning('กรุณาเลือกรายการ', 'กรุณาติ๊กเลือกรายการอะไหล่ที่ต้องการรับอย่างน้อย 1 รายการ')
      return
    }

    setReceiving(true)
    try {
      const currentRecord = receiveItem
      const items = parsePOItems(receiveItem)
      const formToSync = buildQuickReceivePayload({
        po: receiveItem,
        receivedDate: receiveDate,
        note: receiveNote,
        selectedItemCodes: selectedReceiveCodes,
      })

      // Sync inventory for selected items
      const syncedForm = await syncInventoryOnStatusChange(formToSync, currentRecord, selectedReceiveCodes)
      const payload = buildPurchasePayload({
        ...syncedForm,
        LastUpdated: format(new Date(), 'yyyy-MM-dd'),
      })

      await saveWithColumnFallback(payload)

      const isComplete = syncedForm.Status === 'RECEIVED'
      toast.success(
        isComplete ? 'รับสินค้าเข้าสต็อกครบทุกรายการแล้ว' : 'รับสินค้าเข้าสต็อกบางส่วนแล้ว',
        `PO: ${receiveItem.PO_Number} (รับ ${selectedReceiveCodes.length} จาก ${items.length} รายการ, วันที่รับ: ${receiveDate})`
      )

      if (detailRec && (detailRec.id || detailRec._id) === (receiveItem.id || receiveItem._id)) {
        setDetailRec({
          ...detailRec,
          ...syncedForm,
          Status: syncedForm.Status,
          Received_Date: receiveDate,
          Note: syncedForm.Note,
        })
      }

      setReceiveItem(null)
      await load()
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการรับสินค้า', e.message)
    }
    setReceiving(false)
  }

  const openCancelPOConfirm = (po) => {
    if (!po) return
    setCancelPOItem(po)
    setCancelReason('')
  }

  const handleConfirmCancelPO = async () => {
    if (!cancelPOItem) return
    setCancellingPO(true)
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const payload = buildPurchasePayload(
        buildCancelPOPayload({
          po: cancelPOItem,
          cancelDate: todayStr,
          reason: cancelReason,
        })
      )

      await saveWithColumnFallback(payload)

      toast.success(
        'ยกเลิกใบสั่งซื้อสำเร็จ',
        `PO: ${cancelPOItem.PO_Number} สถานะเปลี่ยนเป็นยกเลิก (CANCELLED)`
      )

      if (detailRec && (detailRec.id || detailRec._id) === (cancelPOItem.id || cancelPOItem._id)) {
        setDetailRec({
          ...detailRec,
          Status: 'CANCELLED',
          Note: payload.Note,
        })
      }

      setCancelPOItem(null)
      setReceiveItem(null)
      await load()
    } catch (e) {
      toast.error('เกิดข้อผิดพลาดในการยกเลิกใบสั่งซื้อ', e.message)
    }
    setCancellingPO(false)
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
      return <StatusPill value={val} row={row} />
    }

    if (col.field === 'Part_Code') {
      const items = parsePOItems(row)
      const primaryCode = String(val)
      const extraCount = items.length > 1 ? items.length - 1 : 0
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{primaryCode || '—'}</span>
          {extraCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              +{extraCount} รายการ
            </span>
          )}
        </div>
      )
    }

    if (col.field === 'Part_Name_EN') {
      const items = parsePOItems(row)
      if (items.length > 1) {
        return (
          <div className="max-w-[200px] truncate" title={items.map((it) => it.Part_Name_EN || it.Part_Code).join(', ')}>
            <span className="font-bold text-slate-800 dark:text-slate-100">{String(val)}</span>
            <span className="text-[10px] text-slate-400 ml-1 font-normal">และอื่นๆ</span>
          </div>
        )
      }
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
          <ImageThumbnail
            url={imgUrl}
            alt={`PO: ${row.PO_Number}`}
            onClick={() => setPreviewImageModal({ url: imgUrl, title: `PO: ${row.PO_Number}` })}
          />
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
            totalCount={data.length}
            valueGetters={{
              Part_Code: (row) => {
                const items = parsePOItems(row)
                return items.map((it) => it.Part_Code).filter(Boolean).join(', ') || getPOPartCode(row)
              },
              Part_Name_EN: (row) => {
                const items = parsePOItems(row)
                return items.map((it) => it.Part_Name_EN || it.Detail).filter(Boolean).join(', ') || getPOPartName(row)
              },
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
                      <button
                        type="button"
                        onClick={() => setPdfItem(p)}
                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                        title="ดูเอกสาร PDF และพิมพ์"
                      >
                        <FileText size={13} />
                      </button>
                      {p.Status !== 'RECEIVED' && canEdit && (
                        <button
                          type="button"
                          onClick={() => openQuickReceive(p)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 transition-all border border-emerald-200 dark:border-emerald-800/60"
                          title="รับของเข้าสต็อก (ใส่วันที่รับวันนี้อัตโนมัติ)"
                        >
                          <PackageCheck size={13} />
                        </button>
                      )}
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
        badge={detailRec && <StatusPill value={detailRec.Status} row={detailRec} />}
        canEdit={canEdit}
        canDelete={canDelete}
        extraActions={
          detailRec && detailRec.Status !== 'RECEIVED' && canEdit && (
            <button
              type="button"
              onClick={() => openQuickReceive(detailRec)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="รับของเข้าสต็อกทันที (ใส่วันที่รับวันนี้อัตโนมัติ)"
            >
              <PackageCheck size={14} />
              <span>รับของเข้าสต็อก</span>
            </button>
          )
        }
        onPdf={() => setPdfItem(detailRec)}
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
              { label: 'ผู้จัดจำหน่าย', value: detailRec.Supplier },
              { label: 'รายละเอียด', value: detailRec.Detail },
              ...(getPOImageUrl(detailRec) ? [{
                label: 'รูปถ่ายใบสั่งซื้อ / อะไหล่',
                full: true,
                node: (
                  <div className="pt-1">
                    <ImageThumbnail
                      url={getPOImageUrl(detailRec)}
                      alt={`PO: ${detailRec.PO_Number}`}
                      size={48}
                      onClick={() => setPreviewImageModal({ url: getPOImageUrl(detailRec), title: `PO: ${detailRec.PO_Number}` })}
                    />
                  </div>
                ),
              }] : []),
            ].filter((f) => f && (f.node || f.value)),
          },
          {
            label: `รายการอะไหล่ในใบสั่งซื้อ (${parsePOItems(detailRec).length} รายการ)`,
            single: true,
            fields: [
              {
                label: 'รายการอะไหล่ทั้งหมด',
                full: true,
                node: (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs mt-1">
                    <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          <th className="py-2 px-2.5">ลำดับ</th>
                          <th className="py-2 px-2.5">รหัสอะไหล่</th>
                          <th className="py-2 px-2.5">ชื่ออะไหล่</th>
                          <th className="py-2 px-2.5">หมวดหมู่</th>
                          <th className="py-2 px-2.5 text-right">จำนวน</th>
                          <th className="py-2 px-2.5 text-right">ราคา/หน่วย</th>
                          <th className="py-2 px-2.5 text-right">ราคารวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                        {parsePOItems(detailRec).map((item, idx) => {
                          const q = Number(item.Qty) || 0
                          const p = Number(item.UnitPrice) || 0
                          const tot = item.Total_Amount !== undefined && item.Total_Amount !== null && item.Total_Amount !== ''
                            ? Number(item.Total_Amount)
                            : (q * p)
                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">{item.Part_Code || '—'}</td>
                              <td className="py-2 px-2.5 font-medium text-slate-800 dark:text-slate-200">{item.Part_Name_EN || item.Detail || '—'}</td>
                              <td className="py-2 px-2.5 text-slate-500">{item.Category || '—'}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-semibold">{q.toLocaleString()}</td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{p ? `฿${p.toLocaleString()}` : '—'}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">{tot ? `฿${tot.toLocaleString()}` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t border-slate-200 dark:border-slate-700 text-[11px]">
                          <td colSpan={4} className="py-2 px-2.5 text-right text-slate-500">รวมทั้งหมด:</td>
                          <td className="py-2 px-2.5 text-right font-mono text-blue-600 dark:text-blue-400">
                            {calculatePOTotals(parsePOItems(detailRec)).totalQty.toLocaleString()} ชิ้น
                          </td>
                          <td className="py-2 px-2.5"></td>
                          <td className="py-2 px-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            ฿{calculatePOTotals(parsePOItems(detailRec)).totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ),
              },
            ],
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

          {/* Section 2: Dynamic Items Table */}
          <div className="space-y-3">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-blue-500" />
                <span>รายการอะไหล่และสินค้าในใบสั่งซื้อ ({(form.Items || []).length} รายการ)</span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 shadow-xs"
              >
                <Plus size={13} />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(form.Items || []).map((item, idx) => {
                const itemQty = Number(item.Qty) || 0
                const itemPrice = Number(item.UnitPrice) || 0
                const itemTotal = item.Total_Amount !== undefined && item.Total_Amount !== null && item.Total_Amount !== ''
                  ? Number(item.Total_Amount)
                  : (itemQty * itemPrice)

                const isNewPart = !parts?.some((p) =>
                  String(p.Part_Name_EN || '').toLowerCase() === String(item.Part_Name_EN || '').trim().toLowerCase()
                ) && Boolean(item.Part_Name_EN?.trim())

                return (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2.5 transition-all hover:border-blue-300 dark:hover:border-blue-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          รายการที่ {idx + 1}
                        </span>
                        {item.Part_Code && (
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            {item.Part_Code}
                          </span>
                        )}
                        {isNewPart && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            อะไหล่ใหม่
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">ราคารวมแถวนี้: </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            ฿{itemTotal.toLocaleString()}
                          </span>
                        </div>
                        {(form.Items || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Part Code */}
                      <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Tag size={11} className="text-blue-500" />
                            <span>รหัสอะไหล่</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleGenerateItemCode(idx)}
                            className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            title="สร้างรหัสอะไหล่ใหม่ถัดไปอัตโนมัติ"
                          >
                            <Sparkles size={10} className="text-amber-500" />
                            <span>รหัสอัตโนมัติ</span>
                          </button>
                        </div>
                        <SearchableDropdown
                          id={`item-code-${item.id || idx}`}
                          value={item.Part_Code || ''}
                          onChange={(val) => handleItemPartCodeChange(idx, val)}
                          options={partCodeOptions}
                          placeholder="เช่น SP-001..."
                          inputClassName="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs"
                          helperText="เลือกจากอะไหล่เดิม หรือพิมพ์ใหม่"
                        />
                      </div>

                      {/* Part Name */}
                      <div className="lg:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Package size={11} className="text-indigo-500" />
                            <span>ชื่ออะไหล่</span>
                          </label>
                        </div>
                        <SearchableDropdown
                          id={`item-name-${item.id || idx}`}
                          value={item.Part_Name_EN || ''}
                          onChange={(val) => handleItemPartNameChange(idx, val)}
                          options={partNameOptions}
                          placeholder="ชื่ออะไหล่ หรือเลือกจากดรอปดาวน์..."
                          inputClassName="text-xs"
                          helperText="เลือกจากอะไหล่เดิม หรือพิมพ์ใหม่"
                        />
                      </div>

                      {/* Category */}
                      <div className="lg:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          หมวดหมู่
                        </label>
                        <select
                          className="select text-xs py-1.5 px-2 w-full"
                          value={item.Category || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'Category', e.target.value)}
                        >
                          <option value="">— เลือก —</option>
                          {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="lg:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          จำนวน
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="input text-xs py-1.5 px-2 w-full font-mono text-center font-bold"
                          value={item.Qty !== undefined ? item.Qty : ''}
                          onChange={(e) => handleItemFieldChange(idx, 'Qty', e.target.value)}
                          placeholder="1"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="lg:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          ราคา/หน่วย
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input text-xs py-1.5 px-2 w-full font-mono text-right"
                          value={item.UnitPrice !== undefined ? item.UnitPrice : ''}
                          onChange={(e) => handleItemFieldChange(idx, 'UnitPrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Row Detail */}
                      <div className="lg:col-span-12">
                        <input
                          type="text"
                          className="input text-[11px] py-1 px-2.5 w-full text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60"
                          value={item.Detail || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'Detail', e.target.value)}
                          placeholder="รายละเอียด/สเปกเฉพาะของรายการนี้ (ถ้ามี)"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Items Table Footer Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <Plus size={13} />
                <span>+ เพิ่มรายการอะไหล่</span>
              </button>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">จำนวนชิ้นรวม</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {formTotals.totalQty.toLocaleString()} ชิ้น
                  </span>
                </div>
                <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-600" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">มูลค่ารวมทั้งใบ PO</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                    ฿{formTotals.totalAmount.toLocaleString()}
                  </span>
                </div>
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
                      onChange={(e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ''
                        if (picked) onPickImageFile(picked)
                      }}
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

      {/* ── QUICK RECEIVE MODAL ───────────────────────────────── */}
      <Modal
        open={!!receiveItem}
        onClose={() => !receiving && setReceiveItem(null)}
        title="📦 รับสินค้าเข้าสต็อก (Quick Receive)"
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline px-3.5 text-xs"
                onClick={() => setReceiveItem(null)}
                disabled={receiving || cancellingPO}
              >
                ปิด
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => openCancelPOConfirm(receiveItem)}
                  disabled={receiving || cancellingPO}
                  title="ยกเลิกใบสั่งซื้อนี้ (มีป๊อปอัปยืนยัน)"
                >
                  <Ban size={13} />
                  <span>ยกเลิกใบสั่งซื้อ</span>
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-primary px-4 sm:px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              onClick={confirmQuickReceive}
              disabled={receiving || cancellingPO || selectedReceiveCodes.length === 0}
            >
              {receiving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>กำลังบันทึกรับของ...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>
                    ยืนยันรับของเข้าสต็อก{selectedReceiveCodes.length > 0 ? ` (${selectedReceiveCodes.length} รายการ)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        }
      >
        {receiveItem && (() => {
          const items = parsePOItems(receiveItem)
          const totals = calculatePOTotals(items)
          const appliedItems = getPOAppliedItems(receiveItem)
          const unappliedCodes = items
            .map((it) => String(it.Part_Code || '').trim())
            .filter((code) => code && (!appliedItems[code] || appliedItems[code] <= 0))

          const selectedItems = items.filter((it) => selectedReceiveCodes.includes(String(it.Part_Code || '').trim()))
          const selectedTotalQty = selectedItems.reduce((sum, it) => sum + (Number(it.Qty) || 1), 0)

          return (
            <div className="space-y-4 text-xs">
              {/* Header Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">เลขที่ใบสั่งซื้อ</div>
                  <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                    {receiveItem.PO_Number}
                  </div>
                </div>
                {receiveItem.Supplier && (
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-medium">ผู้จัดจำหน่าย</div>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {receiveItem.Supplier}
                    </div>
                  </div>
                )}
              </div>

              {/* Items checklist */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>เลือกรายการที่จะรับเข้าสต็อก</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-mono">
                      {selectedReceiveCodes.length} / {unappliedCodes.length} รายการ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                      ↔ เลื่อนซ้าย-ขวาได้
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedReceiveCodes(unappliedCodes)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline cursor-pointer"
                    >
                      เลือกทั้งหมด
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedReceiveCodes([])}
                      className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold underline cursor-pointer"
                    >
                      ล้างการเลือก
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto overflow-y-auto max-h-56 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10.5px] uppercase font-bold z-10">
                      <tr>
                        <th className="py-2 px-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={unappliedCodes.length > 0 && selectedReceiveCodes.length === unappliedCodes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReceiveCodes(unappliedCodes)
                              } else {
                                setSelectedReceiveCodes([])
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="เลือก/ยกเลิกทั้งหมด"
                          />
                        </th>
                        <th className="py-2 px-2">ลำดับ</th>
                        <th className="py-2 px-2.5">รหัสอะไหล่</th>
                        <th className="py-2 px-2.5">ชื่ออะไหล่</th>
                        <th className="py-2 px-2.5 text-center">สถานะ</th>
                        <th className="py-2 px-2.5 text-right">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                      {items.map((it, idx) => {
                        const code = String(it.Part_Code || '').trim()
                        const isAlreadyApplied = Boolean(code && appliedItems[code] && appliedItems[code] > 0)
                        const isSelected = selectedReceiveCodes.includes(code)
                        const qty = Number(it.Qty || 1)

                        return (
                          <tr
                            key={it.id || idx}
                            className={`transition-colors ${
                              isAlreadyApplied
                                ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-70'
                                : isSelected
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-center">
                              {isAlreadyApplied ? (
                                <input
                                  type="checkbox"
                                  checked
                                  disabled
                                  className="rounded border-slate-300 text-slate-400 opacity-60 cursor-not-allowed"
                                  title="รับเข้าสต็อกไปแล้ว"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedReceiveCodes(selectedReceiveCodes.filter((c) => c !== code))
                                    } else {
                                      setSelectedReceiveCodes([...selectedReceiveCodes, code])
                                    }
                                  }}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                              )}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {it.Part_Code || '—'}
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {it.Part_Name_EN || it.Detail || '—'}
                            </td>
                            <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                              {isAlreadyApplied ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                  ✓ รับแล้ว
                                </span>
                              ) : isSelected ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  จะรับเข้า
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  รอของ
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {qty.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>💡 ปัดซ้าย-ขวาบนตารางเพื่อดูข้อมูลเพิ่มเติม</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    เลือกรับ {selectedTotalQty.toLocaleString()} จาก {totals.totalQty.toLocaleString()} ชิ้น
                  </span>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="label font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-500" />
                  <span>วันที่รับสินค้า (Received Date) *</span>
                </label>
                <input
                  type="date"
                  className="input text-xs py-2 px-3 w-full font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  required
                />
                <span className="text-[10px] text-slate-400">
                  ระบบใส่วันที่ปัจจุบัน (วันนี้) ให้อัตโนมัติ สามารถเปลี่ยนวันที่ได้หากเป็นการรับย้อนหลัง
                </span>
              </div>

              {/* Optional Receiving Note */}
              <div className="space-y-1">
                <label className="label font-bold text-slate-700 dark:text-slate-300">
                  บันทึกเพิ่มเติมตอนรับของ (Optional)
                </label>
                <input
                  type="text"
                  className="input text-xs py-1.5 px-3 w-full"
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  placeholder="เช่น ตรวจรับครบถ้วน, บิลเลขที่ 12345"
                />
              </div>

              {/* Informational Notice */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  {selectedReceiveCodes.length === unappliedCodes.length && unappliedCodes.length > 0 ? (
                    <span>
                      เมื่อกดยืนยัน ระบบจะปรับสถานะใบสั่งซื้อเป็น <strong>"รับสินค้าแล้ว" (RECEIVED)</strong> และเพิ่มจำนวนสต็อกเข้าคลังอะไหล่ ({selectedReceiveCodes.length} รายการ) ทันที
                    </span>
                  ) : selectedReceiveCodes.length > 0 ? (
                    <span>
                      เมื่อกดยืนยัน ระบบจะเพิ่มสต็อกเฉพาะ <strong>{selectedReceiveCodes.length} รายการที่เลือก</strong> และคงสถานะใบสั่งซื้อเป็น <strong>"รอของ (รับบางส่วน)"</strong> จนกว่าจะรับครบ
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">
                      กรุณาเลือกรายการที่ต้องการรับเข้าสต็อกอย่างน้อย 1 รายการ
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── CANCEL PO CONFIRMATION MODAL (2-STEP) ──────────────── */}
      <Modal
        open={!!cancelPOItem}
        onClose={() => !cancellingPO && setCancelPOItem(null)}
        title="⚠️ ยืนยันการยกเลิกใบสั่งซื้อ"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              className="btn-outline px-4 text-xs"
              onClick={() => setCancelPOItem(null)}
              disabled={cancellingPO}
            >
              กลับ
            </button>
            <button
              type="button"
              className="btn-primary px-4 text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
              onClick={handleConfirmCancelPO}
              disabled={cancellingPO}
            >
              {cancellingPO ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>กำลังยกเลิก PO...</span>
                </>
              ) : (
                <>
                  <Ban size={14} />
                  <span>ยืนยันยกเลิกใบสั่งซื้อนี้</span>
                </>
              )}
            </button>
          </div>
        }
      >
        {cancelPOItem && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-900 dark:text-rose-200">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">ต้องการยกเลิกใบสั่งซื้อ {cancelPOItem.PO_Number}?</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                  เมื่อยืนยัน สถานะของใบสั่งซื้อนี้จะเปลี่ยนเป็น <strong>"ยกเลิก" (CANCELLED)</strong> และปุ่มรับของจะปิดการทำงาน (รายการที่เคยรับเข้าคลังไปแล้วจะยังคงอยู่ในสต็อกตามเดิม)
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="label font-bold text-slate-700 dark:text-slate-300">
                เหตุผลในการยกเลิก (Optional)
              </label>
              <input
                type="text"
                className="input text-xs py-1.5 px-3 w-full"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น สินค้าหมดสต็อก, ซัพพลายเออร์ยกเลิกคำสั่งซื้อ"
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── IMAGE PREVIEW MODAL ───────────────────────────────── */}
      <ImagePreviewModal
        open={!!previewImageModal}
        onClose={() => setPreviewImageModal(null)}
        url={previewImageModal?.url}
        title={previewImageModal?.title}
      />

      {/* ── PDF PREVIEW & PRINT MODAL ───────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generatePurchasingPdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
