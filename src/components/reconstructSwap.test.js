import { describe, it, expect } from 'vitest'
import { reconstructSwapCylinders } from './CylinderHistoryModal'

// Characterization: lock reconstructSwapCylinders behavior before
// extracting pure helpers out of it (no logic change).

const side = (serial, extra = {}) => ({ serial, ...extra })

describe('reconstructSwapCylinders characterization', () => {
  it('resolves serials through the snapshot fallback chain', () => {
    const r = reconstructSwapCylinders(
      {
        swapCols: ['Location'],
        snapshotOutBefore: { Serial_NOW: 'OUT-NOW' },
        snapshotInBefore: { Serial_NOW: 'IN-NOW' },
        out: side('OUT-SIDE'),
        in: side('IN-SIDE'),
      },
      []
    )

    expect(r.cylOut.Serial_NOW).toBe('OUT-NOW')
    expect(r.cylIn.Serial_NOW).toBe('IN-NOW')
  })

  it('falls back to RecordID pair when snapshots are empty', () => {
    const r = reconstructSwapCylinders(
      { raw: { RecordID: 'AAA <-> BBB' }, out: {}, in: {} },
      []
    )

    expect(r.cylOut.Serial_NOW).toBe('AAA')
    expect(r.cylIn.Serial_NOW).toBe('BBB')
  })

  it('defaults swapCols when missing', () => {
    const r = reconstructSwapCylinders({ out: {}, in: {} }, [])

    expect(r.swapCols).toEqual(['Location', 'Machine_Ref', 'Feeder'])
  })

  it('enriches blank fields from master by serial', () => {
    const masters = [
      { Serial_NOW: 'OUT-NOW', Type: 'Single-Knit', Gauge: '24', Location: 'GK1' },
    ]
    const r = reconstructSwapCylinders(
      {
        swapCols: ['Machine_Ref'],
        snapshotOutBefore: { Serial_NOW: 'OUT-NOW' },
        snapshotInBefore: { Serial_NOW: 'IN-NOW' },
        out: {},
        in: {},
      },
      masters
    )

    expect(r.cylOut.Type).toBe('Single-Knit')
    expect(r.cylOut.Gauge).toBe('24')
  })

  it('infers reciprocal location when swapped', () => {
    const r = reconstructSwapCylinders(
      {
        swapCols: ['Location'],
        snapshotOutBefore: { Serial_NOW: 'O' },
        snapshotInBefore: { Serial_NOW: 'I', Location: 'GK2' },
        out: {},
        in: {},
      },
      []
    )

    expect(r.cylOut.Location).toBe('GK2')
    expect(r.cylIn.Location).toBe('GK2')
  })

  it('applies after-swap states from swapCols', () => {
    const r = reconstructSwapCylinders(
      {
        swapCols: ['Location', 'Machine_Ref', 'Feeder'],
        snapshotOutBefore: { Serial_NOW: 'O', Location: 'L-OUT', Machine_Ref: 'M-OUT', Feeder: 'F-OUT' },
        snapshotInBefore: { Serial_NOW: 'I', Location: 'L-IN', Machine_Ref: 'M-IN', Feeder: 'F-IN' },
        out: {},
        in: {},
      },
      []
    )

    expect(r.afterSwap.newOut.Location).toBe('L-IN')
    expect(r.afterSwap.newIn.Location).toBe('L-OUT')
    expect(r.afterSwap.newOut.Machine_Ref).toBe('M-IN')
    expect(r.afterSwap.newIn.Feeder).toBe('F-OUT')
  })
})
