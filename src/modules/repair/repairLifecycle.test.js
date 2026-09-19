import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeRepairRecord,
  encodeRepairProblemDescription,
} from './repairNormalizer'
import {
  createRepairRequest,
  approveRepairRequest,
  completeRepairRequest,
} from './repairLifecycle'
import { supabase } from '../../supabase'
import * as telegramUtils from '../../utils/telegram'
import * as lineUtils from '../../utils/line'

vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../utils/telegram', () => ({
  notifySupervisor: vi.fn().mockResolvedValue({ ok: true }),
  notifyTechnician: vi.fn().mockResolvedValue({ ok: true }),
  notifyCompleted: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('../../utils/line', () => ({
  notifyLineNewRepair: vi.fn().mockResolvedValue({ ok: true }),
  notifyLineTechnician: vi.fn().mockResolvedValue({ ok: true }),
  notifyLineCompleted: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('Repair Normalizer', () => {
  it('normalizes standard row with basic fields', () => {
    const raw = {
      id: 101,
      Design: 'DG-001',
      KI: 'KI-889',
      roll_no: '12',
      problem_description: 'เข็มหัก',
      status: 'PENDING',
    }
    const res = normalizeRepairRecord(raw)
    expect(res.Design).toBe('DG-001')
    expect(res.KI).toBe('KI-889')
    expect(res.roll_no).toBe('12')
    expect(res.repair_type).toBe('COMPLEX')
    expect(res.problem_description).toBe('เข็มหัก')
  })

  it('extracts metadata from embedded JSON comment', () => {
    const raw = {
      id: 102,
      problem_description: '<!--PROD:{"Design":"STRIPE-20","KI":"KI-999","roll_no":"45","repair_type":"EASY"}-->\n\nเส้นด้ายขาด',
      status: 'APPROVED',
      technician_name: 'สมชาย',
    }
    const res = normalizeRepairRecord(raw)
    expect(res.Design).toBe('STRIPE-20')
    expect(res.KI).toBe('KI-999')
    expect(res.roll_no).toBe('45')
    expect(res.repair_type).toBe('EASY')
    expect(res.problem_description).toBe('เส้นด้ายขาด')
  })

  it('extracts metadata from text banner fallback', () => {
    const raw = {
      id: 103,
      problem_description: '[ข้อมูลผลิต | Design: MESH-01 | KI: KI-123 | เลขม้วน: 88]\n\nเสียงดังผิดปกติ',
    }
    const res = normalizeRepairRecord(raw)
    expect(res.Design).toBe('MESH-01')
    expect(res.KI).toBe('KI-123')
    expect(res.roll_no).toBe('88')
    expect(res.problem_description).toBe('เสียงดังผิดปกติ')
  })

  it('encodes problem description with clean formatting', () => {
    const encoded = encodeRepairProblemDescription('มอเตอร์ไม่หมุน', {
      Design: 'D-99',
      KI: 'K-88',
      roll_no: '05',
      priority: 'ด่วน',
      repair_type: 'EASY',
    })
    expect(encoded).toContain('<!--PROD:{"Design":"D-99","KI":"K-88","roll_no":"05","priority":"ด่วน","repair_type":"EASY"}-->')
    expect(encoded).toContain('[ข้อมูลผลิต | Design: D-99 | KI: K-88 | เลขม้วน: 05]')
    expect(encoded).toContain('มอเตอร์ไม่หมุน')
  })
})

describe('Repair Lifecycle DB Operations & Schema Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createRepairRequest handles missing column retry successfully', async () => {
    let callCount = 0
    const mockSingle = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          data: null,
          error: { message: "Could not find the 'Design' column of 'repair_requests'" },
        })
      }
      return Promise.resolve({
        data: { id: 201, problem_description: 'เข็มหัก', status: 'PENDING' },
        error: null,
      })
    })

    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    supabase.from.mockReturnValue({ insert: mockInsert })

    const payload = {
      Design: 'TEST-DESIGN',
      problem_description: 'เข็มหัก',
      repair_type: 'COMPLEX',
    }

    const res = await createRepairRequest(payload, { skipNotification: true })
    expect(res.ok).toBe(true)
    expect(res.data.id).toBe(201)
    expect(callCount).toBe(2)
    // Design was stripped in second call
    expect(mockInsert).toHaveBeenLastCalledWith({
      problem_description: 'เข็มหัก',
      repair_type: 'COMPLEX',
    })
  })

  it('createRepairRequest triggers non-blocking notifications and survives notification error', async () => {
    telegramUtils.notifySupervisor.mockRejectedValueOnce(new Error('Network offline'))
    lineUtils.notifyLineNewRepair.mockRejectedValueOnce(new Error('LINE timeout'))

    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 202, problem_description: 'ทดสอบ', status: 'PENDING' },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    supabase.from.mockReturnValue({ insert: mockInsert })

    // Mutation should still succeed without throwing
    const res = await createRepairRequest({ problem_description: 'ทดสอบ' })
    expect(res.ok).toBe(true)
    expect(res.data.id).toBe(202)
    expect(telegramUtils.notifySupervisor).toHaveBeenCalled()
    expect(lineUtils.notifyLineNewRepair).toHaveBeenCalled()
  })

  it('approveRepairRequest updates status and triggers technician notifications', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 301, status: 'APPROVED', technician_name: 'ช่างหนึ่ง' },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    supabase.from.mockReturnValue({ update: mockUpdate })

    const res = await approveRepairRequest(301, {
      status: 'APPROVED',
      technician_name: 'ช่างหนึ่ง',
      approval_notes: 'ดำเนินการได้เลย',
    })

    expect(res.ok).toBe(true)
    expect(res.data.status).toBe('APPROVED')
    expect(telegramUtils.notifyTechnician).toHaveBeenCalled()
    expect(lineUtils.notifyLineTechnician).toHaveBeenCalled()
  })

  it('completeRepairRequest updates completion details and triggers complete notifications', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 401,
        status: 'COMPLETED',
        repair_details: 'เปลี่ยนลูกปืนใหม่',
        completed_by: 'ช่างหนึ่ง',
      },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    supabase.from.mockReturnValue({ update: mockUpdate })

    const res = await completeRepairRequest(401, {
      repair_details: 'เปลี่ยนลูกปืนใหม่',
      completed_by: 'ช่างหนึ่ง',
      gross_duration_hours: 1.5,
      net_working_hours: 1.5,
    })

    expect(res.ok).toBe(true)
    expect(res.data.status).toBe('COMPLETED')
    expect(telegramUtils.notifyCompleted).toHaveBeenCalled()
    expect(lineUtils.notifyLineCompleted).toHaveBeenCalled()
  })
})
