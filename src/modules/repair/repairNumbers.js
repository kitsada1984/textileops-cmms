/**
 * src/modules/repair/repairNumbers.js
 * Shared repair-request numbering + option lists (single source of truth for
 * every entry point that creates a repair request).
 */

const pad = (n, len = 4) => String(n).padStart(len, '0')

/**
 * Running monthly number matching the historical pattern in the database
 * (RR + YYYYMM + '-' + 4 digits, e.g. RR202609-0057).
 * @param {Array} existingRows Rows already in the table (used to find the max)
 * @param {Date} now Reference date (month window)
 */
export function buildMonthlyRequestNo(existingRows, now = new Date()) {
  const monthPrefix = `RR${now.getFullYear()}${pad(now.getMonth() + 1, 2)}-`
  const maxSeq = (Array.isArray(existingRows) ? existingRows : [])
    .map((r) => String(r?.request_no || ''))
    .filter((no) => no.startsWith(monthPrefix))
    .map((no) => parseInt(no.slice(monthPrefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0)
  return `${monthPrefix}${pad(maxSeq + 1)}`
}

export const REPAIR_PRIORITY_OPTIONS = [
  { value: 'ปกติ', label: '🟢 ปกติ' },
  { value: 'ด่วน', label: '🟡 ด่วน' },
  { value: 'ด่วนที่สุด', label: '🔴 ด่วนที่สุด' },
]

export const REPAIR_TYPE_OPTIONS = [
  { value: 'COMPLEX', label: '🛡️ งานยาก (รอหัวหน้าอนุมัติ)' },
  { value: 'EASY', label: '⚡ งานง่าย (ช่างรับงานได้ทันที)' },
]

/** Maps a Thai priority to the work-order Priority column used by the WO module. */
export function priorityToWorkOrder(priority) {
  if (priority === 'ด่วนที่สุด') return 'HIGH'
  if (priority === 'ด่วน') return 'MEDIUM'
  return 'LOW'
}
