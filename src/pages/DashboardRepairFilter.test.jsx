import { describe, it, expect } from 'vitest'
import {
  isRepairSyncedWorkOrder,
  isPendingWorkOrder,
  isPendingRepairRequest,
} from './Dashboard'

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

describe('Dashboard - isPendingWorkOrder (Filter out COMPLETED and CANCELLED)', () => {
  it('returns false for null, undefined, or empty objects', () => {
    expect(isPendingWorkOrder(null)).toBe(false)
    expect(isPendingWorkOrder(undefined)).toBe(false)
  })

  it('filters out completed work orders in english and thai', () => {
    expect(isPendingWorkOrder({ Status: 'COMPLETED' })).toBe(false)
    expect(isPendingWorkOrder({ Status: 'completed' })).toBe(false)
    expect(isPendingWorkOrder({ Status: 'เสร็จสิ้น' })).toBe(false)
    expect(isPendingWorkOrder({ status: 'COMPLETED' })).toBe(false)
  })

  it('filters out cancelled work orders in english and thai', () => {
    expect(isPendingWorkOrder({ Status: 'CANCELLED' })).toBe(false)
    expect(isPendingWorkOrder({ Status: 'cancelled' })).toBe(false)
    expect(isPendingWorkOrder({ Status: 'ยกเลิก' })).toBe(false)
    expect(isPendingWorkOrder({ status: 'CANCELLED' })).toBe(false)
  })

  it('preserves active/pending work orders', () => {
    expect(isPendingWorkOrder({ Status: 'OPEN' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'IN_PROGRESS' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'WAITING_TECH' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'WAITING_PARTS' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'WAITING_SUMMARY' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'OVERDUE' })).toBe(true)
    expect(isPendingWorkOrder({ Status: 'กำลังทำ' })).toBe(true)
  })

  it('correctly filters a mixed list of work orders showing only pending items', () => {
    const list = [
      { Job_ID: 'JOB-1', Status: 'OPEN' },
      { Job_ID: 'JOB-2', Status: 'COMPLETED' },
      { Job_ID: 'JOB-3', Status: 'IN_PROGRESS' },
      { Job_ID: 'JOB-4', Status: 'CANCELLED' },
      { Job_ID: 'JOB-5', Status: 'เสร็จสิ้น' },
      { Job_ID: 'JOB-6', Status: 'WAITING_PARTS' },
      { Job_ID: 'JOB-7', Status: 'ยกเลิก' },
    ]
    const pending = list.filter(isPendingWorkOrder)
    expect(pending.map((x) => x.Job_ID)).toEqual(['JOB-1', 'JOB-3', 'JOB-6'])
  })
})

describe('Dashboard - isPendingRepairRequest (Filter out COMPLETED, CANCELLED, and REJECTED)', () => {
  it('returns false for null, undefined, or empty objects', () => {
    expect(isPendingRepairRequest(null)).toBe(false)
    expect(isPendingRepairRequest(undefined)).toBe(false)
  })

  it('filters out completed repair requests in english and thai', () => {
    expect(isPendingRepairRequest({ status: 'COMPLETED' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'completed' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'เสร็จสิ้น' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'ซ่อมเสร็จ' })).toBe(false)
  })

  it('filters out cancelled and rejected repair requests in english and thai', () => {
    expect(isPendingRepairRequest({ status: 'CANCELLED' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'cancelled' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'REJECTED' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'rejected' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'ยกเลิก' })).toBe(false)
    expect(isPendingRepairRequest({ status: 'ไม่อนุมัติ' })).toBe(false)
  })

  it('preserves active/pending repair requests', () => {
    expect(isPendingRepairRequest({ status: 'PENDING' })).toBe(true)
    expect(isPendingRepairRequest({ status: 'IN_PROGRESS' })).toBe(true)
    expect(isPendingRepairRequest({ status: 'WAIT_PARTS' })).toBe(true)
    expect(isPendingRepairRequest({ status: 'APPROVED' })).toBe(true)
  })

  it('correctly filters a mixed list of repair requests showing only pending items', () => {
    const list = [
      { id: 'REQ-1', status: 'PENDING' },
      { id: 'REQ-2', status: 'COMPLETED' },
      { id: 'REQ-3', status: 'IN_PROGRESS' },
      { id: 'REQ-4', status: 'CANCELLED' },
      { id: 'REQ-5', status: 'REJECTED' },
      { id: 'REQ-6', status: 'WAIT_PARTS' },
      { id: 'REQ-7', status: 'ซ่อมเสร็จ' },
      { id: 'REQ-8', status: 'ยกเลิก' },
    ]
    const pending = list.filter(isPendingRepairRequest)
    expect(pending.map((x) => x.id)).toEqual(['REQ-1', 'REQ-3', 'REQ-6'])
  })
})
