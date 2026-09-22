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

export function normalizeWarehouseName(location = '') {
  return String(location || '').trim()
}

/**
 * Check if a part with the same Part_Code already exists in the SAME warehouse/location.
 */
export function findDuplicatePartInWarehouse(parts = [], partCode = '', locationStore = '', currentId = null) {
  const targetCode = String(partCode || '').trim().toLowerCase()
  if (!targetCode) return null
  const targetLoc = normalizeWarehouseName(locationStore).toLowerCase()
  const cid = currentId ? String(currentId).trim() : null

  return (Array.isArray(parts) ? parts : []).find((p) => {
    const pid = String(p?.id || p?._id || '').trim()
    if (cid && pid === cid) return false
    const pCode = String(p?.Part_Code || '').trim().toLowerCase()
    const pLoc = normalizeWarehouseName(p?.Location_Store).toLowerCase()
    return pCode === targetCode && pLoc === targetLoc
  }) || null
}

/**
 * Find other warehouses that stock the same Part_Code.
 */
export function getOtherWarehousesForPart(parts = [], partCode = '', currentLocation = '', currentId = null) {
  const targetCode = String(partCode || '').trim().toLowerCase()
  if (!targetCode) return []
  const targetLoc = normalizeWarehouseName(currentLocation).toLowerCase()
  const cid = currentId ? String(currentId).trim() : null

  return (Array.isArray(parts) ? parts : [])
    .filter((p) => {
      const pid = String(p?.id || p?._id || '').trim()
      if (cid && pid === cid) return false
      const pCode = String(p?.Part_Code || '').trim().toLowerCase()
      if (pCode !== targetCode) return false
      const pLoc = normalizeWarehouseName(p?.Location_Store).toLowerCase()
      return !targetLoc || pLoc !== targetLoc
    })
    .map((p) => ({
      id: p?.id || p?._id || null,
      location: normalizeWarehouseName(p?.Location_Store) || 'ไม่ระบุคลัง',
      stock: toNumber(p?.Stock_Qty),
      min: toNumber(p?.Min_Qty),
      unit: p?.Unit || '',
      partName: p?.Part_Name_EN || p?.Part_Name_TH || '',
      status: getPartStockStatus(p?.Stock_Qty, p?.Min_Qty),
    }))
}

/**
 * Find base info from an existing part record with the same Part_Code.
 * Useful for auto-filling details when creating a part in a new warehouse.
 */
export function findBasePartInfo(parts = [], partCode = '') {
  const targetCode = String(partCode || '').trim().toLowerCase()
  if (!targetCode) return null
  return (Array.isArray(parts) ? parts : []).find(
    (p) => String(p?.Part_Code || '').trim().toLowerCase() === targetCode
  ) || null
}

/**
 * Calculate total stock and summary breakdown across all warehouses for a given Part_Code.
 */
export function getTotalStockAcrossWarehouses(parts = [], partCode = '') {
  const targetCode = String(partCode || '').trim().toLowerCase()
  if (!targetCode) {
    return { totalStock: 0, totalMin: 0, locations: [], warehouseCount: 0 }
  }

  const matches = (Array.isArray(parts) ? parts : []).filter(
    (p) => String(p?.Part_Code || '').trim().toLowerCase() === targetCode
  )

  const locations = matches.map((p) => ({
    id: p?.id || p?._id || null,
    location: normalizeWarehouseName(p?.Location_Store) || 'ไม่ระบุคลัง',
    stock: toNumber(p?.Stock_Qty),
    min: toNumber(p?.Min_Qty),
    unit: p?.Unit || '',
    status: getPartStockStatus(p?.Stock_Qty, p?.Min_Qty),
  }))

  const totalStock = locations.reduce((sum, item) => sum + item.stock, 0)
  const totalMin = locations.reduce((sum, item) => sum + item.min, 0)

  return {
    totalStock,
    totalMin,
    locations,
    warehouseCount: locations.length,
  }
}

