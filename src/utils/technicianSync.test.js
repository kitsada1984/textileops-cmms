import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getNextTechnicianId, syncNotificationTechsToRegistry } from './technicianSync'
import { TechnicianAPI } from '../api/entities'

vi.mock('../api/entities', () => ({
  TechnicianAPI: {
    list: vi.fn(),
    saveAll: vi.fn(),
  },
}))

describe('technicianSync utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNextTechnicianId', () => {
    it('returns TECH-001 for empty list', () => {
      expect(getNextTechnicianId([])).toBe('TECH-001')
      expect(getNextTechnicianId(null)).toBe('TECH-001')
    })

    it('returns next sequential ID from existing technicians', () => {
      const list = [
        { Technician_ID: 'TECH-001' },
        { Technician_ID: 'TECH-002' },
        { Technician_ID: 'TECH-005' },
      ]
      expect(getNextTechnicianId(list)).toBe('TECH-006')
    })
  })

  describe('syncNotificationTechsToRegistry', () => {
    it('returns zeroes when notificationTechs is empty', async () => {
      const res = await syncNotificationTechsToRegistry([])
      expect(res.createdCount).toBe(0)
      expect(res.updatedCount).toBe(0)
      expect(TechnicianAPI.saveAll).not.toHaveBeenCalled()
    })

    it('creates new technicians from LINE contacts and assigns TECH-xxx IDs', async () => {
      TechnicianAPI.list.mockResolvedValueOnce([])
      TechnicianAPI.saveAll.mockResolvedValueOnce(undefined)

      const lineTechs = [
        { name: 'ช่างหนึ่ง', user_id: 'U1111111111' },
        { name: 'ช่างต้อม', user_id: 'U2222222222' },
      ]

      const res = await syncNotificationTechsToRegistry(lineTechs, 'LINE')

      expect(res.createdCount).toBe(2)
      expect(res.createdNames).toEqual(['ช่างหนึ่ง', 'ช่างต้อม'])
      expect(TechnicianAPI.saveAll).toHaveBeenCalledTimes(1)

      const savedList = TechnicianAPI.saveAll.mock.calls[0][0]
      expect(savedList).toHaveLength(2)
      expect(savedList[0]).toMatchObject({
        Technician_ID: 'TECH-001',
        Name: 'ช่างหนึ่ง',
        Line_ID: 'U1111111111',
        Status: 'ACTIVE',
      })
      expect(savedList[1]).toMatchObject({
        Technician_ID: 'TECH-002',
        Name: 'ช่างต้อม',
        Line_ID: 'U2222222222',
        Status: 'ACTIVE',
      })
    })

    it('updates existing technician matched by Line_ID without creating duplicate', async () => {
      const existing = [
        {
          id: 'TECH-001',
          Technician_ID: 'TECH-001',
          Name: 'ช่างหนึ่ง',
          Line_ID: 'U1111111111',
          Phone: '0812345678',
          Status: 'ACTIVE',
        },
      ]
      TechnicianAPI.list.mockResolvedValueOnce(existing)
      TechnicianAPI.saveAll.mockResolvedValueOnce(undefined)

      const lineTechs = [
        { name: 'ช่างหนึ่ง อัปเดต', user_id: 'U1111111111' },
      ]

      const res = await syncNotificationTechsToRegistry(lineTechs, 'LINE')

      expect(res.createdCount).toBe(0)
      expect(TechnicianAPI.saveAll).not.toHaveBeenCalled() // No change since Line_ID already matched and Name wasn't a placeholder
    })

    it('links Telegram_ID to existing technician when matched by name', async () => {
      const existing = [
        {
          id: 'TECH-001',
          Technician_ID: 'TECH-001',
          Name: 'ช่างหนึ่ง',
          Line_ID: 'U1111111111',
          Telegram_ID: '',
          Status: 'ACTIVE',
        },
      ]
      TechnicianAPI.list.mockResolvedValueOnce(existing)
      TechnicianAPI.saveAll.mockResolvedValueOnce(undefined)

      const tgTechs = [
        { name: 'ช่างหนึ่ง', chat_id: '99887766' },
      ]

      const res = await syncNotificationTechsToRegistry(tgTechs, 'TELEGRAM')

      expect(res.createdCount).toBe(0)
      expect(res.updatedCount).toBe(1)
      expect(TechnicianAPI.saveAll).toHaveBeenCalledTimes(1)

      const savedList = TechnicianAPI.saveAll.mock.calls[0][0]
      expect(savedList[0]).toMatchObject({
        Technician_ID: 'TECH-001',
        Name: 'ช่างหนึ่ง',
        Line_ID: 'U1111111111',
        Telegram_ID: '99887766',
      })
    })

    it('preserves existing technicians not present in notificationTechs (never deletes)', async () => {
      const existing = [
        { id: 'TECH-001', Technician_ID: 'TECH-001', Name: 'ช่างเก่าในระบบ' },
      ]
      TechnicianAPI.list.mockResolvedValueOnce(existing)
      TechnicianAPI.saveAll.mockResolvedValueOnce(undefined)

      const lineTechs = [
        { name: 'ช่างใหม่', user_id: 'U3333333333' },
      ]

      const res = await syncNotificationTechsToRegistry(lineTechs, 'LINE')

      expect(res.createdCount).toBe(1)
      const savedList = TechnicianAPI.saveAll.mock.calls[0][0]
      expect(savedList).toHaveLength(2)
      expect(savedList[0].Name).toBe('ช่างเก่าในระบบ')
      expect(savedList[1].Name).toBe('ช่างใหม่')
    })
  })
})
