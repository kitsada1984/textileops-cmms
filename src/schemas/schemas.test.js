import { describe, it, expect } from 'vitest'
import {
  telegramAdminSchema,
  spareNeedleRequestSchema,
  repairRequestSchema,
} from './index'

describe('Domain Zod Schemas Validation', () => {
  describe('telegramAdminSchema', () => {
    it('validates valid admin data', () => {
      const data = {
        name: 'นายสมชาย ผู้ดูแล',
        chat_id: '123456789',
        note: 'แอดมินกะเช้า',
      }
      const parsed = telegramAdminSchema.parse(data)
      expect(parsed.name).toBe('นายสมชาย ผู้ดูแล')
      expect(parsed.chat_id).toBe('123456789')
      expect(parsed.note).toBe('แอดมินกะเช้า')
    })

    it('supports negative chat id for Telegram supergroups', () => {
      const data = {
        name: 'แอดมินกลุ่มกลาง',
        chat_id: '-100123456789',
      }
      const parsed = telegramAdminSchema.parse(data)
      expect(parsed.chat_id).toBe('-100123456789')
      expect(parsed.note).toBe('')
    })

    it('rejects empty name and non-numeric chat_id', () => {
      const invalid = {
        name: '   ',
        chat_id: 'abc-not-number',
      }
      const res = telegramAdminSchema.safeParse(invalid)
      expect(res.success).toBe(false)
      if (!res.success) {
        const errorMessages = res.error.issues.map((i) => i.message)
        expect(errorMessages).toContain('กรุณาระบุชื่อผู้ดูแลระบบ (Admin Name)')
        expect(errorMessages).toContain('Telegram Chat ID ต้องเป็นตัวเลขเท่านั้น (เช่น 123456789 หรือ -100xxx)')
      }
    })
  })

  describe('spareNeedleRequestSchema', () => {
    it('validates and coerces total_needles number', () => {
      const data = {
        machine_mc: 'MC-01',
        technician_name: 'ช่างสมหมาย',
        gauge: '28G',
        total_needles: '100', // string coerced to number
      }
      const parsed = spareNeedleRequestSchema.parse(data)
      expect(parsed.total_needles).toBe(100)
      expect(parsed.shift).toBe('กะเช้า')
    })

    it('fails if total_needles is less than 1', () => {
      const data = {
        machine_mc: 'MC-01',
        technician_name: 'ช่างสมหมาย',
        gauge: '28G',
        total_needles: 0,
      }
      const res = spareNeedleRequestSchema.safeParse(data)
      expect(res.success).toBe(false)
    })
  })

  describe('repairRequestSchema', () => {
    it('validates repair request with defaults', () => {
      const data = {
        cylinder_serial: 'CYL-01',
        machine_mc: 'MC-10',
        reported_by: 'กฤษฎา',
        problem_description: 'เข็มหักบ่อยบริเวณ dial',
      }
      const parsed = repairRequestSchema.parse(data)
      expect(parsed.priority).toBe('ปกติ')
      expect(parsed.repair_type).toBe('EASY')
      expect(parsed.status).toBe('PENDING')
    })

    it('rejects missing problem description', () => {
      const data = {
        cylinder_serial: 'CYL-01',
        machine_mc: 'MC-10',
        reported_by: 'กฤษฎา',
        problem_description: '',
      }
      const res = repairRequestSchema.safeParse(data)
      expect(res.success).toBe(false)
    })
  })
})
