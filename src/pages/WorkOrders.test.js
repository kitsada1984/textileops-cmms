import { describe, it, expect } from 'vitest'
import { getWorkOrderDetails, buildTechFromUser, getUnregisteredLineUsers } from './WorkOrders.jsx'

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

  describe('buildTechFromUser', () => {
    it('auto-fills Name, Line_ID, Avatar_URL, and User_ID from a LINE user', () => {
      const mockUser = {
        id: 'usr_001',
        username: 'line_user99',
        full_name: 'สมชาย ช่างปรับ',
        line_user_id: 'U66f2b207af94e739c10a3cf937af2965',
        line_display_name: 'Somchai (LINE)',
        line_picture_url: 'https://example.com/avatar.jpg',
      }
      const initialForm = {
        Name: '',
        Phone: '',
        SkillLevel: 'Senior',
        Specialization: '',
        Status: 'ACTIVE',
        Line_ID: '',
        Telegram_ID: '',
      }

      const result = buildTechFromUser(mockUser, initialForm)
      expect(result.Name).toBe('สมชาย ช่างปรับ')
      expect(result.Line_ID).toBe('U66f2b207af94e739c10a3cf937af2965')
      expect(result.Avatar_URL).toBe('https://example.com/avatar.jpg')
      expect(result.User_ID).toBe('usr_001')
      expect(result.SkillLevel).toBe('Senior')
    })

    it('preserves existing custom Name if already typed by admin', () => {
      const mockUser = {
        id: 'usr_002',
        username: 'line_user12',
        full_name: 'วิชัย',
        line_user_id: 'U999888777',
      }
      const existingForm = {
        Name: 'ช.วิชัย (หัวหน้ากะเช้า)',
        Line_ID: '',
      }

      const result = buildTechFromUser(mockUser, existingForm)
      expect(result.Name).toBe('ช.วิชัย (หัวหน้ากะเช้า)')
      expect(result.Line_ID).toBe('U999888777')
    })
  })

  describe('getUnregisteredLineUsers', () => {
    it('returns only users who have line_user_id and are not in technicians', () => {
      const systemUsers = [
        { id: 'u1', full_name: 'ช่างหนึ่ง', line_user_id: 'U1111' }, // already in tech
        { id: 'u2', full_name: 'ช่างสอง', line_user_id: 'U2222' }, // not in tech -> should return
        { id: 'u3', full_name: 'ผู้ใช้ทั่วไปไม่มี LINE', line_user_id: null }, // no LINE ID -> excluded
        { id: 'u4', full_name: 'ช่างสาม', line_user_id: '' }, // empty LINE ID -> excluded
      ]
      const technicians = [
        { id: 'TECH-001', Name: 'ช่างหนึ่ง', Line_ID: 'U1111' },
      ]

      const unregistered = getUnregisteredLineUsers(systemUsers, technicians)
      expect(unregistered).toHaveLength(1)
      expect(unregistered[0].id).toBe('u2')
      expect(unregistered[0].line_user_id).toBe('U2222')
    })
  })
})
