import {
  MC_NOTE_PREFIX,
  MACHINE_MC_NOTE_PREFIX,
  toInputDateValue,
  DATE_NOTE_PREFIX,
} from '../../utils/stockMovementMC'
import { DEFAULT_SPARE_PART_CATEGORIES } from '../../modules/sparePart'

export const SM_FILTER_KEYS = ['created_date', 'TXN_Type', 'Part_Code', 'Part_Name_EN', 'Category', 'MC']

const SM_FIELD_KEYS = {
  created_date: 'sm_th_date',
  TXN_Type: 'sm_th_type',
  Part_Name_EN: 'sm_th_name',
  Qty_Before: 'sm_th_before',
  Qty_Change: 'sm_th_change',
  Qty_After: 'sm_th_after',
  Reference: 'sm_th_ref',
  Performed_By: 'sm_th_by',
}
const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const CATEGORY_NOTE_PREFIX = 'Category:'
const MISSING_COLUMN_RE = /Could not find the '([^']+)' column of 'stocktransactions'|column stocktransactions\.([^ ]+) does not exist|Could not find the '([^']+)' column/i
const HIDDEN_IMAGE_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  CATEGORY_NOTE_PREFIX,
  MC_NOTE_PREFIX,
  MACHINE_MC_NOTE_PREFIX,
  DATE_NOTE_PREFIX,
]
const CATEGORY_OPTIONS = DEFAULT_SPARE_PART_CATEGORIES
export const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']

export const getSMFallbackCols = (t, categoryOpts = DEFAULT_SPARE_PART_CATEGORIES) => [
  { field: 'Part_Code', label: 'รหัสอะไหล่', type: 'text' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Part_Name_EN', label: t('sm_th_name'), type: 'text' },
  { field: 'Category', label: 'หมวดหมู่', type: 'select', width: '140px', options: categoryOpts },
  { field: 'TXN_Type', label: t('sm_th_type'), type: 'select' },
  { field: 'Qty_Change', label: t('sm_th_change'), type: 'number' },
  { field: 'Qty_Before', label: t('sm_th_before'), type: 'number' },
  { field: 'Qty_After', label: t('sm_th_after'), type: 'number' },
  { field: 'Unit', label: t('field_unit'), type: 'text', width: '80px' },
  { field: 'MC', label: 'M/C', type: 'text', width: '110px' },
  { field: 'Location_Store', label: t('field_warehouse'), type: 'select', width: '130px', options: WAREHOUSE_OPTIONS },
  { field: 'created_date', label: t('sm_th_date'), type: 'datetime' },
  { field: 'TXN_ID', label: 'เลขรายการ', type: 'text' },
  { field: 'Unit_Price', label: 'ราคาต่อหน่วย', type: 'number', width: '110px' },
  { field: 'Reference', label: t('sm_th_ref'), type: 'text' },
  { field: 'Performed_By', label: t('sm_th_by'), type: 'text' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'Note', label: 'หมายเหตุ', type: 'text', width: '220px' },
]

export const getSMRequiredCols = (t) => [
  { field: 'Part_Code', label: 'รหัสอะไหล่' },
  { field: 'ImagePreview', label: 'รูป', width: '110px' },
  { field: 'Part_Name_EN', label: t('sm_th_name') },
  { field: 'Category', label: 'หมวดหมู่', width: '140px' },
  { field: 'TXN_Type', label: t('sm_th_type') },
  { field: 'Qty_Change', label: t('sm_th_change') },
  { field: 'Qty_Before', label: t('sm_th_before') },
  { field: 'Qty_After', label: t('sm_th_after') },
  { field: 'Unit', label: t('field_unit'), width: '80px' },
  { field: 'MC', label: 'M/C', width: '110px' },
  { field: 'Location_Store', label: t('field_warehouse'), width: '130px' },
  { field: 'created_date', label: t('sm_th_date') },
  { field: 'TXN_ID', label: 'เลขรายการ' },
  { field: 'Unit_Price', label: 'ราคาต่อหน่วย', width: '110px' },
  { field: 'Reference', label: t('sm_th_ref') },
  { field: 'Performed_By', label: t('sm_th_by') },
  { field: 'ImageUrl', label: 'URL', width: '220px' },
  { field: 'Note', label: 'หมายเหตุ', width: '220px' },
]

export const EMPTY = {
  TXN_Type: 'ISSUE',
  created_date: '',
  Part_Code: '',
  Part_Name_EN: '',
  Category: '',
  MC: '',
  Qty_Before: 0,
  Qty_Change: 0,
  Qty_After: 0,
  Unit: '',
  Unit_Price: 0,
  Reference: '',
  Reference_Type: 'MANUAL',
  Location_Store: '',
  Performed_By: '',
  Note: '',
}

export function resolveSMColumns(wbCols, t, categoryOpts = DEFAULT_SPARE_PART_CATEGORIES) {
  const fallbackCols = getSMFallbackCols(t, categoryOpts)
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
    if (col.field === 'Category') {
      return { ...col, type: 'select', options: categoryOpts }
    }
    if (col.field === 'Location_Store') {
      return { ...col, type: 'select', options: WAREHOUSE_OPTIONS }
    }
    if (col.field === 'Note') return { ...col, width: urlWidth }
    return col
  })
}

export function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

function extractHiddenNoteValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

export function stripImageUrlFromNote(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => !HIDDEN_IMAGE_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

export function parseStockDateInput(dateStr) {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return dateStr
  const parts = String(dateStr).split('T')[0].split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    const now = new Date()
    return new Date(y, m, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
  }
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function appendStockMetaToNote(note = '', { category = '', mc = '', date = '' } = {}) {
  const cleanNote = stripImageUrlFromNote(note)
  return [
    cleanNote,
    category ? `${CATEGORY_NOTE_PREFIX} ${category}` : '',
    mc ? `${MC_NOTE_PREFIX} ${mc}` : '',
    date ? `${DATE_NOTE_PREFIX} ${date}` : '',
  ].filter(Boolean).join('\n')
}

export function getHiddenStockCategory(row = {}) {
  return row.Category || extractHiddenNoteValue(row.Note, CATEGORY_NOTE_PREFIX) || ''
}

export function buildStockPayload(form = {}) {
  const dateInput = form.created_date || toInputDateValue(new Date())
  const dateObj = parseStockDateInput(dateInput)
  return {
    ...omitKeys(form, ['ImageUrl', 'Category']),
    MC: form.MC || '',
    Machine_MC: form.MC || '',
    created_date: dateObj.toISOString(),
    Date: dateInput,
    Note: appendStockMetaToNote(form.Note, {
      category: getHiddenStockCategory(form),
      mc: form.MC || '',
      date: dateInput,
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

export function getMissingStockColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_COLUMN_RE)
  return match?.[1] || match?.[2] || match?.[3] || null
}
