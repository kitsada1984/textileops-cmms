export const MC_NOTE_PREFIX = 'MC:'
export const MACHINE_MC_NOTE_PREFIX = 'Machine_MC:'
export const DATE_NOTE_PREFIX = 'Date:'

export function extractDateFromTxnId(txnId = '') {
  const match = String(txnId || '').match(/SM-(\d{4})(\d{2})(\d{2})/i)
  if (!match) return ''
  const [, yyyy, mm, dd] = match
  return `${yyyy}-${mm}-${dd}`
}

export function extractMovementDate(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(DATE_NOTE_PREFIX))
  return line?.trim().slice(DATE_NOTE_PREFIX.length).trim() || ''
}

export function getStockTxnDate(row = {}) {
  if (!row) return ''
  if (row.created_date) return String(row.created_date).trim()
  if (row.Date) return String(row.Date).trim()
  if (row.created_at) return String(row.created_at).trim()
  const fromNote = extractMovementDate(row.Note)
  if (fromNote) return fromNote
  const fromId = extractDateFromTxnId(row.TXN_ID)
  if (fromId) return fromId
  return ''
}

export function toInputDateValue(val) {
  if (!val) return ''
  try {
    // If it's already YYYY-MM-DD or starts with YYYY-MM-DD
    const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return m[0]

    const d = new Date(val)
    if (isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ''
  }
}

export function formatStockTxnDate(val) {
  if (!val) return '—'
  try {
    const parts = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (parts) {
      const [, y, m, day] = parts
      return `${day}/${m}/${y}`
    }

    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return String(val)
  }
}

export function extractMovementMC(note = '') {
  const lines = String(note || '').split('\n')
  const mcLine = lines.find((item) => {
    const trimmed = item.trim()
    return trimmed.startsWith(MC_NOTE_PREFIX) || trimmed.startsWith(MACHINE_MC_NOTE_PREFIX)
  })
  if (!mcLine) return ''
  const trimmed = mcLine.trim()
  if (trimmed.startsWith(MC_NOTE_PREFIX)) {
    return trimmed.slice(MC_NOTE_PREFIX.length).trim()
  }
  return trimmed.slice(MACHINE_MC_NOTE_PREFIX.length).trim()
}

export function stripMCMetaFromNote(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return (
        !trimmed.startsWith(MC_NOTE_PREFIX) &&
        !trimmed.startsWith(MACHINE_MC_NOTE_PREFIX) &&
        !trimmed.startsWith(DATE_NOTE_PREFIX)
      )
    })
    .join('\n')
    .trim()
}

export function appendMCMetaToNote(note = '', mc = '', date = '') {
  const cleanNote = stripMCMetaFromNote(note)
  const trimmedMC = String(mc || '').trim()
  const trimmedDate = String(date || '').trim()
  const metaLines = []
  if (trimmedMC) metaLines.push(`${MC_NOTE_PREFIX} ${trimmedMC}`)
  if (trimmedDate) metaLines.push(`${DATE_NOTE_PREFIX} ${trimmedDate}`)
  return [cleanNote, ...metaLines].filter(Boolean).join('\n')
}

export function getMovementMC(row = {}) {
  return String(row.MC || row.Machine_MC || extractMovementMC(row.Note) || '').trim()
}

export function filterTransactionsByMachine(transactions = [], machineCode = '') {
  const target = String(machineCode || '').trim().toLowerCase()
  if (!target) return []
  return transactions.filter((tx) => getMovementMC(tx).toLowerCase() === target)
}

export function summarizeMachineParts(transactions = []) {
  let totalTransactions = 0
  let totalQty = 0
  let totalCost = 0
  const partsMap = new Map()

  transactions.forEach((tx) => {
    totalTransactions += 1
    const qty = Math.abs(Number(tx.Qty_Change || tx.Quantity || 0))
    const unitPrice = Number(tx.Unit_Price || 0)
    const cost = qty * unitPrice

    totalQty += qty
    totalCost += cost

    const partCode = String(tx.Part_Code || '').trim() || 'UNKNOWN'
    const partName = String(tx.Part_Name_EN || tx.Part_Name_TH || partCode).trim()
    const date = getStockTxnDate(tx)

    if (!partsMap.has(partCode)) {
      partsMap.set(partCode, {
        partCode,
        partName,
        totalQty: 0,
        totalCost: 0,
        unit: tx.Unit || '',
        count: 0,
        lastDate: date,
      })
    }

    const current = partsMap.get(partCode)
    current.totalQty += qty
    current.totalCost += cost
    current.count += 1
    if (date) {
      if (!current.lastDate) {
        current.lastDate = date
      } else {
        const d1 = new Date(date).getTime()
        const d2 = new Date(current.lastDate).getTime()
        if (!isNaN(d1) && !isNaN(d2) && d1 > d2) {
          current.lastDate = date
        }
      }
    }
  })

  const partBreakdown = Array.from(partsMap.values()).sort((a, b) => b.totalQty - a.totalQty)

  return {
    totalTransactions,
    totalQty,
    totalCost,
    uniquePartsCount: partsMap.size,
    partBreakdown,
  }
}

export const NO_MC_VALUE = '__NO_MC__'

export const SM_TXN_TYPE_OPTIONS = [
  { value: 'RECEIVE', label: 'รับเข้า' },
  { value: 'ISSUE', label: 'เบิกจ่าย' },
  { value: 'ADJUST', label: 'ปรับสต๊อก' },
]

