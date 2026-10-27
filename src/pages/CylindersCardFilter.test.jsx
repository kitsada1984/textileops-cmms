import { describe, it, expect } from 'vitest'
import {
  MACHINE_REF_OPTIONS,
  buildMachineRefSummary,
  filterCylindersByMachineRef,
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
