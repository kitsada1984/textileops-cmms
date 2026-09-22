/**
 * useSparePartCategories Hook
 *
 * React hook to manage spare part categories with cloud persistence,
 * local fallback, and full CRUD (Add, Edit, Delete, Reset).
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DEFAULT_SPARE_PART_CATEGORIES,
  cleanCategoryName,
  isDefaultSparePartCategory,
  mergeSparePartCategories,
  fetchSparePartCategories,
  saveSparePartCategories,
  renameCategoryInList,
  deleteCategoryFromList,
} from './sparePartCategories'

export function useSparePartCategories(sparePartsData = []) {
  const [storedCategories, setStoredCategories] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load persisted categories on mount
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const fetched = await fetchSparePartCategories()
        if (active) {
          if (Array.isArray(fetched) && fetched.length > 0) {
            setStoredCategories(fetched)
          } else {
            // Seed with merged defaults and any active rows
            const initial = mergeSparePartCategories(null, sparePartsData)
            setStoredCategories(initial)
          }
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Dynamic active categories list
  const allCategories = useMemo(() => {
    return mergeSparePartCategories(storedCategories, sparePartsData)
  }, [storedCategories, sparePartsData])

  // Count active parts per category
  const categoryCounts = useMemo(() => {
    const counts = {}
    if (Array.isArray(sparePartsData)) {
      sparePartsData.forEach((part) => {
        const cat = cleanCategoryName(part?.Category) || 'อะไหล่'
        counts[cat] = (counts[cat] || 0) + 1
      })
    }
    return counts
  }, [sparePartsData])

  // 1. Add Category
  const addCategory = useCallback(
    async (rawName) => {
      const clean = cleanCategoryName(rawName)
      if (!clean) {
        return { success: false, error: 'กรุณากรอกชื่อหมวดหมู่' }
      }

      const lower = clean.toLowerCase()
      const currentList = storedCategories || allCategories
      const alreadyExists = currentList.some((c) => c.toLowerCase() === lower)
      if (alreadyExists) {
        return { success: true, name: clean, existed: true }
      }

      const next = [...currentList, clean].sort((a, b) =>
        a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
      )
      setStoredCategories(next)
      await saveSparePartCategories(next)

      return { success: true, name: clean, existed: false }
    },
    [allCategories, storedCategories]
  )

  // 2. Edit Category (Rename)
  const editCategory = useCallback(
    async (oldName, newName) => {
      const cleanOld = cleanCategoryName(oldName)
      const cleanNew = cleanCategoryName(newName)

      if (!cleanOld || !cleanNew) {
        return { success: false, error: 'กรุณากรอกชื่อหมวดหมู่ให้ถูกต้อง' }
      }

      if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
        return { success: true, oldName: cleanOld, newName: cleanNew, unchanged: true }
      }

      const currentList = storedCategories || allCategories
      const next = renameCategoryInList(currentList, cleanOld, cleanNew)
      setStoredCategories(next)
      await saveSparePartCategories(next)

      return { success: true, oldName: cleanOld, newName: cleanNew }
    },
    [allCategories, storedCategories]
  )

  // 3. Delete Category
  const deleteCategory = useCallback(
    async (rawName) => {
      const clean = cleanCategoryName(rawName)
      if (!clean) {
        return { success: false, error: 'ชื่อหมวดหมู่ไม่ถูกต้อง' }
      }

      const currentList = storedCategories || allCategories
      const next = deleteCategoryFromList(currentList, clean)
      setStoredCategories(next)
      await saveSparePartCategories(next)

      return { success: true, name: clean }
    },
    [allCategories, storedCategories]
  )

  // 4. Reset to Default Categories
  const resetToDefaults = useCallback(async () => {
    setStoredCategories(DEFAULT_SPARE_PART_CATEGORIES)
    await saveSparePartCategories(DEFAULT_SPARE_PART_CATEGORIES)
    return { success: true }
  }, [])

  return {
    categories: allCategories,
    defaultCategories: DEFAULT_SPARE_PART_CATEGORIES,
    storedCategories,
    categoryCounts,
    loading,
    addCategory,
    editCategory,
    deleteCategory,
    resetToDefaults,
    isDefaultCategory: isDefaultSparePartCategory,
  }
}

export default useSparePartCategories
