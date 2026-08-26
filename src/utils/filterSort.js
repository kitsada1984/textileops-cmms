export const EMPTY_FILTER_SORT = { sort: { key: '', dir: 'asc' }, filters: {} }

export function optionValue(option) {
  if (option && typeof option === 'object') return option.value ?? option.id ?? option.label ?? ''
  return option ?? ''
}

export function optionLabel(option) {
  if (option && typeof option === 'object') return option.label ?? option.value ?? option.id ?? ''
  return option ?? ''
}

export function getFilterValue(row, col) {
  if (typeof col.getValue === 'function') return col.getValue(row)
  return row?.[col.key]
}

export function isFilterValueActive(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => item !== undefined && item !== null && item !== '')
  }
  return value !== undefined && value !== null && value !== ''
}

export function getActiveFilterCount(filters = {}) {
  return Object.values(filters).filter(isFilterValueActive).length
}

export function getColumnFilterType(col = {}) {
  if (col.filter?.type) return col.filter.type
  if (col.type === 'select') return 'select'
  if (['date', 'datetime', 'datetime-local'].includes(col.type)) return 'date'
  if (col.type === 'number') return 'number'
  return 'text'
}

export function buildFilterSortColumns(cols = [], {
  labels = {},
  selectOptions = {},
  valueGetters = {},
  exclude = [],
  include = null,
} = {}) {
  const excludeSet = new Set(exclude)
  const includeSet = include ? new Set(include) : null

  return cols
    .map((col) => {
      const key = col.field || col.key || col.id
      if (!key || excludeSet.has(key) || (includeSet && !includeSet.has(key))) return null

      const type = getColumnFilterType(col)
      const base = {
        key,
        label: labels[key] || col.label || key,
        sortable: true,
        type: col.type,
        getValue: valueGetters[key],
      }

      if (type === 'select' || selectOptions[key]) {
        const opts = selectOptions[key] || col.options || []
        return { ...base, filter: { type: 'select', opts } }
      }
      if (type === 'number') return { ...base, filter: { type: 'number' } }
      if (type === 'date') return { ...base, filter: { type: 'date' } }
      return { ...base, filter: { type: 'text' } }
    })
    .filter(Boolean)
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim()
}

function toTimestamp(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

function matchFilter(row, col, value) {
  if (!isFilterValueActive(value)) return true
  const raw = getFilterValue(row, col)
  const type = col.filter?.type || 'text'

  if (type === 'select') {
    if (Array.isArray(value)) {
      if (value.length === 0) return true
      return value.some((v) => normalizeText(raw).includes(normalizeText(v)))
    }
    const valStr = normalizeText(value)
    if (!valStr) return true
    return normalizeText(raw).includes(valStr)
  }

  if (type === 'number') {
    const n = toNumberOrNull(raw)
    if (n === null) return false
    const min = toNumberOrNull(value.min)
    const max = toNumberOrNull(value.max)
    if (min !== null && n < min) return false
    if (max !== null && n > max) return false
    return true
  }

  if (type === 'date') {
    const ts = toTimestamp(raw)
    if (ts === null) return false
    const from = value.from ? new Date(`${value.from}T00:00:00`).getTime() : null
    const to = value.to ? new Date(`${value.to}T23:59:59`).getTime() : null
    if (from !== null && ts < from) return false
    if (to !== null && ts > to) return false
    return true
  }

  return normalizeText(raw).includes(normalizeText(value))
}

function compareValues(a, b) {
  const an = toNumberOrNull(a)
  const bn = toNumberOrNull(b)
  if (an !== null && bn !== null) return an - bn

  const at = toTimestamp(a)
  const bt = toTimestamp(b)
  if (at !== null && bt !== null) return at - bt

  return String(a ?? '').localeCompare(String(b ?? ''), 'th', {
    numeric: true,
    sensitivity: 'base',
  })
}

export function applyFilterSort(rows = [], cols = [], state = EMPTY_FILTER_SORT) {
  const filters = state?.filters || {}
  const sort = state?.sort || EMPTY_FILTER_SORT.sort
  const colByKey = new Map(cols.map((col) => [col.key, col]))

  let result = rows.filter((row) =>
    Object.entries(filters).every(([key, value]) => {
      const col = colByKey.get(key)
      return !col || matchFilter(row, col, value)
    })
  )

  if (sort.key) {
    const col = colByKey.get(sort.key)
    result = [...result].sort((a, b) => {
      const cmp = compareValues(getFilterValue(a, col || { key: sort.key }), getFilterValue(b, col || { key: sort.key }))
      return sort.dir === 'desc' ? -cmp : cmp
    })
  }

  return result
}
