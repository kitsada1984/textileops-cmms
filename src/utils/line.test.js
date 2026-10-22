import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildPWALineUrl,
  buildRepairRequestFlexMessage,
  buildTechnicianAssignedFlexMessage,
  buildRepairCompletedFlexMessage,
  buildTestFlexMessage,
  buildWorkOrderAssignedFlexMessage,
} from './lineFlexBuilder'
import {
  loadLineSettings,
  saveLineSettings,
  DEFAULT_LINE_SETTINGS,
  resolveTechniciansLineIds,
  notifyLineWorkOrderAssigned,
  isValidLineTargetId,
  namesMatch,
} from './line'

describe('LINE Flex Builder & Deep Linking', () => {
  it('builds PWA deep link with openExternalBrowser=1', () => {
    const url = buildPWALineUrl('https://cmms.gemmaknits.com', '/repair/63876', {
      req: '12345',
      step: 'approve',
    })
    expect(url).toContain('https://cmms.gemmaknits.com/repair/63876')
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

    const flex = buildRepairRequestFlexMessage(request, null, 'https://cmms.gemmaknits.com')
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
    expect(ctaButton.action.uri).toContain('step=approve')
  })

  it('generates valid Flex Message for easy direct repair (skips approval)', () => {
    const request = {
      id: 'req-easy-001',
      request_no: 'REQ-2026-EASY',
      cylinder_serial: 'CYL-EASY',
      machine_mc: 'MC-EASY',
      problem_description: 'เข็มงอ 1 เล่ม',
      reported_by: 'ผู้แจ้งทดสอบ',
      technician_name: 'ช่างหนึ่ง',
      repair_type: 'EASY',
      status: 'APPROVED',
    }

    const flex = buildRepairRequestFlexMessage(request, null, 'https://cmms.gemmaknits.com', true)
    expect(flex.altText).toContain('เลือกช่างตรง')
    expect(flex.contents.header.contents[0].contents[1].text).toContain('งานง่าย')
    const ctaButton = flex.contents.footer.contents[0]
    expect(ctaButton.action.uri).toContain('step=view')
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
    const flex = buildTechnicianAssignedFlexMessage(request, 'https://cmms.gemmaknits.com')
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
    const flex = buildRepairCompletedFlexMessage(request, 'https://cmms.gemmaknits.com')
    expect(flex.type).toBe('flex')
    expect(flex.altText).toContain('ซ่อมเสร็จแล้ว')
    expect(flex.contents.body).toBeDefined()
  })

  it('generates valid Test Flex Message payload', () => {
    const testFlex = buildTestFlexMessage('https://cmms.gemmaknits.com')
    expect(testFlex.type).toBe('flex')
    expect(testFlex.contents.type).toBe('bubble')
    expect(testFlex.altText).toContain('MC-TEST')
  })
})

describe('LINE Settings Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default settings when empty including LINE Login configuration', () => {
    const s = loadLineSettings()
    expect(s.provider).toBe('line_oa')
    expect(s.is_enabled).toBe(true)
    expect(s.channel_access_token).toBe('')
    expect(s.login_enabled).toBe(true)
    expect(s.login_channel_id).toBe('')
    expect(s.login_channel_secret).toBe('')
    expect(s.login_default_role).toBe('viewer')
  })

  it('saves and reloads settings with supervisors, technicians, and LINE login settings', () => {
    const dummyToken = ['dummy', 'value'].join('-')
    saveLineSettings({
      ...DEFAULT_LINE_SETTINGS,
      channel_access_token: dummyToken,
      supervisors: [{ name: 'หัวหน้ากฤษดา', user_id: 'U11111' }],
      technicians: [{ name: 'ช่างหนึ่ง', user_id: 'U22222' }],
      login_enabled: true,
      login_channel_id: '2009998888',
      login_channel_secret: 'sec_test_12345',
      login_default_role: 'technician',
    })
    const loaded = loadLineSettings()
    expect(loaded.channel_access_token).toBe(dummyToken)
    expect(loaded.supervisors[0].user_id).toBe('U11111')
    expect(loaded.technicians[0].user_id).toBe('U22222')
    expect(loaded.login_channel_id).toBe('2009998888')
    expect(loaded.login_channel_secret).toBe('sec_test_12345')
    expect(loaded.login_default_role).toBe('technician')
  })
})


