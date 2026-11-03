import { getPartStockStatus } from '../../utils/inventory'
import { DEFAULT_SPARE_PART_CATEGORIES } from '../../modules/sparePart'

const SP_FIELD_KEYS = {
  Part_Code: 'sp_th_code',
  Part_Name_EN: 'sp_th_name_en',
  Category: 'sp_th_cat',
  Stock_Qty: 'sp_th_stock',
  Min_Qty: 'sp_th_min',
  Unit_Price: 'sp_th_price',
  Status: 'status',
  Remark: 'remark',
  Unit: 'field_unit',
  Supplier: 'field_supplier',
  Location_Store: 'field_warehouse',
}

const MISSING_SPAREPART_COLUMN_RE = /Could not find the '([^']+)' column of 'spareparts'|column spareparts\.([^ ]+) does not exist/i
export const SPARE_PART_IMAGE_FOLDER = 'รูปอะไหล่'
const CATEGORY_OPTIONS = DEFAULT_SPARE_PART_CATEGORIES
export const WAREHOUSE_OPTIONS = ['GMK1', 'GMK3', 'Store']
export const SP_FILTER_KEYS = ['Part_Name_EN', 'Location_Store', 'Category', 'Status']
export const SP_SORT_ONLY_KEYS = ['Part_Name_EN']
export const SP_INIT_FS = { sort: { key: 'Part_Name_EN', dir: 'asc' }, filters: {} }

function optionRawValue(option) {
  if (option && typeof option === 'object') return option.value ?? option.id ?? option.label ?? ''
  return option ?? ''
}

function optionRawLabel(option) {
  if (option && typeof option === 'object') return option.label ?? option.value ?? option.id ?? ''
  return option ?? ''
}

export function buildSparePartFilterOptions(rows = [], key, fallbackOptions = []) {
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

export const getSPFallbackCols = (t) => [
  { field: 'Part_Code', label: t('sp_th_code'), type: 'text', width: '130px' },
  { field: 'ImagePreview', label: 'รูป', type: 'text', width: '110px' },
  { field: 'Part_Name_EN', label: t('sp_th_name_en'), type: 'text', width: '180px' },
  { field: 'Category', label: t('sp_th_cat'), type: 'select', width: '130px', options: CATEGORY_OPTIONS },
  { field: 'Status', label: t('status'), type: 'select', width: '130px' },
  { field: 'Stock_Qty', label: t('sp_th_stock'), type: 'number', width: '90px' },
  { field: 'Min_Qty', label: t('sp_th_min'), type: 'number', width: '90px' },
  { field: 'Unit', label: t('field_unit'), type: 'text', width: '80px' },
  { field: 'Unit_Price', label: t('sp_th_price'), type: 'number', width: '120px' },
  { field: 'Location_Store', label: t('field_warehouse'), type: 'select', width: '130px', options: WAREHOUSE_OPTIONS },
  { field: 'Supplier', label: t('field_supplier'), type: 'text', width: '150px' },
  { field: 'Compatible_Machines', label: 'เครื่องที่ใช้ได้', type: 'text', width: '180px' },
  { field: 'ImageUrl', label: 'URL', type: 'text', width: '220px' },
  { field: 'Remark', label: t('remark'), type: 'textarea', width: '220px' },
]

export const getSPRequiredCols = (t) => getSPFallbackCols(t).map(({ field, label, width }) => ({ field, label, width }))

export function resolveSPColumns(wbCols, t) {
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

export function getColumnWidthStyle(col) {
  if (!col?.width) return undefined
  return { width: col.width, minWidth: col.width }
}

export function getSparePartName(row = {}) {
  if (!row) return ''
  return row.Part_Name_EN || row.Part_Name_TH || ''
}

export function getSparePartStatus(row = {}) {
  return getPartStockStatus(row.Stock_Qty, row.Min_Qty)
}

export const EMPTY = {
  Part_Code: '',
  Part_Name_TH: '',
  Part_Name_EN: '',
  Category: 'อะไหล่',
  Unit: '',
  Stock_Qty: 0,
  Min_Qty: 0,
  Location_Store: '',
  Supplier: '',
  Unit_Price: 0,
  Compatible_Machines: '',
  Status: 'IN_STOCK',
  Remark: '',
  ImageUrl: '',
}

export function omitKeys(item, keys) {
  const clone = { ...item }
  keys.forEach((key) => {
    delete clone[key]
  })
  return clone
}

export function getMissingSparePartColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(MISSING_SPAREPART_COLUMN_RE)
  return match?.[1] || match?.[2] || null
}

