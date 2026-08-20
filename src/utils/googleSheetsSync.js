const SHEETS_SYNC_ENDPOINT = import.meta.env.VITE_SHEETS_SYNC_WEBHOOK || '/api/sheets-sync'

function normalizeValue(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function getColumnKey(col = {}) {
  return col.field || col.key || col.id || ''
}

export async function syncRowsToGoogleSheet({ sheetName, columns = [], rows = [], valueGetters = {} }) {
  const normalizedColumns = columns
    .map((col) => ({
      key: getColumnKey(col),
      label: col.label || col.header || getColumnKey(col),
    }))
    .filter((col) => col.key)

  if (!normalizedColumns.length) throw new Error('ไม่มีคอลัมน์สำหรับอัปเดต Google Sheet')

  const normalizedRows = rows.map((row) => {
    const next = {}
    normalizedColumns.forEach((col) => {
      const getter = valueGetters[col.key]
      next[col.key] = normalizeValue(typeof getter === 'function' ? getter(row) : row?.[col.key])
    })
    return next
  })

  const res = await fetch(SHEETS_SYNC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sheetName,
      columns: normalizedColumns,
      rows: normalizedRows,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'อัปเดต Google Sheet ไม่สำเร็จ')
  return json
}
