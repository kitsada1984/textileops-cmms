import { describe, it, expect } from 'vitest'
import { isRepairSyncedWorkOrder } from './Dashboard'

describe('Dashboard - isRepairSyncedWorkOrder', () => {
  it('returns false for null, undefined, or empty objects', () => {
    expect(isRepairSyncedWorkOrder(null)).toBe(false)
    expect(isRepairSyncedWorkOrder(undefined)).toBe(false)
    expect(isRepairSyncedWorkOrder({})).toBe(false)
  })

  it('detects repair-synced work order by WO_ID / Job_ID starting with WO-RR', () => {
    expect(isRepairSyncedWorkOrder({ WO_ID: 'WO-RR202610-0001' })).toBe(true)
    expect(isRepairSyncedWorkOrder({ Job_ID: 'WO-RR202610-0002' })).toBe(true)
    expect(isRepairSyncedWorkOrder({ 'Job ID': 'wo-rr202610-0003' })).toBe(true)
  })

  it('detects repair-synced work order by JobType === REPAIR', () => {
    expect(isRepairSyncedWorkOrder({ JobType: 'REPAIR' })).toBe(true)
  })

  it('detects repair-synced work order by JSON metadata in Comment', () => {
    const jobWithCommentJson = {
      Job_ID: 'JOB-12345',
      Comment: JSON.stringify({ synced_from_repair: true, request_no: 'RR202610-0001' }),
    }
    expect(isRepairSyncedWorkOrder(jobWithCommentJson)).toBe(true)

    const jobWithReqId = {
      Job_ID: 'JOB-12346',
      Comment: '{"request_no":"RR202610-0002","req_id":123}',
    }
    expect(isRepairSyncedWorkOrder(jobWithReqId)).toBe(true)
  })

  it('detects repair-synced work order by Problem field containing synced_from_repair', () => {
    expect(isRepairSyncedWorkOrder({ Problem: '{"synced_from_repair":true}' })).toBe(true)
  })

  it('returns false for standard work orders (PM, DESIGN, normal jobs)', () => {
    const normalJob1 = {
      Job_ID: 'JOB-202610-0001',
      MC: 'DA-306M',
      JobType: 'DESIGN',
      Comment: 'ปรับแบบลายดอกไม้',
      Status: 'IN_PROGRESS',
    }
    expect(isRepairSyncedWorkOrder(normalJob1)).toBe(false)

    const normalJob2 = {
      WO_ID: 'JOB-202610-0002',
      MC: 'MC-01',
      JobType: 'PM',
      Problem: 'ตรวจเช็คตามระยะ',
      Status: 'COMPLETED',
    }
    expect(isRepairSyncedWorkOrder(normalJob2)).toBe(false)
  })

  it('correctly filters an array of mixed work orders for dashboard display', () => {
    const workorders = [
      { Job_ID: 'JOB-001', JobType: 'DESIGN', Status: 'OPEN' },
      { WO_ID: 'WO-RR202610-0001', JobType: 'REPAIR', Status: 'COMPLETED', Comment: '{"synced_from_repair":true}' },
      { Job_ID: 'JOB-002', JobType: 'PM', Status: 'IN_PROGRESS' },
      { Job_ID: 'WO-RR202610-0002', JobType: 'REPAIR', Status: 'COMPLETED' },
    ]

    const dashboardWorkorders = workorders.filter((x) => !isRepairSyncedWorkOrder(x))
    expect(dashboardWorkorders).toHaveLength(2)
    expect(dashboardWorkorders.map((x) => x.Job_ID)).toEqual(['JOB-001', 'JOB-002'])
  })
})
