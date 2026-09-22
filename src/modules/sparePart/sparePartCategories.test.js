import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DEFAULT_SPARE_PART_CATEGORIES,
  cleanCategoryName,
  isDefaultSparePartCategory,
  mergeSparePartCategories,
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

  describe('mergeSparePartCategories', () => {
    it('includes default categories even when inputs are empty', () => {
      const merged = mergeSparePartCategories([], [])
      expect(merged).toContain('อะไหล่')
      expect(merged).toContain('เครื่องมือช่าง')
      expect(merged.length).toBe(2)
    })

    it('merges stored categories and row categories without duplicates', () => {
      const stored = ['ลูกปืน', 'สายพาน']
      const rows = [
        { Part_Code: 'SP-1', Category: 'อะไหล่' },
        { Part_Code: 'SP-2', Category: 'ลูกปืน' },
        { Part_Code: 'SP-3', Category: 'น้ำมันหล่อลื่น' },
        { Part_Code: 'SP-4', Category: '' },
      ]

      const merged = mergeSparePartCategories(stored, rows)

      expect(merged).toContain('อะไหล่')
      expect(merged).toContain('เครื่องมือช่าง')
      expect(merged).toContain('ลูกปืน')
      expect(merged).toContain('สายพาน')
      expect(merged).toContain('น้ำมันหล่อลื่น')
      expect(merged.length).toBe(5)
    })

    it('handles case-insensitivity in Thai and English names', () => {
      const stored = ['Bearing', 'motor']
      const rows = [{ Category: 'BEARING' }, { Category: 'Motor' }]

      const merged = mergeSparePartCategories(stored, rows)
      const bearings = merged.filter((c) => c.toLowerCase() === 'bearing')
      expect(bearings.length).toBe(1)
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

    it('saves categories ensuring defaults are preserved', async () => {
      vi.mocked(systemRepo.saveSystemConfig).mockResolvedValueOnce([])

      await saveSparePartCategories(['ลูกปืน', 'สายพาน'])

      expect(systemRepo.saveSystemConfig).toHaveBeenCalledWith(
        SPARE_PART_CATEGORIES_CONFIG_KEY,
        expect.arrayContaining([...DEFAULT_SPARE_PART_CATEGORIES, 'ลูกปืน', 'สายพาน']),
        expect.objectContaining({
          localCacheKey: SPARE_PART_CATEGORIES_CACHE_KEY,
        })
      )
    })
  })
})
