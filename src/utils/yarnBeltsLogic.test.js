import { describe, expect, it } from 'vitest'
import {
  aggregateYarnBelts,
  extractTape5FromRemark,
  getMachineTapes,
  machineHasBelts,
  normalizeBeltNo,
  sortBeltNumbers,
} from './yarnBeltsLogic'

const MOCK_MACHINES = [
  {
    Mc: 'MC-01',
    Location: 'GMK1',
    Type: 'Single Jersey',
    Tape1_No: '8200',
    Tape2_No: '8200',
    Tape3_No: '9800',
    Tape4_No: '9800',
    Tape5_No: '11000',
  },
  {
    Mc: 'MC-02',
    Location: 'GMK1',
    Type: 'Single Jersey',
    Tape1_No: '8200',
    Tape2_No: '8200',
    Tape3_No: '9800',
    Tape4_No: '9800',
    Remark: 'Tape5: 11000\nSome other notes', // Tape 5 inside remark
  },
  {
    Mc: 'MC-03',
    Location: 'GMK3',
    Type: 'Double Jersey',
    Tape1_No: '7200',
    Tape2_No: '7200',
    Tape3_No: '8800',
    Tape4_No: '8800',
    Tape5_No: '-', // Dash should be ignored
  },
  {
    Mc: 'MC-04',
    Location: 'GMK3',
    Type: 'Rib',
    Tape1_No: '8800',
    Tape2_No: '8800',
    Tape3_No: '10400',
    Tape4_No: '10400',
    Tape5_No: '12200',
  },
  {
    Mc: 'MC-05',
    Location: 'GMK1',
    Type: 'Interlock',
    Tape1_No: '—',
    Tape2_No: '',
    Tape3_No: null,
    Tape4_No: undefined,
    Tape5_No: 'N/A',
  },
]

