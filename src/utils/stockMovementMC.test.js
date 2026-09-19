import { describe, expect, it } from 'vitest'
import {
  MC_NOTE_PREFIX,
  extractMovementMC,
  stripMCMetaFromNote,
  appendMCMetaToNote,
  getMovementMC,
  filterTransactionsByMachine,
  summarizeMachineParts,
  extractDateFromTxnId,
  getStockTxnDate,
  toInputDateValue,
  formatStockTxnDate,
  NO_MC_VALUE,
  SM_TXN_TYPE_OPTIONS,
  buildStockMovementMCOptions,
  matchStockMovementMC,
  matchStockMovementType,
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

  describe('extractDateFromTxnId', () => {
    it('parses YYYY-MM-DD from standard SM-YYYYMMDD-HHmmss... format', () => {
      expect(extractDateFromTxnId('SM-20260601-112142854')).toBe('2026-06-01')
      expect(extractDateFromTxnId('SM-20260602-085412175')).toBe('2026-06-02')
    })

    it('returns empty string if TXN_ID does not match pattern', () => {
      expect(extractDateFromTxnId('TXN-CUSTOM-001')).toBe('')
      expect(extractDateFromTxnId('')).toBe('')
      expect(extractDateFromTxnId(null)).toBe('')
    })
  })

  describe('getStockTxnDate', () => {
    it('prioritizes created_date if present', () => {
      expect(getStockTxnDate({ created_date: '2026-06-15', TXN_ID: 'SM-20260601-112142854' })).toBe('2026-06-15')
    })

    it('falls back to Date column if created_date is absent', () => {
      expect(getStockTxnDate({ Date: '2026-06-10', TXN_ID: 'SM-20260601-112142854' })).toBe('2026-06-10')
    })

    it('falls back to created_at if created_date and Date are absent', () => {
      expect(getStockTxnDate({ created_at: '2026-06-08T00:00:00Z' })).toBe('2026-06-08T00:00:00Z')
    })

    it('falls back to Date metadata in Note if direct columns are absent', () => {
      expect(getStockTxnDate({ Note: 'หมายเหตุ\nDate: 2026-06-05' })).toBe('2026-06-05')
    })

    it('recovers date from TXN_ID for legacy records with no date fields', () => {
      expect(getStockTxnDate({ TXN_ID: 'SM-20260601-112142854' })).toBe('2026-06-01')
    })

    it('returns empty string when no date source exists', () => {
      expect(getStockTxnDate({})).toBe('')
    })
  })

  describe('toInputDateValue', () => {
    it('formats ISO date string to YYYY-MM-DD for date input', () => {
      expect(toInputDateValue('2026-06-01T11:21:42.854Z')).toBe('2026-06-01')
      expect(toInputDateValue('2026-06-15')).toBe('2026-06-15')
    })

    it('returns empty string on invalid or empty input', () => {
      expect(toInputDateValue('')).toBe('')
      expect(toInputDateValue(null)).toBe('')
      expect(toInputDateValue('not-a-date')).toBe('')
    })
  })

  describe('formatStockTxnDate', () => {
    it('formats YYYY-MM-DD or ISO strings to dd/MM/yyyy', () => {
      expect(formatStockTxnDate('2026-06-01')).toBe('01/06/2026')
      expect(formatStockTxnDate('2026-12-25')).toBe('25/12/2026')
    })

    it('returns dash on empty input', () => {
      expect(formatStockTxnDate('')).toBe('—')
      expect(formatStockTxnDate(null)).toBe('—')
    })
  })

  describe('buildStockMovementMCOptions', () => {
    it('prepends "ไม่ระบุเครื่อง" option to machine list', () => {
      const opts = buildStockMovementMCOptions(['SB-361M', 'DB-3411T'])
      expect(opts[0]).toEqual({ value: NO_MC_VALUE, label: 'ไม่ระบุเครื่อง' })
      expect(opts[1]).toEqual({ value: 'SB-361M', label: 'SB-361M' })
      expect(opts[2]).toEqual({ value: 'DB-3411T', label: 'DB-3411T' })
    })

    it('handles object-based options', () => {
      const opts = buildStockMovementMCOptions([
        { value: 'MC-1', label: 'MC-1' },
      ])
      expect(opts[0].value).toBe(NO_MC_VALUE)
      expect(opts[1].value).toBe('MC-1')
    })
  })

  describe('matchStockMovementMC', () => {
    it('returns true when filterValue is empty or undefined', () => {
      expect(matchStockMovementMC({ MC: 'SB-361M' }, '')).toBe(true)
      expect(matchStockMovementMC({ MC: 'SB-361M' }, [])).toBe(true)
      expect(matchStockMovementMC({ MC: 'SB-361M' }, null)).toBe(true)
    })

    it('matches specific machine by array value', () => {
      const row = { MC: 'SB-361M' }
      expect(matchStockMovementMC(row, ['SB-361M'])).toBe(true)
      expect(matchStockMovementMC(row, ['DB-3411T'])).toBe(false)
      expect(matchStockMovementMC(row, ['DB-3411T', 'sb-361m'])).toBe(true)
    })

    it('matches "ไม่ระบุเครื่อง" for rows with no MC', () => {
      const emptyRow = { Note: 'No MC here' }
      const hasMCRow = { Note: 'MC: SB-361M' }
      expect(matchStockMovementMC(emptyRow, [NO_MC_VALUE])).toBe(true)
      expect(matchStockMovementMC(emptyRow, ['ไม่ระบุเครื่อง'])).toBe(true)
      expect(matchStockMovementMC(hasMCRow, [NO_MC_VALUE])).toBe(false)
      expect(matchStockMovementMC(emptyRow, NO_MC_VALUE)).toBe(true)
      expect(matchStockMovementMC(emptyRow, 'ไม่ระบุ')).toBe(true)
    })

    it('matches machine by substring text query', () => {
      const row = { MC: 'SB-361M' }
      expect(matchStockMovementMC(row, '361')).toBe(true)
      expect(matchStockMovementMC(row, 'sb')).toBe(true)
      expect(matchStockMovementMC(row, 'db')).toBe(false)
    })
  })

  describe('matchStockMovementType', () => {
    it('returns true when filterValue is empty', () => {
      expect(matchStockMovementType({ TXN_Type: 'RECEIVE' }, '')).toBe(true)
      expect(matchStockMovementType({ TXN_Type: 'RECEIVE' }, [])).toBe(true)
    })

    it('matches English type by array selection', () => {
      const row = { TXN_Type: 'RECEIVE' }
      expect(matchStockMovementType(row, ['RECEIVE'])).toBe(true)
      expect(matchStockMovementType(row, ['ISSUE'])).toBe(false)
      expect(matchStockMovementType(row, ['ISSUE', 'RECEIVE'])).toBe(true)
    })

    it('matches Thai label by array selection', () => {
      const row = { TXN_Type: 'ISSUE' }
      expect(matchStockMovementType(row, ['เบิกจ่าย'])).toBe(true)
      expect(matchStockMovementType(row, ['รับเข้า'])).toBe(false)
    })

    it('matches text query in English and Thai', () => {
      const row = { TXN_Type: 'ADJUST' }
      expect(matchStockMovementType(row, 'adjust')).toBe(true)
      expect(matchStockMovementType(row, 'ปรับสต๊อก')).toBe(true)
      expect(matchStockMovementType(row, 'ปรับ')).toBe(true)
      expect(matchStockMovementType(row, 'รับเข้า')).toBe(false)
      expect(matchStockMovementType(row, 'issue')).toBe(false)
    })
  })
})

