import { describe, it, expect, beforeEach } from 'vitest'
import {
  SP_FILTER_STORAGE_KEYS,
  PART_STATUS_FILTER_OPTIONS,
  calculateSparePartStats,
  filterSparePartsByCards,
} from './SpareParts'

describe('SpareParts - Category and Status Card Filters', () => {
  const sampleParts = [
    {
      id: '1',
      Part_Code: 'SP-001',
      Part_Name_EN: 'Bearing 6204',
      Category: 'อะไหล่',
      Stock_Qty: 20,
      Min_Qty: 5,
      Unit_Price: 150,
    }, // IN_STOCK
    {
      id: '2',
      Part_Code: 'SP-002',
      Part_Name_EN: 'Needle Cylinder Hook',
      Category: 'อะไหล่',
      Stock_Qty: 3,
      Min_Qty: 5,
      Unit_Price: 300,
    }, // LOW_STOCK
    {
      id: '3',
      Part_Code: 'SP-003',
      Part_Name_EN: 'Ceramic Yarn Guide',
      Category: 'อะไหล่',
      Stock_Qty: 0,
      Min_Qty: 10,
      Unit_Price: 50,
    }, // OUT_OF_STOCK
    {
      id: '4',
      Part_Code: 'TL-001',
      Part_Name_EN: 'Torque Wrench 1/2',
      Category: 'เครื่องมือช่าง',
      Stock_Qty: 2,
      Min_Qty: 1,
      Unit_Price: 1200,
    }, // IN_STOCK
    {
      id: '5',
      Part_Code: 'TL-002',
      Part_Name_EN: 'Digital Caliper 150mm',
      Category: 'เครื่องมือช่าง',
      Stock_Qty: 1,
      Min_Qty: 2,
      Unit_Price: 850,
    }, // LOW_STOCK
    {
      id: '6',
      Part_Code: 'EL-001',
      Part_Name_EN: 'Servo Motor Driver',
      Category: 'ไฟฟ้า/อิเล็กทรอนิกส์',
      Stock_Qty: 0,
      Min_Qty: 1,
      Unit_Price: 4500,
    }, // OUT_OF_STOCK
  ]

  describe('PART_STATUS_FILTER_OPTIONS', () => {
    it('defines the 3 canonical stock status options with icons and classes', () => {
      expect(PART_STATUS_FILTER_OPTIONS).toHaveLength(3)
      expect(PART_STATUS_FILTER_OPTIONS.map((o) => o.value)).toEqual([
        'IN_STOCK',
        'LOW_STOCK',
        'OUT_OF_STOCK',
      ])
      expect(PART_STATUS_FILTER_OPTIONS.map((o) => o.icon)).toEqual(['🟢', '🟡', '🔴'])
    })
  })

  describe('calculateSparePartStats', () => {
    it('accurately calculates 5 KPI summary statistics', () => {
      const stats = calculateSparePartStats(sampleParts)
      expect(stats.total).toBe(6)
      expect(stats.inStock).toBe(2) // SP-001, TL-001
      expect(stats.lowStock).toBe(2) // SP-002, TL-002
      expect(stats.outOfStock).toBe(2) // SP-003, EL-001
      // Total value: (20*150) + (3*300) + (0*50) + (2*1200) + (1*850) + (0*4500)
      // = 3000 + 900 + 0 + 2400 + 850 + 0 = 7150
      expect(stats.totalValue).toBe(7150)
    })

    it('handles empty rows safely without throwing', () => {
      const emptyStats = calculateSparePartStats([])
      expect(emptyStats).toEqual({
        total: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
      })

      const nullStats = calculateSparePartStats(null)
      expect(nullStats.total).toBe(0)
    })
  })

  describe('filterSparePartsByCards', () => {
    it('returns all parts when both category and status filters are empty', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: [],
        statusFilters: [],
      })
      expect(result).toHaveLength(6)
    })

    it('filters by single category', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['เครื่องมือช่าง'],
        statusFilters: [],
      })
      expect(result).toHaveLength(2)
      expect(result.map((p) => p.Part_Code)).toEqual(['TL-001', 'TL-002'])
    })

    it('filters by multi-select categories', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['เครื่องมือช่าง', 'ไฟฟ้า/อิเล็กทรอนิกส์'],
        statusFilters: [],
      })
      expect(result).toHaveLength(3)
      expect(result.map((p) => p.Part_Code)).toEqual(['TL-001', 'TL-002', 'EL-001'])
    })

    it('filters by single stock status', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: [],
        statusFilters: ['LOW_STOCK'],
      })
      expect(result).toHaveLength(2)
      expect(result.map((p) => p.Part_Code)).toEqual(['SP-002', 'TL-002'])
    })

    it('filters by multi-select stock statuses (e.g. low stock + out of stock)', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: [],
        statusFilters: ['LOW_STOCK', 'OUT_OF_STOCK'],
      })
      expect(result).toHaveLength(4)
      expect(result.map((p) => p.Part_Code)).toEqual(['SP-002', 'SP-003', 'TL-002', 'EL-001'])
    })

    it('combines category and status filtering with AND logic', () => {
      // Category: อะไหล่ AND Status: LOW_STOCK
      const result1 = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['อะไหล่'],
        statusFilters: ['LOW_STOCK'],
      })
      expect(result1).toHaveLength(1)
      expect(result1[0].Part_Code).toBe('SP-002')

      // Category: อะไหล่ AND Status: IN_STOCK, OUT_OF_STOCK
      const result2 = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['อะไหล่'],
        statusFilters: ['IN_STOCK', 'OUT_OF_STOCK'],
      })
      expect(result2).toHaveLength(2)
      expect(result2.map((p) => p.Part_Code)).toEqual(['SP-001', 'SP-003'])
    })

    it('handles category casing and whitespace trimming robustly', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['  อะไหล่  '],
        statusFilters: [],
      })
      expect(result).toHaveLength(3)
    })

    it('returns empty array when filter combination has no matching items', () => {
      const result = filterSparePartsByCards(sampleParts, {
        categoryFilters: ['ไฟฟ้า/อิเล็กทรอนิกส์'],
        statusFilters: ['IN_STOCK'],
      })
      expect(result).toHaveLength(0)
    })

    it('handles toggle behavior simulation for multi-select', () => {
      let activeCategories = []
      const toggleCat = (cat) => {
        activeCategories = activeCategories.includes(cat)
          ? activeCategories.filter((c) => c !== cat)
          : [...activeCategories, cat]
      }

      // 1. Select อะไหล่
      toggleCat('อะไหล่')
      expect(activeCategories).toEqual(['อะไหล่'])
      expect(filterSparePartsByCards(sampleParts, { categoryFilters: activeCategories })).toHaveLength(3)

      // 2. Multi-select เครื่องมือช่าง
      toggleCat('เครื่องมือช่าง')
      expect(activeCategories).toEqual(['อะไหล่', 'เครื่องมือช่าง'])
      expect(filterSparePartsByCards(sampleParts, { categoryFilters: activeCategories })).toHaveLength(5)

      // 3. Toggle off อะไหล่
      toggleCat('อะไหล่')
      expect(activeCategories).toEqual(['เครื่องมือช่าง'])
      expect(filterSparePartsByCards(sampleParts, { categoryFilters: activeCategories })).toHaveLength(2)

      // 4. Clear all
      activeCategories = []
      expect(filterSparePartsByCards(sampleParts, { categoryFilters: activeCategories })).toHaveLength(6)
    })
  })

  describe('SP_FILTER_STORAGE_KEYS & Collapsible Persistence', () => {
    it('defines distinct localStorage keys for category and status panels', () => {
      expect(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN).toBe('textileops_sp_filter_category_open')
      expect(SP_FILTER_STORAGE_KEYS.STATUS_OPEN).toBe('textileops_sp_filter_status_open')
      expect(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN).not.toBe(SP_FILTER_STORAGE_KEYS.STATUS_OPEN)
    })

    it('simulates independent collapsible state toggle and persistence', () => {
      const mockStorage = {}
      const getInitialState = (key) => {
        const saved = mockStorage[key]
        return saved !== undefined ? saved === 'true' : true // default expanded
      }

      // Default state: both expanded
      let catOpen = getInitialState(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN)
      let statusOpen = getInitialState(SP_FILTER_STORAGE_KEYS.STATUS_OPEN)
      expect(catOpen).toBe(true)
      expect(statusOpen).toBe(true)

      // Toggle category to collapsed independently
      catOpen = !catOpen
      mockStorage[SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN] = String(catOpen)

      expect(getInitialState(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN)).toBe(false)
      expect(getInitialState(SP_FILTER_STORAGE_KEYS.STATUS_OPEN)).toBe(true) // Status remains open

      // Toggle status to collapsed independently
      statusOpen = !statusOpen
      mockStorage[SP_FILTER_STORAGE_KEYS.STATUS_OPEN] = String(statusOpen)

      expect(getInitialState(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN)).toBe(false)
      expect(getInitialState(SP_FILTER_STORAGE_KEYS.STATUS_OPEN)).toBe(false)

      // Re-expand category
      catOpen = !catOpen
      mockStorage[SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN] = String(catOpen)

      expect(getInitialState(SP_FILTER_STORAGE_KEYS.CATEGORY_OPEN)).toBe(true)
      expect(getInitialState(SP_FILTER_STORAGE_KEYS.STATUS_OPEN)).toBe(false)
    })
  })
})
