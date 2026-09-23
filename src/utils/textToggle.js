/**
 * Utilities for parsing and toggling comma-separated items (e.g. problem chips, solution chips).
 */

/**
 * Parses a comma-delimited string into an array of trimmed, non-empty tokens.
 * @param {string} text 
 * @returns {string[]}
 */
export function parseCommaList(text = '') {
  if (!text || typeof text !== 'string') return []
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Checks if a specific item is already included in a comma-delimited string.
 * Comparison is trimmed and case-insensitive.
 * @param {string} text 
 * @param {string} item 
 * @returns {boolean}
 */
export function isItemInText(text = '', item = '') {
  if (!text || !item || typeof text !== 'string' || typeof item !== 'string') return false
  const target = item.trim().toLowerCase()
  if (!target) return false
  const items = parseCommaList(text)
  return items.some((i) => i.toLowerCase() === target)
}

/**
 * Toggles an item in a comma-delimited string.
 * If the item is present, removes it; if absent, appends it.
 * Preserves other items and formats cleanly with comma and space.
 * @param {string} currentText 
 * @param {string} item 
 * @returns {string}
 */
export function toggleItemInText(currentText = '', item = '') {
  if (!item || typeof item !== 'string') return currentText || ''
  const trimmed = item.trim()
  if (!trimmed) return currentText || ''

  const items = parseCommaList(currentText)
  const target = trimmed.toLowerCase()
  const idx = items.findIndex((i) => i.toLowerCase() === target)

  if (idx >= 0) {
    // Already selected -> Remove on 2nd click
    items.splice(idx, 1)
  } else {
    // Not selected -> Add on 1st click
    items.push(trimmed)
  }

  return items.join(', ')
}
