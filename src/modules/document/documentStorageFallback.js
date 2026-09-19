/**
 * Document Storage Fallback Adapter
 *
 * Encapsulates safe access to localStorage-cached tables as an explicit adapter.
 * Used only when the caller does not supply explicit context entities (e.g. machines, cylinders).
 *
 * TextileOps Architecture: Deep Module / Storage Adapter Seam
 */

/**
 * Safe helper to access stored table caches in localStorage
 * @param {string} tableName - Database table name without or with prefix (e.g. 'cylinders', 'txops_tbl_cylinders')
 * @returns {Array} Parsed array or empty array if not found / in SSR / invalid
 */
export function getCachedTable(tableName) {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(`txops_tbl_${tableName}`) || localStorage.getItem(tableName)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
