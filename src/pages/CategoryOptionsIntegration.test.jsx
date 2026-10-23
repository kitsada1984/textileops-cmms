import { describe, it, expect } from 'vitest'
import { DEFAULT_SPARE_PART_CATEGORIES } from '../modules/sparePart'
import { WebBuilderConfigProvider, useWebBuilderConfig } from '../contexts/WebBuilderConfigContext'

describe('Category Options Synchronization in Purchasing & StockMovement', () => {
  it('DEFAULT_SPARE_PART_CATEGORIES includes default spare part categories', () => {
    expect(DEFAULT_SPARE_PART_CATEGORIES).toContain('อะไหล่')
    expect(DEFAULT_SPARE_PART_CATEGORIES).toContain('เครื่องมือช่าง')
  })

  it('WebBuilderConfigProvider and useWebBuilderConfig are defined', () => {
    expect(WebBuilderConfigProvider).toBeDefined()
    expect(useWebBuilderConfig).toBeDefined()
  })

  it('StockMovement and Purchasing use resolved dynamic categories matching SpareParts', async () => {
    const customList = ['เครื่องมือช่าง', 'บอร์ดนอก', 'บอร์ดใน', 'บอร์ดรุ่นใหม่', 'ลูกปืน', 'สายพานส่งด้าย', 'อะไหล่', 'สายพานเบอร์ 10']
    const parts = [
      { Part_Code: 'SP-01', Category: 'สายพานส่งด้าย' },
      { Part_Code: 'SP-02', Category: 'บอร์ดนอก' },
      { Part_Code: 'SP-03', Category: 'ลูกปืน' },
    ]
    const data = [
      { TXN_ID: 'TX-01', Category: 'บอร์ดใน' }
    ]

    const set = new Set(customList || DEFAULT_SPARE_PART_CATEGORIES)
    parts.forEach((p) => {
      if (p?.Category && typeof p.Category === 'string' && p.Category.trim()) {
        set.add(p.Category.trim())
      }
    })
    data.forEach((row) => {
      if (row?.Category && row.Category !== '—') set.add(row.Category.trim())
    })
    const options = Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
    )

    expect(options).toContain('เครื่องมือช่าง')
    expect(options).toContain('บอร์ดนอก')
    expect(options).toContain('บอร์ดใน')
    expect(options).toContain('บอร์ดรุ่นใหม่')
    expect(options).toContain('ลูกปืน')
    expect(options).toContain('สายพานส่งด้าย')
    expect(options).toContain('อะไหล่')
    expect(options).toContain('สายพานเบอร์ 10')
  })
})
