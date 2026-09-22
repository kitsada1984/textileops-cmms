/**
 * Spare Part Categories Domain Module
 *
 * Provides category management, validation, deduplication, renaming, and persistence
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
 * Checks if a category name matches one of the built-in system defaults.
 * @param {string} name
 * @returns {boolean}
 */
export function isDefaultSparePartCategory(name) {
  const clean = cleanCategoryName(name).toLowerCase()
  return DEFAULT_SPARE_PART_CATEGORIES.some((c) => c.toLowerCase() === clean)
}

/**
 * Renames a category in an array of category strings.
 * Preserves Thai alphabetical order and prevents duplicate entries.
 *
 * @param {string[]} categories - Current category list
 * @param {string} oldName - Existing category name
 * @param {string} newName - New category name
 * @returns {string[]} Updated categories list
 */
export function renameCategoryInList(categories = [], oldName, newName) {
  const cleanOld = cleanCategoryName(oldName)
  const cleanNew = cleanCategoryName(newName)
  if (!cleanOld || !cleanNew) return categories

  const lowerOld = cleanOld.toLowerCase()
  const lowerNew = cleanNew.toLowerCase()

  const seen = new Set()
  const result = []

  categories.forEach((cat) => {
    const clean = cleanCategoryName(cat)
    if (!clean) return
    const isTarget = clean.toLowerCase() === lowerOld
    const candidate = isTarget ? cleanNew : clean
    const lowerCandidate = candidate.toLowerCase()

    if (!seen.has(lowerCandidate)) {
      seen.add(lowerCandidate)
      result.push(candidate)
    }
  })

  // If oldName was not already in the list, ensure newName is present
  if (!seen.has(lowerNew)) {
    result.push(cleanNew)
  }

  return result.sort((a, b) =>
    a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
  )
}

/**
 * Deletes a category from an array of category strings (case-insensitive).
 *
 * @param {string[]} categories
 * @param {string} nameToDelete
 * @returns {string[]} Filtered categories list
 */
export function deleteCategoryFromList(categories = [], nameToDelete) {
  const clean = cleanCategoryName(nameToDelete).toLowerCase()
  if (!clean) return categories

  return categories.filter((c) => cleanCategoryName(c).toLowerCase() !== clean)
}

/**
 * Merges user-configured categories, default categories, and active spare part rows.
 *
 * @param {string[]|null} [storedCategories=null] - Categories saved in appconfigs / localStorage
 * @param {Array<Object>} [dataRows=[]] - Existing spare part records
 * @returns {string[]} Sorted unique list of category names
 */
export function mergeSparePartCategories(storedCategories = null, dataRows = []) {
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

  if (Array.isArray(storedCategories) && storedCategories.length > 0) {
    // If the user has configured categories, that is the authoritative list
    storedCategories.forEach(add)
  } else {
    // Initial defaults + categories found in existing data rows
    DEFAULT_SPARE_PART_CATEGORIES.forEach(add)
    if (Array.isArray(dataRows)) {
      dataRows.forEach((row) => {
        if (row?.Category) {
          add(row.Category)
        }
      })
    }
  }

  // Thai alphabetical sorting
  return result.sort((a, b) =>
    a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
  )
}

/**
 * Loads stored custom spare part categories from system configuration.
 * @returns {Promise<string[]|null>}
 */
export async function fetchSparePartCategories() {
  try {
    const raw = await getSystemConfig(SPARE_PART_CATEGORIES_CONFIG_KEY, {
      legacyWorkOrderId: SPARE_PART_CATEGORIES_LEGACY_WO_ID,
      localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
      defaultValue: null,
    })

    if (Array.isArray(raw)) {
      return raw.map(cleanCategoryName).filter(Boolean)
    }
    return null
  } catch (err) {
    console.warn('[SparePartCategories] Failed to fetch categories:', err)
    return null
  }
}

/**
 * Saves categories to system configuration (appconfigs + localStorage).
 *
 * @param {string[]} categories
 * @returns {Promise<string[]>}
 */
export async function saveSparePartCategories(categories = []) {
  const seen = new Set()
  const cleanList = []

  categories.forEach((item) => {
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
