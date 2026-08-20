import { generatePartCode, getPartStockStatus } from './inventory'

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
