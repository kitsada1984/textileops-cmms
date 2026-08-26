import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildPWALineUrl,
  buildRepairRequestFlexMessage,
  buildTechnicianAssignedFlexMessage,
  buildRepairCompletedFlexMessage,
  buildTestFlexMessage,
} from './lineFlexBuilder'
import { loadLineSettings, saveLineSettings, DEFAULT_LINE_SETTINGS } from './line'

describe('LINE Flex Builder & Deep Linking', () => {
  it('builds PWA deep link with openExternalBrowser=1', () => {
    const url = buildPWALineUrl('https://textileops-cmms.vercel.app', '/repair/63876', {
      req: '12345',
      step: 'approve',
    })
    expect(url).toContain('https://textileops-cmms.vercel.app/repair/63876')
    expect(url).toContain('openExternalBrowser=1')
    expect(url).toContain('req=12345')
    expect(url).toContain('step=approve')
  })

  it('generates valid Flex Message JSON structure for new repair', () => {
    const request = {
      id: 'req-001',
      request_no: 'REQ-2026-001',
      cylinder_serial: 'CYL-101',
      machine_mc: 'MC-301M',
      cylinder_location: 'อาคารทอ 1',
      problem_description: 'ผ้าลาย ขาดร่อง',
      reported_by: 'สมคิด',
      created_at: '2026-08-26T10:00:00.000Z',
    }

    const flex = buildRepairRequestFlexMessage(request, null, 'https://textileops-cmms.vercel.app')
    expect(flex.type).toBe('flex')
    expect(flex.altText).toContain('MC-301M')
    expect(flex.contents.type).toBe('bubble')
    expect(flex.contents.header).toBeDefined()
    expect(flex.contents.body).toBeDefined()
    expect(flex.contents.footer).toBeDefined()
    
    // Check Action CTA button URI
    const ctaButton = flex.contents.footer.contents[0]
    expect(ctaButton.action.type).toBe('uri')
    expect(ctaButton.action.uri).toContain('openExternalBrowser=1')
    expect(ctaButton.action.uri).toContain('CYL-101')
  })

  it('generates valid Flex Message for technician assignment (Step 2)', () => {
    const request = {
      id: 'req-002',
      request_no: 'REQ-2026-002',
      cylinder_serial: 'CYL-202',
      machine_mc: 'MC-302',
      cylinder_location: 'โรงทอ 2',
      problem_description: 'เข็มหัก',
      technician_name: 'ช่างหนึ่ง',
      approval_notes: 'รีบดำเนินการก่อนเที่ยง',
    }
    const flex = buildTechnicianAssignedFlexMessage(request, 'https://textileops-cmms.vercel.app')
    expect(flex.type).toBe('flex')
    expect(flex.altText).toContain('ช่างหนึ่ง')
    expect(flex.contents.body).toBeDefined()
    expect(flex.contents.footer.contents[0].action.uri).toContain('step=complete')
  })

  it('generates valid Flex Message for repair completed (Step 3)', () => {
    const request = {
      id: 'req-003',
      request_no: 'REQ-2026-003',
      cylinder_serial: 'CYL-303',
      machine_mc: 'MC-303',
      repair_details: 'เปลี่ยนลูกปืนและล้างทำความสะอาด',
      parts_used: 'Bearing 6204 x 2',
      completed_by: 'ช่างหนึ่ง',
      completed_at: '2026-08-26T12:00:00.000Z',
    }
    const flex = buildRepairCompletedFlexMessage(request, 'https://textileops-cmms.vercel.app')
    expect(flex.type).toBe('flex')
    expect(flex.altText).toContain('ซ่อมเสร็จแล้ว')
    expect(flex.contents.body).toBeDefined()
  })

  it('generates valid Test Flex Message payload', () => {
    const testFlex = buildTestFlexMessage('https://textileops-cmms.vercel.app')
    expect(testFlex.type).toBe('flex')
    expect(testFlex.contents.type).toBe('bubble')
    expect(testFlex.altText).toContain('MC-TEST')
  })
})

describe('LINE Settings Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default settings when empty', () => {
    const s = loadLineSettings()
    expect(s.provider).toBe('line_oa')
    expect(s.is_enabled).toBe(true)
    expect(s.channel_access_token).toBe('')
  })

  it('saves and reloads settings with supervisors and technicians', () => {
    saveLineSettings({
      ...DEFAULT_LINE_SETTINGS,
      channel_access_token: 'test-token-123',
      supervisors: [{ name: 'หัวหน้ากฤษดา', user_id: 'U11111' }],
      technicians: [{ name: 'ช่างหนึ่ง', user_id: 'U22222' }],
    })
    const loaded = loadLineSettings()
    expect(loaded.channel_access_token).toBe('test-token-123')
    expect(loaded.supervisors[0].user_id).toBe('U11111')
    expect(loaded.technicians[0].user_id).toBe('U22222')
  })
})
