import { describe, it, expect } from 'vitest'
import {
  extractPendingTasks,
  filterPendingTasks,
  buildInterruptionTaskNameFromPending,
} from './workOrderPendingMachines'

describe('workOrderPendingMachines', () => {
  const mockWorkOrders = [
    { Job_ID: 'WO-001', MC: 'DP-341M', Status: 'IN_PROGRESS', Problem: 'สายพานขาด', JobType: 'REPAIR' },
    { Job_ID: 'WO-002', MC: 'DP-343M', Status: 'COMPLETED', Problem: 'เสร็จแล้ว', JobType: 'PM' },
    { Job_ID: 'WO-003', MC: 'DB-3411T', Status: 'WAITING_PARTS', Problem: 'รอลูกปืน', JobType: 'REPAIR' },
    { Job_ID: 'WO-004', MC: 'SC-365W', Status: 'CANCELLED', Problem: 'ยกเลิก', JobType: 'DESIGN' },
    { Job_ID: 'WO-005', MC: 'SB-367P', Status: 'OPEN', Problem: 'ตั้งศูนย์', JobType: 'PM' },
  ]

  const mockRepairRequests = [
    { request_no: 'REQ-001', machine_mc: 'DB-302M', status: 'PENDING', problem_description: 'น้ำมันหยด' },
    { request_no: 'REQ-002', machine_mc: 'DB-308T', status: 'COMPLETED', problem_description: 'ซ่อมเสร็จแล้ว' },
    { request_no: 'REQ-003', machine_mc: 'DB-3013M', status: 'WAIT_PARTS', problem_description: 'รอเข็ม' },
  ]

  it('extracts only pending work orders and repair requests, excluding completed/cancelled', () => {
    const pending = extractPendingTasks({
      workOrders: mockWorkOrders,
      repairRequests: mockRepairRequests,
    })

    const refIds = pending.map((p) => p.refId)
    expect(refIds).toContain('WO-001')
    expect(refIds).toContain('WO-003')
    expect(refIds).toContain('WO-005')
    expect(refIds).toContain('REQ-001')
    expect(refIds).toContain('REQ-003')

    // Excluded
    expect(refIds).not.toContain('WO-002')
    expect(refIds).not.toContain('WO-004')
    expect(refIds).not.toContain('REQ-002')
  })

  it('excludes the current work order ID when excludeJobId is provided', () => {
    const pending = extractPendingTasks({
      workOrders: mockWorkOrders,
      repairRequests: mockRepairRequests,
      excludeJobId: 'WO-001',
    })

    const refIds = pending.map((p) => p.refId)
    expect(refIds).not.toContain('WO-001')
    expect(refIds).toContain('WO-003')
  })

  it('filters pending tasks by search keyword (machine code, ID, or details)', () => {
    const pending = extractPendingTasks({
      workOrders: mockWorkOrders,
      repairRequests: mockRepairRequests,
    })

    const filteredByMc = filterPendingTasks(pending, 'DB-302M')
    expect(filteredByMc.length).toBe(1)
    expect(filteredByMc[0].refId).toBe('REQ-001')

    const filteredByDetail = filterPendingTasks(pending, 'ลูกปืน')
    expect(filteredByDetail.length).toBe(1)
    expect(filteredByDetail[0].refId).toBe('WO-003')
  })

  it('filters pending tasks by category filter', () => {
    const pending = extractPendingTasks({
      workOrders: mockWorkOrders,
      repairRequests: mockRepairRequests,
    })

    const pmOnly = filterPendingTasks(pending, '', 'PM')
    expect(pmOnly.every((t) => t.jobType === 'PM')).toBe(true)

    const waitParts = filterPendingTasks(pending, '', 'WAIT_PARTS')
    expect(waitParts.map((t) => t.refId)).toEqual(['WO-003', 'REQ-003'])
  })

  it('builds standardized interruption task name from pending item', () => {
    const task = {
      source: 'WORK_ORDER',
      mc: 'DP-341M',
      refId: 'WO-001',
      details: 'สายพานสึกหรอ',
    }
    const name = buildInterruptionTaskNameFromPending(task)
    expect(name).toBe('[งานแทรก] DP-341M: ใบงาน WO-001 (สายพานสึกหรอ)')
  })
})
