import { describe, expect, it } from 'vitest'
import {
  MC_NOTE_PREFIX,
  extractMovementMC,
  stripMCMetaFromNote,
  appendMCMetaToNote,
  getMovementMC,
  filterTransactionsByMachine,
  summarizeMachineParts,
} from './stockMovementMC'

describe('stockMovementMC utility', () => {
  describe('extractMovementMC', () => {
    it('extracts MC from Note with MC: prefix', () => {
      const note = 'เปลี่ยนสายพาน\nMC: SB-361M\nCategory: อะไหล่'
      expect(extractMovementMC(note)).toBe('SB-361M')
    })

    it('extracts MC from Note with Machine_MC: prefix', () => {
      const note = 'งานแจ้งซ่อม\nMachine_MC: DB-3411T'
      expect(extractMovementMC(note)).toBe('DB-3411T')
    })

    it('returns empty string when no MC prefix is found', () => {
      expect(extractMovementMC('หมายเหตุทั่วไป')).toBe('')
      expect(extractMovementMC('')).toBe('')
      expect(extractMovementMC(null)).toBe('')
    })
  })

  describe('stripMCMetaFromNote', () => {
    it('removes MC and Machine_MC lines from note', () => {
      const note = 'หมายเหตุสำคัญ\nMC: SB-361M\nข้อสังเกตเพิ่มเติม'
      expect(stripMCMetaFromNote(note)).toBe('หมายเหตุสำคัญ\nข้อสังเกตเพิ่มเติม')
    })

    it('returns empty string if note only contained MC prefix', () => {
      expect(stripMCMetaFromNote('MC: SB-361M')).toBe('')
    })
  })

  describe('appendMCMetaToNote', () => {
    it('appends MC prefix cleanly to note', () => {
      expect(appendMCMetaToNote('หมายเหตุ', 'SB-361M')).toBe('หมายเหตุ\nMC: SB-361M')
    })

    it('replaces old MC metadata without duplicating lines', () => {
      const oldNote = 'หมายเหตุเดิม\nMC: OLD-MC'
      expect(appendMCMetaToNote(oldNote, 'NEW-MC')).toBe('หมายเหตุเดิม\nMC: NEW-MC')
    })

    it('returns clean note if mc is empty', () => {
      expect(appendMCMetaToNote('หมายเหตุเดิม\nMC: OLD-MC', '')).toBe('หมายเหตุเดิม')
    })
  })

  describe('getMovementMC', () => {
    it('prioritizes row.MC column over note metadata', () => {
      const row = { MC: 'MC-01', Note: 'MC: MC-02' }
      expect(getMovementMC(row)).toBe('MC-01')
    })

    it('falls back to row.Machine_MC if row.MC is absent', () => {
      const row = { Machine_MC: 'MC-99', Note: 'ข้อความ' }
      expect(getMovementMC(row)).toBe('MC-99')
    })

    it('falls back to Note metadata if direct columns are absent', () => {
      const row = { Note: 'งานซ่อม\nMC: MC-55' }
      expect(getMovementMC(row)).toBe('MC-55')
    })

    it('returns empty string when no MC is present', () => {
      expect(getMovementMC({})).toBe('')
    })
  })

  describe('filterTransactionsByMachine', () => {
    it('filters transactions matching machine code case-insensitively', () => {
      const list = [
        { MC: 'SB-361M', Part_Code: 'SP-001' },
        { MC: 'sb-361m', Part_Code: 'SP-002' },
        { MC: 'DB-3411T', Part_Code: 'SP-003' },
      ]
      const results = filterTransactionsByMachine(list, 'SB-361m')
      expect(results).toHaveLength(2)
      expect(results[0].Part_Code).toBe('SP-001')
      expect(results[1].Part_Code).toBe('SP-002')
    })

    it('returns empty array if machineCode is empty', () => {
      expect(filterTransactionsByMachine([{ MC: 'SB-361M' }], '')).toEqual([])
    })
  })

  describe('summarizeMachineParts', () => {
    it('calculates total quantities, costs, and breakdown by part', () => {
      const txs = [
        {
          Part_Code: 'SP-001',
          Part_Name_EN: 'หลอดไฟ',
          Qty_Change: 2,
          Unit_Price: 30,
          Unit: 'pcs',
          created_date: '2026-06-01T10:00:00Z',
        },
        {
          Part_Code: 'SP-001',
          Part_Name_EN: 'หลอดไฟ',
          Qty_Change: 3,
          Unit_Price: 30,
          Unit: 'pcs',
          created_date: '2026-06-05T10:00:00Z',
        },
        {
          Part_Code: 'SP-020',
          Part_Name_EN: 'ลูกปืน',
          Qty_Change: 1,
          Unit_Price: 150,
          Unit: 'Pcs',
          created_date: '2026-06-12T10:00:00Z',
        },
      ]

      const summary = summarizeMachineParts(txs)
      expect(summary.totalTransactions).toBe(3)
      expect(summary.totalQty).toBe(6)
      expect(summary.totalCost).toBe(2 * 30 + 3 * 30 + 1 * 150) // 60 + 90 + 150 = 300
      expect(summary.uniquePartsCount).toBe(2)
      expect(summary.partBreakdown).toHaveLength(2)
      expect(summary.partBreakdown[0].partCode).toBe('SP-001')
      expect(summary.partBreakdown[0].totalQty).toBe(5)
      expect(summary.partBreakdown[0].lastDate).toBe('2026-06-05T10:00:00Z')
    })
  })
})
