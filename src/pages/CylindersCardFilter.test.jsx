import { describe, it, expect } from 'vitest'
import {
  MACHINE_REF_OPTIONS,
  buildMachineRefSummary,
  filterCylindersByMachineRef,
  buildCylinderSummary,
  filterCylindersByGroup,
  isCylinderInUse,
} from './Cylinders'

describe('Cylinders - Machine Ref Card Filter & Summary', () => {
  const sampleCylinders = [
    { id: '1', Serial_NOW: 'CYL-01', Machine_Ref: 'In-use-GMK1', Status_Now: 'STANDARD' },
    { id: '2', Serial_NOW: 'CYL-02', Machine_Ref: 'In-use-GMK1', Status_Now: 'STANDARD' },
    { id: '3', Serial_NOW: 'CYL-03', Machine_Ref: 'Spare-GMK1',  Status_Now: 'RESERVE' },
    { id: '4', Serial_NOW: 'CYL-04', Machine_Ref: 'In-use-GMK3', Status_Now: 'STANDARD' },
    { id: '5', Serial_NOW: 'CYL-05', Machine_Ref: 'In-use-GMK3', Status_Now: 'STANDARD' },
    { id: '6', Serial_NOW: 'CYL-06', Machine_Ref: 'In-use-GMK3', Status_Now: 'STANDARD' },
    { id: '7', Serial_NOW: 'CYL-07', Machine_Ref: 'Spare-GMK3',  Status_Now: 'RESERVE' },
    { id: '8', Serial_NOW: 'CYL-08', Machine_Ref: null,          Status_Now: 'SCRAP' },
  ]

  it('defines the 4 canonical machine ref options in order', () => {
    expect(MACHINE_REF_OPTIONS).toEqual([
      'In-use-GMK1',
      'Spare-GMK1',
      'In-use-GMK3',
      'Spare-GMK3',
    ])
  })

  it('buildMachineRefSummary correctly aggregates count for each card', () => {
    const summary = buildMachineRefSummary(sampleCylinders)
    expect(summary).toHaveLength(4)

    expect(summary.find((s) => s.value === 'In-use-GMK1')?.count).toBe(2)
    expect(summary.find((s) => s.value === 'Spare-GMK1')?.count).toBe(1)
    expect(summary.find((s) => s.value === 'In-use-GMK3')?.count).toBe(3)
    expect(summary.find((s) => s.value === 'Spare-GMK3')?.count).toBe(1)
  })

  it('filterCylindersByMachineRef returns all cylinders when selectedRef is empty', () => {
    const resEmpty = filterCylindersByMachineRef(sampleCylinders, '')
    expect(resEmpty).toHaveLength(8)

    const resNull = filterCylindersByMachineRef(sampleCylinders, null)
    expect(resNull).toHaveLength(8)
  })

  it('filterCylindersByMachineRef filters to In-use-GMK1', () => {
    const res = filterCylindersByMachineRef(sampleCylinders, 'In-use-GMK1')
    expect(res).toHaveLength(2)
    expect(res.every((c) => c.Machine_Ref === 'In-use-GMK1')).toBe(true)
  })

  it('filterCylindersByMachineRef filters to Spare-GMK1', () => {
    const res = filterCylindersByMachineRef(sampleCylinders, 'Spare-GMK1')
    expect(res).toHaveLength(1)
    expect(res[0].Serial_NOW).toBe('CYL-03')
  })

  it('filterCylindersByMachineRef filters to In-use-GMK3', () => {
    const res = filterCylindersByMachineRef(sampleCylinders, 'In-use-GMK3')
    expect(res).toHaveLength(3)
    expect(res.map((c) => c.Serial_NOW)).toEqual(['CYL-04', 'CYL-05', 'CYL-06'])
  })

  it('filterCylindersByMachineRef filters to Spare-GMK3', () => {
    const res = filterCylindersByMachineRef(sampleCylinders, 'Spare-GMK3')
    expect(res).toHaveLength(1)
    expect(res[0].Serial_NOW).toBe('CYL-07')
  })

  it('handles toggle behavior simulation correctly', () => {
    let selected = ''
    const toggle = (val) => { selected = (selected === val ? '' : val) }

    // Click In-use-GMK3
    toggle('In-use-GMK3')
    expect(selected).toBe('In-use-GMK3')
    expect(filterCylindersByMachineRef(sampleCylinders, selected)).toHaveLength(3)

    // Click In-use-GMK3 again -> toggles off
    toggle('In-use-GMK3')
    expect(selected).toBe('')
    expect(filterCylindersByMachineRef(sampleCylinders, selected)).toHaveLength(8)

    // Click Spare-GMK3
    toggle('Spare-GMK3')
    expect(selected).toBe('Spare-GMK3')
    expect(filterCylindersByMachineRef(sampleCylinders, selected)).toHaveLength(1)
  })
})

