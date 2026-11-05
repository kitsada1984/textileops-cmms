import { describe, it, expect } from 'vitest'
import { resolveStockCellValue } from './stockCellRender'

// Characterization: lock stock cell value resolution before extracting
// renderers out of the arrow (no logic change).

describe('stockCellRender characterization', () => {
  it('resolves image, category, mc, date, and raw fields', () => {
    const row = { Part_Code: 'SP-1', Category: 'C', MC: 'M1', created_date: 'D' }
    const deps = {
      getStockPartImageUrl: () => 'img',
      getStockCategory: (r) => r.Category,
      getMovementMC: (r) => r.MC,
      getStockTxnDate: (r) => r.created_date,
    }

    expect(resolveStockCellValue(row, { field: 'ImageUrl' }, deps)).toBe('img')
    expect(resolveStockCellValue(row, { field: 'Category' }, deps)).toBe('C')
    expect(resolveStockCellValue(row, { field: 'MC' }, deps)).toBe('M1')
    expect(resolveStockCellValue(row, { field: 'created_date' }, deps)).toBe('D')
    expect(resolveStockCellValue(row, { field: 'Part_Code' }, deps)).toBe('SP-1')
  })
})
