import {
  generatePartCode,
  getPartStockStatus,
  findDuplicatePartInWarehouse,
  getOtherWarehousesForPart,
  findBasePartInfo,
  getTotalStockAcrossWarehouses,
} from './inventory'

describe('getPartStockStatus', () => {
  it('returns OUT_OF_STOCK when stock is zero or less', () => {
    expect(getPartStockStatus(0, 5)).toBe('OUT_OF_STOCK')
    expect(getPartStockStatus(-1, 5)).toBe('OUT_OF_STOCK')
  })

  it('returns LOW_STOCK when stock is positive but at or below minimum', () => {
    expect(getPartStockStatus(1, 5)).toBe('LOW_STOCK')
    expect(getPartStockStatus(5, 5)).toBe('LOW_STOCK')
  })

  it('returns IN_STOCK when stock is above minimum', () => {
    expect(getPartStockStatus(6, 5)).toBe('IN_STOCK')
  })
})

describe('generatePartCode', () => {
  it('returns SP-001 when there are no parts', () => {
    expect(generatePartCode([])).toBe('SP-001')
  })

  it('returns the next number after the highest existing code', () => {
    const parts = [{ Part_Code: 'SP-001' }, { Part_Code: 'SP-012' }, { Part_Code: 'SP-007' }]
    expect(generatePartCode(parts)).toBe('SP-013')
  })

  it('uses the max number, ignoring gaps from deleted codes', () => {
    const parts = [{ Part_Code: 'SP-001' }, { Part_Code: 'SP-002' }, { Part_Code: 'SP-009' }]
    expect(generatePartCode(parts)).toBe('SP-010')
  })

  it('tolerates missing or blank codes', () => {
    const parts = [{ Part_Code: '' }, {}, { Part_Code: 'SP-003' }]
    expect(generatePartCode(parts)).toBe('SP-004')
  })

  it('tolerates a non-array argument', () => {
    expect(generatePartCode(undefined)).toBe('SP-001')
  })

  it('pads past three digits without truncating', () => {
    expect(generatePartCode([{ Part_Code: 'SP-999' }])).toBe('SP-1000')
  })
})

describe('Multi-Warehouse Spare Parts Support', () => {
  const parts = [
    { id: '1', Part_Code: 'SP-027', Part_Name_EN: 'Sensor Pro', Location_Store: 'Store', Stock_Qty: 1, Min_Qty: 2, Unit: 'pcs' },
    { id: '2', Part_Code: 'SP-027', Part_Name_EN: 'Sensor Pro', Location_Store: 'GMK', Stock_Qty: 2, Min_Qty: 1, Unit: 'pcs' },
    { id: '3', Part_Code: 'SP-028', Part_Name_EN: 'Bearing 6204', Location_Store: 'GMK1', Stock_Qty: 10, Min_Qty: 5, Unit: 'pcs' },
  ]

  describe('findDuplicatePartInWarehouse', () => {
    it('detects duplicate when same code exists in same warehouse', () => {
      const dup = findDuplicatePartInWarehouse(parts, 'SP-027', 'Store')
      expect(dup).toBeTruthy()
      expect(dup.id).toBe('1')
    })

    it('ignores case and whitespace when checking duplicates in same warehouse', () => {
      const dup = findDuplicatePartInWarehouse(parts, ' sp-027 ', ' store ')
      expect(dup).toBeTruthy()
      expect(dup.id).toBe('1')
    })

    it('allows same code in a different warehouse', () => {
      const dup = findDuplicatePartInWarehouse(parts, 'SP-027', 'GMK3')
      expect(dup).toBeNull()
    })

    it('ignores the record currently being edited', () => {
      const dup = findDuplicatePartInWarehouse(parts, 'SP-027', 'Store', '1')
      expect(dup).toBeNull()
    })
  })

  describe('getOtherWarehousesForPart', () => {
    it('returns other warehouses stocking the same code', () => {
      const others = getOtherWarehousesForPart(parts, 'SP-027', 'Store')
      expect(others).toHaveLength(1)
      expect(others[0].location).toBe('GMK')
      expect(others[0].stock).toBe(2)
    })

    it('returns empty array if part is only in one warehouse', () => {
      const others = getOtherWarehousesForPart(parts, 'SP-028', 'GMK1')
      expect(others).toHaveLength(0)
    })
  })

  describe('findBasePartInfo', () => {
    it('finds existing part info by code to assist auto-fill', () => {
      const base = findBasePartInfo(parts, 'sp-027')
      expect(base).toBeTruthy()
      expect(base.Part_Name_EN).toBe('Sensor Pro')
    })

    it('returns null if part code not found', () => {
      expect(findBasePartInfo(parts, 'SP-999')).toBeNull()
    })
  })

  describe('getTotalStockAcrossWarehouses', () => {
    it('calculates aggregate stock across all warehouses for a part code', () => {
      const total = getTotalStockAcrossWarehouses(parts, 'SP-027')
      expect(total.warehouseCount).toBe(2)
      expect(total.totalStock).toBe(3) // 1 in Store + 2 in GMK
      expect(total.totalMin).toBe(3)
      expect(total.locations).toHaveLength(2)
    })

    it('handles non-existent part code safely', () => {
      const total = getTotalStockAcrossWarehouses(parts, 'UNKNOWN')
      expect(total.warehouseCount).toBe(0)
      expect(total.totalStock).toBe(0)
    })
  })
})

