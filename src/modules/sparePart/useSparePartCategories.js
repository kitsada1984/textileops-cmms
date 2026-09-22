/**
 * useSparePartCategories Hook
 *
 * React hook to manage spare part categories with cloud persistence,
 * local fallback, and dynamic merge with active table rows.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DEFAULT_SPARE_PART_CATEGORIES,
  cleanCategoryName,
  isDefaultSparePartCategory,
  mergeSparePartCategories,
  fetchSparePartCategories,
  saveSparePartCategories,
} from './sparePartCategories'

export function useSparePartCategories(sparePartsData = []) {
  const [storedCategories, setStoredCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Load persisted categories on mount
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const fetched = await fetchSparePartCategories()
        if (active) {
          setStoredCategories(fetched)
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

  // Dynamic merged categories (defaults + stored + active rows)
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

  // Add a new custom category
  const addCategory = useCallback(
    async (rawName) => {
      const clean = cleanCategoryName(rawName)
      if (!clean) {
        return { success: false, error: 'กรุณากรอกชื่อหมวดหมู่' }
      }

      const lower = clean.toLowerCase()
      const alreadyExists = allCategories.some((c) => c.toLowerCase() === lower)
      if (alreadyExists) {
        return { success: true, name: clean, existed: true }
      }

      const nextStored = [...storedCategories, clean]
      setStoredCategories(nextStored)
      await saveSparePartCategories(nextStored)

      return { success: true, name: clean, existed: false }
    },
    [allCategories, storedCategories]
  )

  // Delete a custom category
  const deleteCategory = useCallback(
    async (rawName) => {
      const clean = cleanCategoryName(rawName)
      if (!clean) {
        return { success: false, error: 'ชื่อหมวดหมู่ไม่ถูกต้อง' }
      }

      if (isDefaultSparePartCategory(clean)) {
        return { success: false, error: 'ไม่สามารถลบหมวดหมู่เริ่มต้นของระบบได้' }
      }

      const lower = clean.toLowerCase()
      const nextStored = storedCategories.filter((c) => c.toLowerCase() !== lower)
      setStoredCategories(nextStored)
      await saveSparePartCategories(nextStored)

      return { success: true, name: clean }
    },
    [storedCategories]
  )

  return {
    categories: allCategories,
    defaultCategories: DEFAULT_SPARE_PART_CATEGORIES,
    storedCategories,
    categoryCounts,
    loading,
    addCategory,
    deleteCategory,
    isDefaultCategory: isDefaultSparePartCategory,
  }
}

export default useSparePartCategories
