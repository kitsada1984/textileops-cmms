import { describe, it, expect } from 'vitest'
import {
  getUnlinkedMachines,
  resolveMachineRefFromLocation,
  mapMachineToCylinderForm,
  formatMachineOptionLabel,
} from './cylinderMachineImport'

describe('cylinderMachineImport utility', () => {
  describe('getUnlinkedMachines', () => {
    it('returns empty array if machines or cylinders is null/empty', () => {
      expect(getUnlinkedMachines(null, [])).toEqual([])
      expect(getUnlinkedMachines([], [])).toEqual([])
    })

    it('filters out machines that do not have Serial_OLD', () => {
      const machines = [
        { Mc: 'MC-01', Serial_OLD: '' },
        { Mc: 'MC-02', Serial_OLD: '   ' },
        { Mc: 'MC-03', Serial_OLD: null },
        { Mc: 'MC-04', Serial_OLD: 'SN-04' },
      ]
      const cylinders = []
      const result = getUnlinkedMachines(machines, cylinders)
      expect(result).toHaveLength(1)
      expect(result[0].Mc).toBe('MC-04')
    })

    it('filters out machines whose Serial_OLD already exists in cylinders (case-insensitive)', () => {
      const machines = [
        { Mc: 'MC-01', Serial_OLD: 'SN-001' },
        { Mc: 'MC-02', Serial_OLD: 'SN-002' },
        { Mc: 'MC-03', Serial_OLD: 'sn-003' },
      ]
      const cylinders = [
        { Serial_OLD: 'SN-001', Serial_NOW: 'CYL-NOW-1' },
        { Serial_OLD: 'SN-003', Serial_NOW: 'CYL-NOW-3' },
      ]
      const result = getUnlinkedMachines(machines, cylinders)
      expect(result).toHaveLength(1)
      expect(result[0].Mc).toBe('MC-02')
      expect(result[0].Serial_OLD).toBe('SN-002')
    })
  })

  describe('resolveMachineRefFromLocation', () => {
    it('returns In-use-GMK3 for locations containing GMK3 or 3', () => {
      expect(resolveMachineRefFromLocation('โรงทอ 3')).toBe('In-use-GMK3')
      expect(resolveMachineRefFromLocation('GMK3 Section')).toBe('In-use-GMK3')
    })

    it('returns In-use-GMK1 for locations containing GMK1 or 1', () => {
      expect(resolveMachineRefFromLocation('โรงทอ 1')).toBe('In-use-GMK1')
      expect(resolveMachineRefFromLocation('GMK1-A')).toBe('In-use-GMK1')
    })

    it('falls back to In-use-GMK1 for unspecified locations', () => {
      expect(resolveMachineRefFromLocation('')).toBe('In-use-GMK1')
    })
  })

  describe('mapMachineToCylinderForm', () => {
    it('maps machine specs to cylinder form and leaves Serial_NOW empty', () => {
      const machine = {
        Mc: 'MC-10',
        Serial_OLD: 'OLD-999',
        Serial_NEW: 'NEW-888',
        Standard: 'Standard 28G',
        Location: 'โรงทอ GMK3',
        Type: 'Single Jersey',
        Manufacturer: 'Mayer',
        Diameter: 30,
        Gauge: 28,
        Needle: 2640,
        Feeder: 96,
      }
      const initialForm = {
        ITEM: '1',
        Comment: 'Existing comment',
      }

      const mapped = mapMachineToCylinderForm(machine, initialForm)

      expect(mapped.Serial_OLD).toBe('OLD-999')
      expect(mapped.Serial_NOW).toBe('') // Must be empty per user requirement
      expect(mapped.NewMC).toBe('MC-10')
      expect(mapped.Standard).toBe('Standard 28G')
      expect(mapped.Location).toBe('โรงทอ GMK3')
      expect(mapped.Type).toBe('Single Jersey')
      expect(mapped.Manufacturer).toBe('Mayer')
      expect(mapped.Diameter).toBe('30')
      expect(mapped.Gauge).toBe('28')
      expect(mapped.Needle).toBe('2640')
      expect(mapped.Feeder).toBe('96')
      expect(mapped.Status_Now).toBe('STANDARD')
      expect(mapped.Machine_Ref).toBe('In-use-GMK3')
      // Preserves unmapped fields
      expect(mapped.ITEM).toBe('1')
      expect(mapped.Comment).toBe('Existing comment')
    })
  })

  describe('formatMachineOptionLabel', () => {
    it('formats option label with machine code, serial, and specs', () => {
      const machine = {
        Mc: 'MC-05',
        Serial_OLD: 'SN-555',
        Type: 'Single',
        Diameter: '30',
        Gauge: '28',
        Location: 'GMK1',
      }
      const label = formatMachineOptionLabel(machine)
      expect(label).toContain('MC-05')
      expect(label).toContain('ซีเรียลเดิม: SN-555')
      expect(label).toContain('Single')
      expect(label).toContain('30"')
      expect(label).toContain('28G')
      expect(label).toContain('GMK1')
    })
  })
})
