import { toNumber } from '../../utils/inventory'
import { DEFAULT_SPARE_PART_CATEGORIES } from '../../modules/sparePart'
import { PO_STATUS } from '../../api/entities'

const STATUS_CFG = {
  ORDERED: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#2563eb', dot: '#2563eb' },
  RECEIVED: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#059669', dot: '#059669' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#dc2626', dot: '#dc2626' },
}
const STATUS_TH = Object.fromEntries(PO_STATUS.map((s) => [s.value, s.label]))

export const PURCHASING_STATUS_OPTIONS = [
  {
    value: 'ORDERED',
    label: 'รอของ',
    icon: '🟡',
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs',
  },
  {
    value: 'RECEIVED',
    label: 'รับของแล้ว',
    icon: '🟢',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
  },
  {
    value: 'CANCELLED',
    label: 'ยกเลิก',
    icon: '🔴',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
  },
]

export function matchesPOStatusFilter(poStatus, statusFilters = []) {
  if (!statusFilters || statusFilters.length === 0 || statusFilters.includes('ALL')) return true
  const norm = String(poStatus || 'ORDERED').toUpperCase().trim()
  return statusFilters.some((f) => {
    const fUpper = String(f).toUpperCase().trim()
    if (fUpper === norm) return true
    if (fUpper === 'ORDERED' && (norm === 'ORDERED' || norm === 'รอของ')) return true
    if (fUpper === 'RECEIVED' && (norm === 'RECEIVED' || norm === 'ได้รับของแล้ว' || norm === 'รับของแล้ว')) return true
    if (fUpper === 'CANCELLED' && (norm === 'CANCELLED' || norm === 'ยกเลิก')) return true
    return false
  })
}
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
export const PURCHASE_IMAGE_FOLDER = 'จัดซื้อ'

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

export function StatusPill({ value, row }) {
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

export function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

export function extractHiddenNoteValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

export function stripHiddenNoteMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !HIDDEN_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

export function appendPOMetaToNote(note = '', {
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

export function getPOImageUrl(row) {
  if (!row) return ''
  return row.ImageUrl || extractHiddenNoteValue(row.Note, IMAGE_NOTE_PREFIX) || ''
}

export function getPOCategory(row) {
  if (!row) return ''
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

export function getPOPartCode(row) {
  if (!row) return ''
  return row.Part_Code || extractHiddenNoteValue(row.Note, PART_CODE_NOTE_PREFIX) || ''
}

export function getPOPartName(row) {
  if (!row) return ''
  return row.Part_Name_EN || extractHiddenNoteValue(row.Note, PART_NAME_NOTE_PREFIX) || row.Detail || ''
}

export function getPOAppliedQty(row) {
  if (!row) return 0
  return toNumber(extractHiddenNoteValue(row.Note, APPLIED_QTY_NOTE_PREFIX))
}

export function getPOAppliedPartCode(row) {
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

export function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

export function getMissingPurchaseOrderColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || null
}

export const EMPTY = {
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