export function buildStockMovementMCOptions(machineOptions = []) {
  const normalized = (machineOptions || []).map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : { value: opt.value ?? opt.id ?? opt.label, label: opt.label ?? opt.value }
  ).filter((opt) => opt.value && opt.value !== NO_MC_VALUE)

  return [
    { value: NO_MC_VALUE, label: 'ไม่ระบุเครื่อง' },
    ...normalized,
  ]
}

export function matchStockMovementMC(row = {}, filterValue = '') {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  const mc = getMovementMC(row)
  const hasNoMC = !mc || mc === '—'

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.some((v) => {
      const valStr = String(v ?? '').trim().toLowerCase()
      if (valStr === NO_MC_VALUE.toLowerCase() || valStr === 'ไม่ระบุเครื่อง' || valStr === 'ไม่ระบุ') {
        return hasNoMC
      }
      return !hasNoMC && mc.toLowerCase() === valStr
    })
  }

  const query = String(filterValue).trim().toLowerCase()
  if (!query) return true
  if (query === NO_MC_VALUE.toLowerCase() || query === 'ไม่ระบุเครื่อง' || query === 'ไม่ระบุ') {
    return hasNoMC
  }
  return !hasNoMC && mc.toLowerCase().includes(query)
}

const TXN_TYPE_THAI_LABELS = {
  RECEIVE: 'รับเข้า',
  ISSUE: 'เบิกจ่าย',
  ADJUST: 'ปรับสต๊อก',
  RETURN: 'คืนเข้า',
  SCRAP: 'ตัดทิ้ง',
}

export function matchStockMovementType(row = {}, filterValue = '') {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  const rawType = String(row?.TXN_Type || '').trim().toUpperCase()
  const thaiLabel = TXN_TYPE_THAI_LABELS[rawType] || ''

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.some((v) => {
      const valStr = String(v ?? '').trim().toLowerCase()
      return rawType.toLowerCase() === valStr || (thaiLabel && thaiLabel.toLowerCase() === valStr)
    })
  }

  const query = String(filterValue).trim().toLowerCase()
  if (!query) return true
  return rawType.toLowerCase().includes(query) || thaiLabel.toLowerCase().includes(query)
}

export function buildStockMovementPartCodeOptions(parts = [], transactions = []) {
  const map = new Map()
  ;(parts || []).forEach((p) => {
    const code = String(p?.Part_Code || '').trim()
    if (!code) return
    const name = String(p?.Part_Name_EN || p?.Part_Name_TH || '').trim()
    map.set(code, {
      value: code,
      label: name ? `${code} - ${name}` : code,
    })
  })
  ;(transactions || []).forEach((tx) => {
    const code = String(tx?.Part_Code || '').trim()
    if (!code || map.has(code)) return
    const name = String(tx?.Part_Name_EN || tx?.Part_Name_TH || '').trim()
    map.set(code, {
      value: code,
      label: name ? `${code} - ${name}` : code,
    })
  })
  return Array.from(map.values()).sort((a, b) =>
    a.value.localeCompare(b.value, 'th', { numeric: true, sensitivity: 'base' })
  )
}

export function buildStockMovementPartNameOptions(parts = [], transactions = []) {
  const map = new Map()
  ;(parts || []).forEach((p) => {
    const name = String(p?.Part_Name_EN || p?.Part_Name_TH || '').trim()
    if (!name) return
    const code = String(p?.Part_Code || '').trim()
    if (!map.has(name)) {
      map.set(name, {
        value: name,
        label: code ? `${name} (${code})` : name,
      })
    }
  })
  ;(transactions || []).forEach((tx) => {
    const name = String(tx?.Part_Name_EN || tx?.Part_Name_TH || '').trim()
    if (!name || map.has(name)) return
    const code = String(tx?.Part_Code || '').trim()
    map.set(name, {
      value: name,
      label: code ? `${name} (${code})` : name,
    })
  })
  return Array.from(map.values()).sort((a, b) =>
    a.value.localeCompare(b.value, 'th', { numeric: true, sensitivity: 'base' })
  )
}

export function matchStockMovementPartCode(row = {}, filterValue = '') {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  const rowVal = String(row?.Part_Code || '').toLowerCase().trim()

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.some((v) => {
      const valStr = String(v ?? '').trim().toLowerCase()
      return rowVal === valStr || rowVal.includes(valStr)
    })
  }

  const query = String(filterValue).trim().toLowerCase()
  if (!query) return true
  return rowVal.includes(query)
}

export function matchStockMovementPartName(row = {}, filterValue = '') {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  const targets = [row?.Part_Name_EN, row?.Part_Name_TH]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase().trim())

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.some((v) => {
      const needle = String(v ?? '').toLowerCase().trim()
      return targets.some((t) => t === needle || t.includes(needle))
    })
  }

  const needle = String(filterValue).toLowerCase().trim()
  if (!needle) return true
  return targets.some((t) => t.includes(needle))
}

export function findMatchingSparePart(parts = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return null
  return (parts || []).find((p) => {
    const code = String(p?.Part_Code || '').trim().toLowerCase()
    const nameEn = String(p?.Part_Name_EN || '').trim().toLowerCase()
    const nameTh = String(p?.Part_Name_TH || '').trim().toLowerCase()
    return code === q || nameEn === q || nameTh === q
  }) || null
}