describe('Cylinders - Spec Group Card Filter & Summary (Type, Diameter, Gauge)', () => {
  const cylinders = [
    { id: '1', Type: 'D', Diameter: '30', Gauge: '32', Serial_NOW: 'CYL-01', Machine_Ref: 'In-use-GMK1' },
    { id: '2', Type: 'D', Diameter: '30', Gauge: '32', Serial_NOW: 'CYL-02', Machine_Ref: 'In-use-GMK1' },
    { id: '3', Type: 'D', Diameter: '30', Gauge: '28', Serial_NOW: 'CYL-03', Machine_Ref: 'Spare-GMK1' }, // SPARE
    { id: '4', Type: 'S', Diameter: '30', Gauge: '28', Serial_NOW: 'CYL-04', Machine_Ref: 'In-use-GMK3' },
    { id: '5', Type: 'S', Diameter: '34', Gauge: '24', Serial_NOW: 'CYL-05', Machine_Ref: 'in-use' },
    { id: '6', Type: 'Jac.', Diameter: '34', Gauge: '24', Serial_NOW: 'CYL-06', Machine_Ref: 'Spare-GMK3' }, // SPARE
  ]

  it('isCylinderInUse identifies in-use vs spare accurately', () => {
    expect(isCylinderInUse({ Machine_Ref: 'In-use-GMK1' })).toBe(true)
    expect(isCylinderInUse({ Machine_Ref: 'In-use-GMK3' })).toBe(true)
    expect(isCylinderInUse({ Machine_Ref: 'in-use' })).toBe(true)
    expect(isCylinderInUse({ Machine_Ref: 'Spare-GMK1' })).toBe(false)
    expect(isCylinderInUse({ Machine_Ref: 'Spare-GMK3' })).toBe(false)
    expect(isCylinderInUse({ Machine_Ref: null })).toBe(false)
    expect(isCylinderInUse({})).toBe(false)
  })

  it('buildCylinderSummary defaults to onlyInUse: true and excludes spare cylinders', () => {
    // Only in-use (cylinders 1, 2, 4, 5) -> excludes spare cylinders 3 and 6
    const summary = buildCylinderSummary(cylinders)
    expect(summary).toHaveLength(3)

    // D, 30, 32 = 2 (in-use)
    const d30_32 = summary.find((s) => s.Type === 'D' && s.Diameter === '30' && s.Gauge === '32')
    expect(d30_32).toBeDefined()
    expect(d30_32.count).toBe(2)

    // S, 30, 28 = 1 (in-use)
    const s30_28 = summary.find((s) => s.Type === 'S' && s.Diameter === '30' && s.Gauge === '28')
    expect(s30_28).toBeDefined()
    expect(s30_28.count).toBe(1)

    // S, 34, 24 = 1 (in-use)
    const s34_24 = summary.find((s) => s.Type === 'S' && s.Diameter === '34' && s.Gauge === '24')
    expect(s34_24).toBeDefined()
    expect(s34_24.count).toBe(1)

    // D, 30, 28 was Spare-GMK1 -> MUST NOT be in the summary
    const d30_28 = summary.find((s) => s.Type === 'D' && s.Diameter === '30' && s.Gauge === '28')
    expect(d30_28).toBeUndefined()

    // Jac., 34, 24 was Spare-GMK3 -> MUST NOT be in the summary
    const jac34_24 = summary.find((s) => s.Type === 'Jac.' && s.Diameter === '34' && s.Gauge === '24')
    expect(jac34_24).toBeUndefined()
  })

  it('buildCylinderSummary with onlyInUse: false includes spare cylinders', () => {
    const summary = buildCylinderSummary(cylinders, { onlyInUse: false })
    expect(summary).toHaveLength(5)

    // D, 30, 28 is included when onlyInUse is false
    const d30_28 = summary.find((s) => s.Type === 'D' && s.Diameter === '30' && s.Gauge === '28')
    expect(d30_28).toBeDefined()
    expect(d30_28.count).toBe(1)

    // Jac., 34, 24 is included when onlyInUse is false
    const jac34_24 = summary.find((s) => s.Type === 'Jac.' && s.Diameter === '34' && s.Gauge === '24')
    expect(jac34_24).toBeDefined()
    expect(jac34_24.count).toBe(1)
  })

  it('filterCylindersByGroup defaults to onlyInUse: true and returns only in-use matching cylinders', () => {
    // When no group filter is set, returns all cylinders
    expect(filterCylindersByGroup(cylinders, '')).toHaveLength(6)

    // Filter by D|30|32 -> exactly 2 (CYL-01, CYL-02)
    const filteredD = filterCylindersByGroup(cylinders, 'D|30|32')
    expect(filteredD).toHaveLength(2)
    expect(filteredD.map((c) => c.Serial_NOW)).toEqual(['CYL-01', 'CYL-02'])

    // Filter by D|30|28 (which is Spare) -> returns 0 because onlyInUse: true
    const filteredSpare = filterCylindersByGroup(cylinders, 'D|30|28', { onlyInUse: true })
    expect(filteredSpare).toHaveLength(0)

    // Filter by D|30|28 with onlyInUse: false -> returns CYL-03
    const filteredWithSpare = filterCylindersByGroup(cylinders, 'D|30|28', { onlyInUse: false })
    expect(filteredWithSpare).toHaveLength(1)
    expect(filteredWithSpare[0].Serial_NOW).toBe('CYL-03')
  })

  it('handles toggle behavior simulation for spec groups', () => {
    let selected = ''
    const toggle = (val) => { selected = (selected === val ? '' : val) }

    // Click D|30|32
    toggle('D|30|32')
    expect(selected).toBe('D|30|32')
    expect(filterCylindersByGroup(cylinders, selected)).toHaveLength(2)

    // Click again -> toggles off
    toggle('D|30|32')
    expect(selected).toBe('')
    expect(filterCylindersByGroup(cylinders, selected)).toHaveLength(6)
  })
})
