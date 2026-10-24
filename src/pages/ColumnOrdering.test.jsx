import { describe, it, expect } from 'vitest'
import { resolveSPColumns, getSPFallbackCols } from './SpareParts'
import { resolvePOColumns, getPOFallbackCols } from './Purchasing'
import { resolveSMColumns, getSMFallbackCols } from './StockMovement'

const mockT = (key) => key

describe('Table Column Ordering Verification', () => {
  describe('SpareParts Column Order', () => {
    it('orders first 4 columns as Part_Code, ImagePreview, Part_Name_EN, Category', () => {
      const cols = resolveSPColumns(null, mockT)
      const fieldList = cols.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
    })

    it('fallback columns also order first 4 columns correctly', () => {
      const fallback = getSPFallbackCols(mockT)
      const fieldList = fallback.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
      expect(fieldList).toContain('Status')
      expect(fieldList).toContain('Stock_Qty')
      expect(fieldList).toContain('Min_Qty')
      expect(fieldList).toContain('Unit')
      expect(fieldList).toContain('Unit_Price')
      expect(fieldList).toContain('Location_Store')
      expect(fieldList).toContain('Supplier')
      expect(fieldList).toContain('Compatible_Machines')
      expect(fieldList).toContain('ImageUrl')
      expect(fieldList).toContain('Remark')
    })
  })

  describe('Purchasing Column Order', () => {
    it('orders first 4 columns as Part_Code, ImagePreview, Part_Name_EN, Category', () => {
      const cols = resolvePOColumns(null)
      const fieldList = cols.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
    })

    it('fallback columns also order first 4 columns correctly', () => {
      const fallback = getPOFallbackCols()
      const fieldList = fallback.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
      expect(fieldList[4]).toBe('PO_Number')
      expect(fieldList[5]).toBe('Status')
      expect(fieldList).toContain('Qty')
      expect(fieldList).toContain('UnitPrice')
      expect(fieldList).toContain('Total_Amount')
      expect(fieldList).toContain('Order_Date')
      expect(fieldList).toContain('Received_Date')
      expect(fieldList).toContain('Supplier')
    })
  })

  describe('StockMovement Column Order', () => {
    it('orders first 4 columns as Part_Code, ImagePreview, Part_Name_EN, Category', () => {
      const cols = resolveSMColumns(null, mockT)
      const fieldList = cols.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
    })

    it('fallback columns also order first 4 columns correctly', () => {
      const fallback = getSMFallbackCols(mockT)
      const fieldList = fallback.map((c) => c.field)

      expect(fieldList[0]).toBe('Part_Code')
      expect(fieldList[1]).toBe('ImagePreview')
      expect(fieldList[2]).toBe('Part_Name_EN')
      expect(fieldList[3]).toBe('Category')
      expect(fieldList[4]).toBe('TXN_Type')
      expect(fieldList[5]).toBe('Qty_Change')
      expect(fieldList).toContain('Qty_Before')
      expect(fieldList).toContain('Qty_After')
      expect(fieldList).toContain('Unit')
      expect(fieldList).toContain('MC')
      expect(fieldList).toContain('Location_Store')
      expect(fieldList).toContain('created_date')
      expect(fieldList).toContain('TXN_ID')
    })
  })
})
