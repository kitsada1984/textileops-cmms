import { describe, expect, it } from 'vitest'
import {
  buildRepairWorkOrderPayload,
  durationHoursBetween,
  WORKORDER_COLUMNS,
} from './repairWorkOrderSync'

const record = {
  id: 'req-1',
  request_no: 'RR202609-0057',
  machine_mc: 'LA341M',
  KI: 1819,
  Design: 'Geg',
  roll_no: 21,
  priority: 'ด่วน',
  problem_description: 'ผ้าแตก / มีรู',
  reported_by: 'พร',
  approved_by: 'หัวหน้าช่าง',
  parts_used: 'เข็ม 2 เล่ม',
}

describe('buildRepairWorkOrderPayload', () => {
  const payload = buildRepairWorkOrderPayload({
    woId: 'WO-RR202609-0057',
    record,
    techName: 'ช.หนึ่ง',
    startIso: '2026-09-29T06:00:00.000Z',
    endIso: '2026-09-29T08:30:00.000Z',
    durationHours: 2.5,
    detail: 'เปลี่ยนเข็มและปรับตั้ง',
  })

  it('only uses columns that exist in the workorders table', () => {
    const unknown = Object.keys(payload).filter((k) => !WORKORDER_COLUMNS.has(k))
    expect(unknown).toEqual([])
  })

  it('keeps the job number in WO_ID (never in the stripped legacy names)', () => {
    expect(payload.WO_ID).toBe('WO-RR202609-0057')
    expect(payload).not.toHaveProperty('Job_ID')
    expect(payload).not.toHaveProperty('WONumber')
  })

  it('carries technician, machine, dates, duration and status', () => {
    expect(payload.Tech).toBe('ช.หนึ่ง')
    expect(payload.MC).toBe('LA341M')
    expect(payload.KI).toBe('1819')
    expect(payload.DateStart).toBe('2026-09-29T06:00:00.000Z')
    expect(payload.DateEnd).toBe('2026-09-29T08:30:00.000Z')
    expect(payload.Duration).toBe(2.5)
    expect(payload.Status).toBe('COMPLETED')
    expect(payload.JobType).toBe('REPAIR')
    expect(payload.Priority).toBe('MEDIUM')
  })

  it('stores the extras that have no column inside the Comment JSON', () => {
    const comment = JSON.parse(payload.Comment)
    expect(comment.synced_from_repair).toBe(true)
    expect(comment.request_no).toBe('RR202609-0057')
    expect(comment.roll_no).toBe(21)
    expect(comment.title).toContain('Geg')
    expect(comment.parts_used).toBe('เข็ม 2 เล่ม')
  })

  it('merges extra comment fields (durations / interruption logs)', () => {
    const withExtras = buildRepairWorkOrderPayload({
      woId: 'WO-1',
      record,
      techName: 'ช่าง',
      startIso: record.created_at || 'x',
      endIso: 'y',
      durationHours: 1,
      extraComment: { interruption_logs: [{ minutes: 10 }], net_working_hours: 1 },
    })
    const comment = JSON.parse(withExtras.Comment)
    expect(comment.net_working_hours).toBe(1)
    expect(comment.interruption_logs).toEqual([{ minutes: 10 }])
  })

  it('defaults missing priority to LOW', () => {
    const p = buildRepairWorkOrderPayload({
      woId: 'WO-2',
      record: { ...record, priority: undefined },
      techName: '',
      startIso: 'a',
      endIso: 'b',
      durationHours: 0.25,
    })
    expect(p.Priority).toBe('LOW')
  })
})

describe('durationHoursBetween', () => {
  it('rounds to two decimals and never goes below a quarter hour', () => {
    expect(durationHoursBetween('2026-09-29T06:00:00Z', '2026-09-29T08:30:00Z')).toBe(2.5)
    expect(durationHoursBetween('2026-09-29T06:00:00Z', '2026-09-29T06:00:00Z')).toBe(0.25)
    expect(durationHoursBetween('2026-09-29T08:00:00Z', '2026-09-29T06:00:00Z')).toBe(0.25)
  })
})
