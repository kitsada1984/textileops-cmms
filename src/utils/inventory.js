export function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function getPartStockStatus(stockQty = 0, minQty = 0) {
  const stock = toNumber(stockQty)
  const min = toNumber(minQty)
  if (stock <= 0) return 'OUT_OF_STOCK'
  if (stock <= min) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export function getSignedStockDelta(txnType = '', qty = 0) {
  const amount = Math.abs(toNumber(qty))
  if (txnType === 'ISSUE' || txnType === 'SCRAP') return -amount
  if (txnType === 'ADJUST') return toNumber(qty)
  return amount
}

export function generateStockTxnId(date = new Date()) {
  const pad = (value, size = 2) => String(value).padStart(size, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  const ms = pad(date.getMilliseconds(), 3)
  return `SM-${yyyy}${mm}${dd}-${hh}${mi}${ss}${ms}`
}

// Build the next running spare-part code, e.g. SP-001 → SP-002 → ... → SP-013.
// Reads the largest trailing number across existing parts so deleted codes
// never collide; the DB unique constraint on Part_Code is the final safety net.
export function generatePartCode(parts = [], prefix = 'SP-', padSize = 3) {
  const maxNum = (Array.isArray(parts) ? parts : []).reduce((max, part) => {
    const match = String(part?.Part_Code || '').match(/(\d+)\s*$/)
    const num = match ? parseInt(match[1], 10) : 0
    return num > max ? num : max
  }, 0)
  return `${prefix}${String(maxNum + 1).padStart(padSize, '0')}`
}
