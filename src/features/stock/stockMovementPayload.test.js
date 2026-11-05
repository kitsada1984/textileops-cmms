import { describe, it, expect } from 'vitest'
import { findExistingSparePart, buildSparePartPayloadFromMovement } from './stockMovementPayload'

// Characterization: lock spare-part matching + payload shaping before
// extracting them out of the movement arrow (no logic change).

const parts = [
  { id: 'a', Part_Code: 'SP-001', Location_Store: 'Store', Stock_Qty: 5, Min_Qty: 2 },
  { id: 'b', Part_Code: 'SP-001', Location_Store: 'GMK-1', Stock_Qty: 7, Min_Qty: 2 },
]

describe('stockMovementPayload characterization', () => {
  it('matches warehouse first, then falls back to code-only', () => {
    expect(findExistingSparePart(parts, 'SP-001', 'gmk-1').id).toBe('b')
    expect(findExistingSparePart(parts, 'SP-001', '').id).toBe('a')
    expect(findExistingSparePart(parts, 'SP-001', 'NoWhere').id).toBe('a')
    expect(findExistingSparePart(parts, 'SP-999', '')).toBeUndefined()
  })

  it('builds update payload preserving existing master data', () => {
    const p = buildSparePartPayloadFromMovement(
      parts[0],
      { Part_Name_EN: 'N', Category: 'C', Unit: 'U', Unit_Price: 9, Location_Store: 'Store' },
      8,
      (after) => 'OK'
    )

    expect(p.Stock_Qty).toBe(8)
    expect(p.Status).toBe('OK')
    expect(p.Location_Store).toBe('Store')
  })

  it('builds create payload with auto-remark', () => {
    const p = buildSparePartPayloadFromMovement(
      undefined,
      { Part_Code: 'SP-9', Part_Name_EN: 'N9', Category: '', Unit: '', Unit_Price: 3, Location_Store: 'S' },
      4,
      () => 'OK'
    )

    expect(p.Part_Code).toBe('SP-9')
    expect(p.Stock_Qty).toBe(4)
    expect(p.Remark).toBe('สร้างอัตโนมัติจากเมนูเคลื่อนไหวสต๊อก')
  })
})
