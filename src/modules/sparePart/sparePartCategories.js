/**
 * Spare Part Categories Domain Module
 *
 * Provides category management, validation, deduplication, and persistence
 * for the Spare Parts inventory system.
 */

import { getSystemConfig, saveSystemConfig } from '../systemConfig/systemConfigRepository'

export const DEFAULT_SPARE_PART_CATEGORIES = ['อะไหล่', 'เครื่องมือช่าง']
export const SPARE_PART_CATEGORIES_CONFIG_KEY = 'sparepart_categories'
export const SPARE_PART_CATEGORIES_CACHE_KEY = 'txops_sparepart_categories'
export const SPARE_PART_CATEGORIES_LEGACY_WO_ID = 'SYS_SPAREPART_CATEGORIES'

/**
 * Sanitizes and normalizes a category name string.
 * @param {string} name
 * @returns {string} Cleaned category name, or empty string if invalid.
 */
export function cleanCategoryName(name) {
  if (typeof name !== 'string') return ''
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Checks if a category name is one of the built-in system defaults.
 * @param {string} name
 * @returns {boolean}
 */
export function isDefaultSparePartCategory(name) {
  const clean = cleanCategoryName(name).toLowerCase()
  return DEFAULT_SPARE_PART_CATEGORIES.some((c) => c.toLowerCase() === clean)
}

/**
 * Merges default categories, user-configured categories, and any categories
 * currently found on existing spare part rows into a single unique sorted list.
 *
 * @param {string[]} [storedCategories=[]] - Categories saved in appconfigs / localStorage
 * @param {Array<Object>} [dataRows=[]] - Existing spare part records
 * @returns {string[]} Sorted unique list of category names
 */
export function mergeSparePartCategories(storedCategories = [], dataRows = []) {
  const seen = new Set()
  const result = []

  const add = (raw) => {
    const clean = cleanCategoryName(raw)
    if (!clean) return
    const lower = clean.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(clean)
    }
  }

  // 1. Defaults first
  DEFAULT_SPARE_PART_CATEGORIES.forEach(add)

  // 2. Stored custom categories
  if (Array.isArray(storedCategories)) {
    storedCategories.forEach(add)
  }

  // 3. Categories present in active rows
  if (Array.isArray(dataRows)) {
    dataRows.forEach((row) => {
      if (row?.Category) {
        add(row.Category)
      }
    })
  }

  // Thai alphabetical sorting
  return result.sort((a, b) =>
    a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
  )
}

/**
 * Loads stored custom spare part categories from system configuration.
 * @returns {Promise<string[]>}
 */
export async function fetchSparePartCategories() {
  try {
    const raw = await getSystemConfig(SPARE_PART_CATEGORIES_CONFIG_KEY, {
      legacyWorkOrderId: SPARE_PART_CATEGORIES_LEGACY_WO_ID,
      localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
      defaultValue: [],
    })

    if (Array.isArray(raw)) {
      return raw.map(cleanCategoryName).filter(Boolean)
    }
    return []
  } catch (err) {
    console.warn('[SparePartCategories] Failed to fetch categories:', err)
    return []
  }
}

/**
 * Saves custom categories to system configuration (appconfigs + localStorage).
 *
 * @param {string[]} categories
 * @returns {Promise<string[]>}
 */
export async function saveSparePartCategories(categories = []) {
  const seen = new Set()
  const cleanList = []

  // Ensure default categories are always included
  const candidateList = [...DEFAULT_SPARE_PART_CATEGORIES, ...(Array.isArray(categories) ? categories : [])]

  candidateList.forEach((item) => {
    const clean = cleanCategoryName(item)
    if (!clean) return
    const lower = clean.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      cleanList.push(clean)
    }
  })

  cleanList.sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))

  try {
    await saveSystemConfig(SPARE_PART_CATEGORIES_CONFIG_KEY, cleanList, {
      legacyWorkOrderId: SPARE_PART_CATEGORIES_LEGACY_WO_ID,
      localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
    })
  } catch (err) {
    console.warn('[SparePartCategories] Failed to save categories:', err)
  }

  return cleanList
}
