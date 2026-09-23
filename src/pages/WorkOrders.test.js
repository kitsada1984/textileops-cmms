import { describe, it, expect } from 'vitest'
import { getWorkOrderDetails } from './WorkOrders.jsx'

describe('WorkOrders utilities', () => {
  describe('getWorkOrderDetails', () => {
    it('returns "—" for empty or null work orders', () => {
      expect(getWorkOrderDetails(null)).toBe('—')
      expect(getWorkOrderDetails(undefined)).toBe('—')
      expect(getWorkOrderDetails({})).toBe('—')
    })

    it('returns Comment when Comment is normal text', () => {
      const job = { Comment: 'เข็มหัก 2 เล่ม เปลี่ยนเข็มใหม่' }
      expect(getWorkOrderDetails(job)).toBe('เข็มหัก 2 เล่ม เปลี่ยนเข็มใหม่')
    })

    it('returns Details or details when Comment is missing', () => {
      expect(getWorkOrderDetails({ Details: 'ปรับศูนย์กระบอกสูบ' })).toBe('ปรับศูนย์กระบอกสูบ')
      expect(getWorkOrderDetails({ details: 'ล้างทำความสะอาดชุดฟีดเดอร์' })).toBe('ล้างทำความสะอาดชุดฟีดเดอร์')
    })

    it('returns Problem when Comment is synced_from_repair JSON metadata', () => {
      const job = {
        Comment: JSON.stringify({
          synced_from_repair: true,
          request_no: 'REQ-001',
          parts_used: 'เข็ม 10 เล่ม',
        }),
        Problem: 'ผ้าเป็นทาง มีเสียงดัง',
      }
      expect(getWorkOrderDetails(job)).toBe('ผ้าเป็นทาง มีเสียงดัง')
    })

    it('falls back to Solution or details when Comment is synced_from_repair JSON and Problem is missing', () => {
      const job = {
        Comment: '{"synced_from_repair":true}',
        Solution: 'เปลี่ยนสายพานและตั้งตึง',
      }
      expect(getWorkOrderDetails(job)).toBe('เปลี่ยนสายพานและตั้งตึง')
    })

    it('handles legacy column aliases: Problem, problem, Detail, Description', () => {
      expect(getWorkOrderDetails({ Problem: 'ด้ายขาดบ่อย' })).toBe('ด้ายขาดบ่อย')
      expect(getWorkOrderDetails({ problem: 'ยางพลิก' })).toBe('ยางพลิก')
      expect(getWorkOrderDetails({ Detail: 'เช็คระดับน้ำมัน' })).toBe('เช็คระดับน้ำมัน')
      expect(getWorkOrderDetails({ Description: 'ตรวจระบบไฟ' })).toBe('ตรวจระบบไฟ')
    })
  })
})
