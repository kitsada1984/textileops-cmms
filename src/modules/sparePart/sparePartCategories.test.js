import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DEFAULT_SPARE_PART_CATEGORIES,
  cleanCategoryName,
  isDefaultSparePartCategory,
  mergeSparePartCategories,
  renameCategoryInList,
  deleteCategoryFromList,
  fetchSparePartCategories,
  saveSparePartCategories,
  SPARE_PART_CATEGORIES_CONFIG_KEY,
  SPARE_PART_CATEGORIES_CACHE_KEY,
} from './sparePartCategories'
import * as systemRepo from '../systemConfig/systemConfigRepository'

vi.mock('../systemConfig/systemConfigRepository', () => ({
  getSystemConfig: vi.fn(),
  saveSystemConfig: vi.fn(),
}))

describe('SparePartCategories Domain Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cleanCategoryName', () => {
    it('trims leading and trailing spaces and normalizes multiple spaces', () => {
      expect(cleanCategoryName('   ลูกปืน   ')).toBe('ลูกปืน')
      expect(cleanCategoryName('สายพาน    ไทม์มิ่ง')).toBe('สายพาน ไทม์มิ่ง')
    })

    it('returns empty string for non-string inputs', () => {
      expect(cleanCategoryName(null)).toBe('')
      expect(cleanCategoryName(undefined)).toBe('')
      expect(cleanCategoryName(123)).toBe('')
    })
  })

  describe('isDefaultSparePartCategory', () => {
    it('identifies default categories correctly', () => {
      expect(isDefaultSparePartCategory('อะไหล่')).toBe(true)
      expect(isDefaultSparePartCategory('เครื่องมือช่าง')).toBe(true)
      expect(isDefaultSparePartCategory('  อะไหล่  ')).toBe(true)
    })

    it('returns false for custom categories', () => {
      expect(isDefaultSparePartCategory('ลูกปืน')).toBe(false)
      expect(isDefaultSparePartCategory('มอเตอร์')).toBe(false)
      expect(isDefaultSparePartCategory('')).toBe(false)
    })
  })

  describe('renameCategoryInList', () => {
    it('renames an existing category while keeping list deduplicated and sorted', () => {
      const list = ['อะไหล่', 'เครื่องมือช่าง', 'ลูกปืน']
      const updated = renameCategoryInList(list, 'ลูกปืน', 'ตลับลูกปืน NSK')

      expect(updated).toContain('ตลับลูกปืน NSK')
      expect(updated).not.toContain('ลูกปืน')
      expect(updated.length).toBe(3)
    })

    it('handles case-insensitivity when renaming', () => {
      const list = ['Bearing', 'Motor']
      const updated = renameCategoryInList(list, 'BEARING', 'Ball Bearing')

      expect(updated).toContain('Ball Bearing')
      expect(updated).not.toContain('Bearing')
      expect(updated.length).toBe(2)
    })
  })

  describe('deleteCategoryFromList', () => {
    it('removes a category from list case-insensitively', () => {
      const list = ['อะไหล่', 'สายพาน', 'ลูกปืน']
      const updated = deleteCategoryFromList(list, 'สายพาน')

      expect(updated).toEqual(['อะไหล่', 'ลูกปืน'])
    })
  })

  describe('mergeSparePartCategories', () => {
    it('includes default categories when stored categories is null', () => {
      const merged = mergeSparePartCategories(null, [])
      expect(merged).toContain('อะไหล่')
      expect(merged).toContain('เครื่องมือช่าง')
      expect(merged.length).toBe(2)
    })

    it('uses stored categories as primary when user has configured them', () => {
      const stored = ['หมวดหมู่พิเศษ', 'เครื่องมือ']
      const rows = [{ Category: 'หมวดหมู่อื่น' }]

      const merged = mergeSparePartCategories(stored, rows)
      expect(merged).toEqual(['เครื่องมือ', 'หมวดหมู่พิเศษ'].sort((a, b) => a.localeCompare(b, 'th')))
    })
  })

  describe('fetchSparePartCategories & saveSparePartCategories', () => {
    it('fetches categories from SystemConfigRepository', async () => {
      vi.mocked(systemRepo.getSystemConfig).mockResolvedValueOnce(['ลูกปืน', 'สายพาน'])

      const result = await fetchSparePartCategories()

      expect(systemRepo.getSystemConfig).toHaveBeenCalledWith(
        SPARE_PART_CATEGORIES_CONFIG_KEY,
        expect.objectContaining({
          localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
        })
      )
      expect(result).toEqual(['ลูกปืน', 'สายพาน'])
    })

    it('saves exact cleaned list to SystemConfigRepository', async () => {
      vi.mocked(systemRepo.saveSystemConfig).mockResolvedValueOnce([])

      await saveSparePartCategories(['ลูกปืน', '  สายพาน  '])

      expect(systemRepo.saveSystemConfig).toHaveBeenCalledWith(
        SPARE_PART_CATEGORIES_CONFIG_KEY,
        expect.arrayContaining(['ลูกปืน', 'สายพาน']),
        expect.objectContaining({
          localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
        })
      )
    })
  })
})
