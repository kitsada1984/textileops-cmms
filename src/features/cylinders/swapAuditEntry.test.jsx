import { describe, it, expect } from 'vitest'
import { sanitizeCylinderSnapshot, buildSwapAuditEntry } from './cylinderParts.jsx'

// Characterization tests (plan Task 6): lock the swap-audit payload exactly
// as the in-component version produced it (snapshot + spot checks).

const newIn = {
  id: 'in-1',
  Serial_NOW: '60709',
  Serial_OLD: '1GK1',
  NewMC: 'SA-361M',
  Location: 'GMK1',
  Standard: 'STD',
  Feeder: '8',
  Manufacturer: 'PAILUNG',
  Type: 'S',
  Diameter: '30',
  Gauge: '28',
  Needle: '2640',
  Machine_Ref: 'In-use-GMK1',
  Comment: 'SA361M',
}
const newOut = {
  id: 'out-1',
  Serial_NOW: '63873',
  Serial_OLD: '4GK3',
  NewMC: 'DB-301M',
  Location: 'GMK3',
  Standard: 'STD',
  Feeder: '12',
  Manufacturer: 'PAILUNG',
  Type: 'D',
  Diameter: '30',
  Gauge: '28',
  Needle: '3000',
  Machine_Ref: 'Spare-GMK3',
  Comment: 'DB-301M',
}
const meta = { inId: 'in-1', outId: 'out-1', swapCols: ['Location', 'Machine_Ref'] }

describe('swap audit entry builder', () => {
  it('sanitizes a cylinder snapshot with safe defaults', () => {
    expect(sanitizeCylinderSnapshot(null)).toBeNull()
    expect(sanitizeCylinderSnapshot({})).toEqual({
      id: '',
      Serial_NOW: '',
      Serial_OLD: '',
      NewMC: '',
      Location: '',
      Standard: '',
      Feeder: '',
      Manufacturer: '',
      Type: '',
      Diameter: '',
      Gauge: '',
      Needle: '',
      Machine_Ref: '',
      Comment: '',
    })
  })

  it('builds the exact audit entry shape', () => {
    const entry = buildSwapAuditEntry({
      payload: { newIn, newOut },
      sourceIn: newIn,
      sourceOut: newOut,
      meta,
      inId: 'in-1',
      outId: 'out-1',
    })

    expect(entry.Module).toBe('CYLINDERS')
    expect(entry.ActionType).toBe('SWAP')
    expect(entry.FieldName).toBe('SwapCylinder')
    expect(entry.Comment).toBe('สลับกระบอก 60709 (MC: SA-361M) กับ 63873 (MC: DB-301M)')
    expect(JSON.parse(entry.OldValue).in.serial).toBe('60709')
    expect(JSON.parse(entry.NewValue).swapCols).toEqual(['Location', 'Machine_Ref'])
    expect(entry).toMatchSnapshot()
  })
})