describe('Work Order LINE Notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('builds valid Work Order Flex Message with deep link and details', () => {
    const job = {
      Job_ID: 'JOB-20261022-0001',
      MC: 'MC-01',
      KI: 'KI-9012',
      Design: 'Jacquard Pattern 01',
      RollNo: '04',
      JobType: 'REPAIR',
      Comment: 'ผ้ามีรอยด่าง เข็มตก',
      CreatedBy: 'Kitsada',
      Status: 'IN_PROGRESS',
      StartTimestamp: '2026-10-22T10:00:00.000Z',
    }

    const flex = buildWorkOrderAssignedFlexMessage(job, ['Mr. Prapat', 'Kitsada (กริช)'], 'https://cmms.gemmaknits.com')

    expect(flex.type).toBe('flex')
    expect(flex.altText).toContain('JOB-20261022-0001')
    expect(flex.altText).toContain('MC-01')
    expect(flex.altText).toContain('Mr. Prapat, Kitsada (กริช)')

    // Check header
    expect(flex.contents.header).toBeDefined()
    expect(flex.contents.header.contents[1].text).toContain('ใบสั่งงานใหม่')

    // Check CTA button
    const ctaButton = flex.contents.footer.contents[0]
    expect(ctaButton.action.type).toBe('uri')
    expect(ctaButton.action.uri).toContain('/workorders?job=JOB-20261022-0001')
    expect(ctaButton.action.uri).toContain('openExternalBrowser=1')
  })

  it('resolves technician LINE user IDs from config and localStorage', async () => {
    const cfg = {
      technicians: [
        { name: 'ช่างหนึ่ง', user_id: 'U11111111111111111111111111111111' },
      ],
    }

    // Put second technician in localStorage registry
    localStorage.setItem(
      'txops_tbl_technicians',
      JSON.stringify([
        { Name: 'Mr. Prapat', Line_ID: 'U22222222222222222222222222222222' },
        { Name: 'Kitsada (กริช)', User_ID: 'U33333333333333333333333333333333' },
      ])
    )

    const resolved = await resolveTechniciansLineIds(cfg, ['ช่างหนึ่ง', 'Mr. Prapat', 'Kitsada (กริช)', 'NonExistentTech'])
    expect(resolved).toHaveLength(3)
    expect(resolved.map(r => r.userId)).toEqual([
      'U11111111111111111111111111111111',
      'U22222222222222222222222222222222',
      'U33333333333333333333333333333333',
    ])
  })

  it('validates LINE target IDs properly', () => {
    expect(isValidLineTargetId('U66f2b207af94e739c10a3cf937af2965')).toBe(true)
    expect(isValidLineTargetId('C66f2b207af94e739c10a3cf937af2965')).toBe(true)
    expect(isValidLineTargetId('R66f2b207af94e739c10a3cf937af2965')).toBe(true)
    // UUIDs or random strings are rejected
    expect(isValidLineTargetId('4f291071-70bf-481f-b52b-4ec2f6890f5b')).toBe(false)
    expect(isValidLineTargetId('')).toBe(false)
    expect(isValidLineTargetId(null)).toBe(false)
    expect(isValidLineTargetId(undefined)).toBe(false)
  })

  it('matches technician names flexibly across titles, emojis, and nicknames', () => {
    expect(namesMatch('Mr. Prapat', 'Prapat')).toBe(true)
    expect(namesMatch('Prapat', 'Mr. Prapat')).toBe(true)
    expect(namesMatch('Kitsada (กริช)', 'Kitsada')).toBe(true)
    expect(namesMatch('Kitsada (กริช)', 'กริช')).toBe(true)
    expect(namesMatch('🍓ศ.สพ.คนเพชรบูรณ์🍓', 'ศ.สพ.คนเพชรบูรณ์')).toBe(true)
    expect(namesMatch('ช่างหนึ่ง', 'หนึ่ง')).toBe(true)
  })

  it('resolves technicians from in-memory objects and system users, ignoring invalid UUIDs', async () => {
    const cfg = {}
    const inMemoryTechs = [
      { Name: 'Mr. Prapat', Line_ID: 'U22222222222222222222222222222222' },
      { Name: 'Kitsada (กริช)', User_ID: 'user-uuid-123' }, // User_ID is an auth UUID, should be resolved via systemUsers
      { Name: 'ช่างสมชาย', User_ID: 'invalid-uuid-not-line' },
    ]
    const inMemoryUsers = [
      { id: 'user-uuid-123', full_name: 'Kitsada', line_user_id: 'U33333333333333333333333333333333' },
    ]

    const resolved = await resolveTechniciansLineIds(
      cfg,
      ['Prapat', 'Kitsada', 'Unknown'],
      { technicians: inMemoryTechs, systemUsers: inMemoryUsers }
    )

    expect(resolved).toHaveLength(2)
    expect(resolved[0].userId).toBe('U22222222222222222222222222222222')
    expect(resolved[1].userId).toBe('U33333333333333333333333333333333')
  })

  it('skips notification when work order has no technicians or is disabled', async () => {
    const resNoTech = await notifyLineWorkOrderAssigned({ Job_ID: 'JOB-001', MC: 'MC-01' }, [])
    expect(resNoTech.ok).toBe(false)
    expect(resNoTech.skipped).toBe(true)

    // When LINE is disabled
    localStorage.setItem(
      'line_settings',
      JSON.stringify({ ...DEFAULT_LINE_SETTINGS, is_enabled: false })
    )
    const resDisabled = await notifyLineWorkOrderAssigned(
      { Job_ID: 'JOB-001', MC: 'MC-01' },
      ['ช่างหนึ่ง']
    )
    expect(resDisabled.ok).toBe(false)
    expect(resDisabled.skipped).toBe(true)
  })

  it('prioritizes exact name match over substring match and does not skip similar names', async () => {
    const cfg = {}
    const inMemoryUsers = [
      { id: 'u1', full_name: 'kitsada', line_user_id: 'Uc25ed474096368484a90164c4403c98d' },
      { id: 'u2', full_name: 'Kitsada (หนึ่ง)', line_user_id: 'U66f2b207af94e739c10a3cf937af2965' },
      { id: 'u3', full_name: '🍓ต.ตั้ม.คนเพชรบูรณ์🍓', line_user_id: 'Ub378d0152701fafc1a3605cabf2e73e4' },
    ]

    // Searching specifically for 'Kitsada (หนึ่ง)' must match u2, not u1
    const single = await resolveTechniciansLineIds(
      cfg,
      ['Kitsada (หนึ่ง)'],
      { technicians: [], systemUsers: inMemoryUsers }
    )
    expect(single).toHaveLength(1)
    expect(single[0].userId).toBe('U66f2b207af94e739c10a3cf937af2965')

    // Searching for both 'kitsada' and 'Kitsada (หนึ่ง)' must resolve both without skipping the second
    const both = await resolveTechniciansLineIds(
      cfg,
      ['kitsada', 'Kitsada (หนึ่ง)', '🍓ต.ตั้ม.คนเพชรบูรณ์🍓'],
      { technicians: [], systemUsers: inMemoryUsers }
    )
    expect(both).toHaveLength(3)
    expect(both.map((r) => r.userId)).toEqual([
      'Uc25ed474096368484a90164c4403c98d',
      'U66f2b207af94e739c10a3cf937af2965',
      'Ub378d0152701fafc1a3605cabf2e73e4',
    ])
  })
})
