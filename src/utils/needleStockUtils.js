/**
 * src/utils/needleStockUtils.js
 * Utility functions for Needle Stock module:
 * - Structured file naming for Google Drive uploads
 */

/**
 * Generates a structured filename for needle stock images uploaded to Google Drive.
 * Format: Stockเข็ม_{setId}_{actionType}_{YYYYMMDD_HHmmss}.{ext}
 *
 * @param {string} setId Needle set ID, e.g. "NS-0002"
 * @param {string} actionType Transaction or action type, e.g. "IN", "OUT", "ADJUST", "SCRAP", "NEW", "GRADE"
 * @param {string} originalFileName Original file name, e.g. "photo.jpg"
 * @param {Date} [now] Optional Date instance for deterministic testing
 * @returns {string} Formatted file name
 */
export function formatNeedleStockFileName(setId, actionType = 'LOG', originalFileName = '', now = new Date()) {
  const cleanSetId = String(setId || 'NS-UNKNOWN').trim().replace(/[^a-zA-Z0-9-]/g, '_')
  const cleanAction = String(actionType || 'LOG').trim().replace(/[^a-zA-Z0-9-]/g, '_')
  const pad = (n) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const extMatch = String(originalFileName || '').match(/\.([a-zA-Z0-9]+)$/)
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
  return `Stockเข็ม_${cleanSetId}_${cleanAction}_${dateStr}.${ext}`
}
