import { describe, it, expect } from 'vitest'
import {
  parseJsonSafe,
  parseCylinderAuditLog,
  filterCylinderHistory,
  summarizeCylinderHistory,
} from './cylinderHistory'

describe('cylinderHistory utility', () => {
  describe('parseJsonSafe', () => {
    it('returns parsed object from valid JSON', () => {
      expect(parseJsonSafe('{"a": 1}')).toEqual({ a: 1 })
    })

    it('returns fallback on invalid JSON or null', () => {
      expect(parseJsonSafe('invalid', { def: true })).toEqual({ def: true })
      expect(parseJsonSafe(null, {})).toEqual({})
    })
  })

  describe('parseCylinderAuditLog', () => {
    it('correctly parses SWAP audit logs', () => {
      const rawLog = {
        id: 'log-1',
        ActionType: 'SWAP',
        created_at: '2026-10-12T10:00:00Z',
        User: 'Somchai',
        Comment: 'สลับกระบอก CYL-01 กับ CYL-02',
        RecordID: 'CYL-01 <-> CYL-02',
        NewValue: JSON.stringify({
          swapCols: ['Location', 'Machine_Ref'],
          in: { id: 'c1', serial: 'CYL-01', mc: 'MC-01', loc: 'โรงทอ 1', standard: 'Standard' },
          out: { id: 'c2', serial: 'CYL-02', mc: 'MC-02', loc: 'โรงทอ 2', standard: 'Standard' },
        }),
      }

      const parsed = parseCylinderAuditLog(rawLog)
      expect(parsed.type).toBe('SWAP')
      expect(parsed.in.serial).toBe('CYL-01')
      expect(parsed.in.mc).toBe('MC-01')
      expect(parsed.out.serial).toBe('CYL-02')
      expect(parsed.out.mc).toBe('MC-02')
      expect(parsed.user).toBe('Somchai')
    })

    it('correctly parses UPDATE audit logs', () => {
      const rawLog = {
        id: 'log-2',
        ActionType: 'UPDATE',
        created_at: '2026-10-12T11:00:00Z',
        User: 'Somsak',
        Comment: 'เปลี่ยนเครื่องจักรสำหรับกระบอก CYL-05: จาก MC-01 ➔ MC-03',
        RecordID: 'CYL-05',
        OldValue: JSON.stringify({ mc: 'MC-01', loc: 'โรงทอ 1', serial: 'CYL-05' }),
        NewValue: JSON.stringify({ mc: 'MC-03', loc: 'โรงทอ 3', serial: 'CYL-05' }),
      }

      const parsed = parseCylinderAuditLog(rawLog)
      expect(parsed.type).toBe('UPDATE')
      expect(parsed.mcFrom).toBe('MC-01')
      expect(parsed.mcTo).toBe('MC-03')
      expect(parsed.serial).toBe('CYL-05')
    })
  })

  describe('filterCylinderHistory', () => {
    const mockLogs = [
      {
        id: '1',
        Module: 'CYLINDERS',
        ActionType: 'SWAP',
        created_at: '2026-10-10T10:00:00Z',
        RecordID: 'CYL-A <-> CYL-B',
        NewValue: JSON.stringify({
          in: { serial: 'CYL-A', mc: 'MC-01', loc: 'โรงทอ 1' },
          out: { serial: 'CYL-B', mc: 'MC-02', loc: 'โรงทอ 2' },
        }),
        Comment: 'สลับ CYL-A กับ CYL-B',
      },
      {
        id: '2',
        Module: 'CYLINDERS',
        ActionType: 'UPDATE',
        created_at: '2026-10-11T12:00:00Z',
        RecordID: 'CYL-A',
        OldValue: JSON.stringify({ mc: 'MC-01' }),
        NewValue: JSON.stringify({ mc: 'MC-04', serial: 'CYL-A' }),
        Comment: 'ย้ายกระบอก CYL-A จาก MC-01 ไป MC-04',
      },
      {
        id: '3',
        Module: 'CYLINDERS',
        ActionType: 'SWAP',
        created_at: '2026-10-09T08:00:00Z',
        RecordID: 'CYL-X <-> CYL-Y',
        NewValue: JSON.stringify({
          in: { serial: 'CYL-X', mc: 'MC-99' },
          out: { serial: 'CYL-Y', mc: 'MC-88' },
        }),
      },
    ]

    it('filters logs by machine code MC-01', () => {
      const history = filterCylinderHistory(mockLogs, { mc: 'MC-01' })
      expect(history).toHaveLength(2)
      // Sorted newest first
      expect(history[0].id).toBe('2')
      expect(history[1].id).toBe('1')
    })

    it('filters logs by cylinder serial CYL-A', () => {
      const history = filterCylinderHistory(mockLogs, { serial: 'CYL-A' })
      expect(history).toHaveLength(2)
    })

    it('returns empty array if no matches', () => {
      const history = filterCylinderHistory(mockLogs, { mc: 'MC-NONEXISTENT' })
      expect(history).toEqual([])
    })
  })

  describe('summarizeCylinderHistory', () => {
    it('computes counts and unique entities', () => {
      const historyList = [
        {
          type: 'SWAP',
          date: '2026-10-12T10:00:00Z',
          in: { mc: 'MC-01', serial: 'CYL-1' },
          out: { mc: 'MC-02', serial: 'CYL-2' },
        },
        {
          type: 'UPDATE',
          date: '2026-10-11T10:00:00Z',
          mcFrom: 'MC-01',
          mcTo: 'MC-03',
          serial: 'CYL-1',
        },
      ]

      const summary = summarizeCylinderHistory(historyList)
      expect(summary.total).toBe(2)
      expect(summary.swapCount).toBe(1)
      expect(summary.updateCount).toBe(1)
      expect(summary.machines).toContain('MC-01')
      expect(summary.machines).toContain('MC-02')
      expect(summary.machines).toContain('MC-03')
      expect(summary.cylinders).toContain('CYL-1')
      expect(summary.cylinders).toContain('CYL-2')
    })
  })
})
