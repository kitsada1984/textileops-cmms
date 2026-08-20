// Pure utility functions for WebBuilder — extracted for testability

export const uid = () => Math.random().toString(36).slice(2, 9)

export const col = (field, label, type = 'text', width = '150px', extra = {}) => ({
  id: uid(), field, label, type, width,
  height: '1', required: false, order: 0, options: [],
  ...extra,
})

export const sel = (field, label, opts, width = '130px', extra = {}) =>
  col(field, label, 'select', width, {
    options: opts.map(o => ({ id: uid(), label: o, value: o })),
    ...extra,
  })

/**
 * Swap item at index `idx` with item at `idx + dir`.
 * Returns a new array. Does nothing if out of bounds.
 */
export const moveItem = (arr, idx, dir) => {
  const result = [...arr]
  const to = idx + dir
  if (to < 0 || to >= result.length) return result
  ;[result[idx], result[to]] = [result[to], result[idx]]
  return result
}

/**
 * Validate a menu form. Returns error string or null.
 */
export const validateMenu = (form) => {
  if (!form.label || !form.label.trim()) return 'กรุณากรอก Label และ Route'
  if (!form.route || !form.route.trim()) return 'กรุณากรอก Label และ Route'
  return null
}

/**
 * Validate a column form against existing columns.
 * Returns error string or null.
 */
export const validateCol = (form, existingCols) => {
  if (!form.field || !form.field.trim()) return 'กรุณากรอก Field และ Label'
  if (!form.label || !form.label.trim()) return 'กรุณากรอก Field และ Label'
  const isNew = !existingCols.find(c => c.id === form.id)
  if (isNew && existingCols.find(c => c.field === form.field)) {
    return `Field "${form.field}" มีอยู่แล้วในเมนูนี้`
  }
  return null
}