describe('yarnBeltsLogic', () => {
  describe('normalizeBeltNo', () => {
    it('normalizes valid belt numbers', () => {
      expect(normalizeBeltNo('8200')).toBe('8200')
      expect(normalizeBeltNo('  9800  ')).toBe('9800')
      expect(normalizeBeltNo(11000)).toBe('11000')
    })

    it('returns empty string for invalid, empty, or dash values', () => {
      expect(normalizeBeltNo('')).toBe('')
      expect(normalizeBeltNo('   ')).toBe('')
      expect(normalizeBeltNo('-')).toBe('')
      expect(normalizeBeltNo('—')).toBe('')
      expect(normalizeBeltNo('n/a')).toBe('')
      expect(normalizeBeltNo('N/A')).toBe('')
      expect(normalizeBeltNo(null)).toBe('')
      expect(normalizeBeltNo(undefined)).toBe('')
    })
  })

  describe('extractTape5FromRemark', () => {
    it('extracts Tape 5 from remark prefix', () => {
      expect(extractTape5FromRemark('Tape5: 11000')).toBe('11000')
      expect(extractTape5FromRemark('ImageUrl: https://img.jpg\nTape5: 12200\nOther')).toBe('12200')
    })

    it('returns empty string if Tape 5 is not present', () => {
      expect(extractTape5FromRemark('')).toBe('')
      expect(extractTape5FromRemark('Just notes')).toBe('')
    })
  })

  describe('getMachineTapes', () => {
    it('returns all 5 tape numbers for machine with Tape 5 in column', () => {
      const tapes = getMachineTapes(MOCK_MACHINES[0])
      expect(tapes).toEqual({
        1: '8200',
        2: '8200',
        3: '9800',
        4: '9800',
        5: '11000',
      })
    })

    it('falls back to remark for Tape 5 if not in column', () => {
      const tapes = getMachineTapes(MOCK_MACHINES[1])
      expect(tapes[5]).toBe('11000')
    })

    it('ignores dashes and invalid values', () => {
      const tapes = getMachineTapes(MOCK_MACHINES[2])
      expect(tapes[5]).toBe('')
    })
  })

  describe('machineHasBelts', () => {
    it('returns true if machine has at least 1 belt', () => {
      expect(machineHasBelts(MOCK_MACHINES[0])).toBe(true)
      expect(machineHasBelts(MOCK_MACHINES[2])).toBe(true)
    })

    it('returns false if machine has no valid belts', () => {
      expect(machineHasBelts(MOCK_MACHINES[4])).toBe(false)
    })
  })

  describe('sortBeltNumbers', () => {
    it('sorts numeric belt numbers in ascending order', () => {
      const list = ['11000', '7200', '9800', '8200', '8800', '10400']
      list.sort(sortBeltNumbers)
      expect(list).toEqual(['7200', '8200', '8800', '9800', '10400', '11000'])
    })
  })

  describe('aggregateYarnBelts', () => {
    it('aggregates overall totals and tape breakdown accurately for all machines', () => {
      const result = aggregateYarnBelts(MOCK_MACHINES)

      // Total belts count:
      // MC-01: 5 (2x8200, 2x9800, 1x11000)
      // MC-02: 5 (2x8200, 2x9800, 1x11000)
      // MC-03: 4 (2x7200, 2x8800)
      // MC-04: 5 (2x8800, 2x10400, 1x12200)
      // MC-05: 0
      // Total = 5 + 5 + 4 + 5 = 19 belts
      expect(result.stats.totalBelts).toBe(19)
      expect(result.stats.totalMachines).toBe(5)
      expect(result.stats.machinesWithBelts).toBe(4)

      // Check overall summary
      // Belts: 7200 (2), 8200 (4), 8800 (4), 9800 (4), 10400 (2), 11000 (2), 12200 (1)
      expect(result.stats.uniqueBeltSizes).toBe(7)

      const b8200 = result.overallSummary.find((b) => b.beltNo === '8200')
      expect(b8200).toBeDefined()
      expect(b8200.totalQty).toBe(4) // 2 from MC-01, 2 from MC-02
      expect(b8200.machineCount).toBe(2)
      expect(b8200.tapePositions[1]).toBe(2) // Tape 1 has 2
      expect(b8200.tapePositions[2]).toBe(2) // Tape 2 has 2
      expect(b8200.tapePositions[3]).toBe(0)

      const b7200 = result.overallSummary.find((b) => b.beltNo === '7200')
      expect(b7200.totalQty).toBe(2)
      expect(b7200.machineCount).toBe(1)

      const b11000 = result.overallSummary.find((b) => b.beltNo === '11000')
      expect(b11000.totalQty).toBe(2)
      expect(b11000.tapePositions[5]).toBe(2)

      // Check tape positions breakdown
      // Tape 1: 7200 (1), 8200 (2), 8800 (1) -> total 4
      const tape1_8200 = result.tapeBreakdown[1].find((b) => b.beltNo === '8200')
      expect(tape1_8200.qty).toBe(2)

      // Tape 5: 11000 (2), 12200 (1) -> total 3
      expect(result.tapeBreakdown[5].find((b) => b.beltNo === '11000').qty).toBe(2)
      expect(result.tapeBreakdown[5].find((b) => b.beltNo === '12200').qty).toBe(1)
    })

    it('filters aggregation correctly when locationFilter is set', () => {
      const result = aggregateYarnBelts(MOCK_MACHINES, { locationFilter: 'GMK3' })

      // Only MC-03 and MC-04
      expect(result.stats.totalMachines).toBe(2)
      expect(result.stats.totalBelts).toBe(9) // MC-03 (4) + MC-04 (5)

      // 8200 should not exist in GMK3
      expect(result.overallSummary.find((b) => b.beltNo === '8200')).toBeUndefined()

      // 8800 exists in both MC-03 (2) and MC-04 (2) -> 4
      const b8800 = result.overallSummary.find((b) => b.beltNo === '8800')
      expect(b8800.totalQty).toBe(4)
      expect(b8800.machineCount).toBe(2)
    })

    it('filters machine table when search query is provided', () => {
      const result = aggregateYarnBelts(MOCK_MACHINES, { search: 'MC-01' })
      expect(result.displayMachines.length).toBe(1)
      expect(result.displayMachines[0].Mc).toBe('MC-01')
    })

    it('filters machine table when selectedBelt is clicked/set', () => {
      const result = aggregateYarnBelts(MOCK_MACHINES, { selectedBelt: '12200' })
      expect(result.displayMachines.length).toBe(1)
      expect(result.displayMachines[0].Mc).toBe('MC-04')
    })
  })
})
