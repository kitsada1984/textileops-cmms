import { describe, it, expect } from 'vitest'
import {
  getWorkOrderDetails,
  buildTechFromUser,
  getUnregisteredLineUsers,
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_TYPE_OPTIONS,
  getWorkOrderStatusMeta,
  matchesWorkOrderStatusFilter,
  matchesWorkOrderTypeFilter,
  matchesWorkOrderProblemCauseFilter,
  calculateProblemCauseStats,
  getJobDailyLogs,
  getLatestDailyLog,
  buildCancelJobPayload,
} from './WorkOrders.jsx'

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

  describe('getWorkOrderStatusMeta & matchesWorkOrderStatusFilter', () => {
    it('defines all 6 status options including รอช่าง, รอสรุป, รออะไหล่, ยกเลิก', () => {
      const labels = WORK_ORDER_STATUS_OPTIONS.map((o) => o.label)
      expect(labels).toEqual(['กำลังทำ', 'รอช่าง', 'รออะไหล่', 'รอสรุป', 'เสร็จสิ้น', 'ยกเลิก'])
    })

    it('normalizes both English codes and Thai labels accurately', () => {
      expect(getWorkOrderStatusMeta('CANCELLED').label).toBe('ยกเลิก')
      expect(getWorkOrderStatusMeta('CANCELLED').isCancelled).toBe(true)
      expect(getWorkOrderStatusMeta('CANCELLED').isCompleted).toBe(false)
      expect(getWorkOrderStatusMeta('ยกเลิก').value).toBe('CANCELLED')
      expect(getWorkOrderStatusMeta('ยกเลิก').isCancelled).toBe(true)

      expect(getWorkOrderStatusMeta('WAITING_TECH').label).toBe('รอช่าง')
      expect(getWorkOrderStatusMeta('รอช่าง').value).toBe('WAITING_TECH')

      expect(getWorkOrderStatusMeta('WAITING_PARTS').label).toBe('รออะไหล่')
      expect(getWorkOrderStatusMeta('รออะไหล่').value).toBe('WAITING_PARTS')

      expect(getWorkOrderStatusMeta('WAITING_SUMMARY').label).toBe('รอสรุป')
      expect(getWorkOrderStatusMeta('รอสรุป').value).toBe('WAITING_SUMMARY')

      expect(getWorkOrderStatusMeta('COMPLETED').isCompleted).toBe(true)
      expect(getWorkOrderStatusMeta('เสร็จสิ้น').isCompleted).toBe(true)

      expect(getWorkOrderStatusMeta('IN_PROGRESS').label).toBe('กำลังทำ')
      expect(getWorkOrderStatusMeta(null).value).toBe('IN_PROGRESS')
    })

    it('matches status filter across English codes and Thai labels', () => {
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', 'ALL')).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', 'WAITING_TECH')).toBe(true)
      expect(matchesWorkOrderStatusFilter('รอช่าง', 'WAITING_TECH')).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_PARTS', 'รออะไหล่')).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_SUMMARY', 'รอสรุป')).toBe(true)
      expect(matchesWorkOrderStatusFilter('IN_PROGRESS', 'WAITING_TECH')).toBe(false)
    })

    it('supports multi-select status filter (array and Set)', () => {
      // Empty array or 'ALL' matches everything
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', [])).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', ['ALL'])).toBe(true)

      // Multiple statuses selected
      const multiFilters = ['WAITING_TECH', 'WAITING_PARTS']
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', multiFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_PARTS', multiFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('รอช่าง', multiFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('รออะไหล่', multiFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('IN_PROGRESS', multiFilters)).toBe(false)
      expect(matchesWorkOrderStatusFilter('COMPLETED', multiFilters)).toBe(false)

      // Works with Set
      const setFilters = new Set(['IN_PROGRESS', 'COMPLETED'])
      expect(matchesWorkOrderStatusFilter('IN_PROGRESS', setFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('เสร็จสิ้น', setFilters)).toBe(true)
      expect(matchesWorkOrderStatusFilter('WAITING_TECH', setFilters)).toBe(false)
    })

    it('supports multi-select job type filter', () => {
      expect(WORK_ORDER_TYPE_OPTIONS).toHaveLength(3)
      expect(WORK_ORDER_TYPE_OPTIONS.map((o) => o.value)).toEqual(['REPAIR', 'DESIGN', 'PM'])

      // Single string matches (backward compatibility)
      expect(matchesWorkOrderTypeFilter('REPAIR', 'ALL')).toBe(true)
      expect(matchesWorkOrderTypeFilter('REPAIR', 'REPAIR')).toBe(true)
      expect(matchesWorkOrderTypeFilter('DESIGN', 'REPAIR')).toBe(false)
      expect(matchesWorkOrderTypeFilter(null, 'REPAIR')).toBe(true) // defaults to REPAIR

      // Array multi-select
      expect(matchesWorkOrderTypeFilter('REPAIR', [])).toBe(true)
      expect(matchesWorkOrderTypeFilter('REPAIR', ['ALL'])).toBe(true)
      expect(matchesWorkOrderTypeFilter('REPAIR', ['REPAIR', 'DESIGN'])).toBe(true)
      expect(matchesWorkOrderTypeFilter('DESIGN', ['REPAIR', 'DESIGN'])).toBe(true)
      expect(matchesWorkOrderTypeFilter('PM', ['REPAIR', 'DESIGN'])).toBe(false)
      expect(matchesWorkOrderTypeFilter('PM', ['PM'])).toBe(true)
    })
  })

  describe('getJobDailyLogs & getLatestDailyLog', () => {
    it('returns empty array when work order has no daily logs', () => {
      expect(getJobDailyLogs(null)).toEqual([])
      expect(getJobDailyLogs(undefined)).toEqual([])
      expect(getJobDailyLogs({})).toEqual([])
      expect(getJobDailyLogs({ DailyLogs: null })).toEqual([])
      expect(getJobDailyLogs({ DailyLogs: '' })).toEqual([])
      expect(getLatestDailyLog({})).toBeNull()
    })

    it('safely parses DailyLogs when stored as JSON string', () => {
      const mockLogs = [
        { id: '1', date: '2026-10-22', status: 'WAITING_PARTS', details: 'รอสั่งมอเตอร์ใหม่', hours: 3 },
        { id: '2', date: '2026-10-23', status: 'IN_PROGRESS', details: 'ใส่มอเตอร์เรียบร้อย', hours: 2 },
      ]
      const job = { DailyLogs: JSON.stringify(mockLogs) }

      const parsed = getJobDailyLogs(job)
      expect(parsed).toHaveLength(2)
      expect(parsed[0].details).toBe('รอสั่งมอเตอร์ใหม่')
      expect(parsed[1].details).toBe('ใส่มอเตอร์เรียบร้อย')

      const latest = getLatestDailyLog(job)
      expect(latest).not.toBeNull()
      expect(latest.id).toBe('2')
      expect(latest.date).toBe('2026-10-23')
      expect(latest.details).toBe('ใส่มอเตอร์เรียบร้อย')
      expect(latest.status).toBe('IN_PROGRESS')
    })

    it('handles already parsed array or alternate column names safely', () => {
      const arrayJob = { daily_logs: [{ id: 'a', details: 'เช็คสภาพรอบเครื่อง' }] }
      expect(getJobDailyLogs(arrayJob)).toHaveLength(1)
      expect(getLatestDailyLog(arrayJob).details).toBe('เช็คสภาพรอบเครื่อง')
    })

    it('handles malformed JSON without crashing', () => {
      const brokenJob = { DailyLogs: '{broken_json' }
      expect(getJobDailyLogs(brokenJob)).toEqual([])
      expect(getLatestDailyLog(brokenJob)).toBeNull()
    })

    it('handles double-stringified JSON safely', () => {
      const logs = [{ id: '1', date: '2026-10-23', details: 'อัปเดตงาน' }]
      const doubleEncodedJob = { DailyLogs: JSON.stringify(JSON.stringify(logs)) }
      expect(getJobDailyLogs(doubleEncodedJob)).toHaveLength(1)
      expect(getLatestDailyLog(doubleEncodedJob).details).toBe('อัปเดตงาน')
    })

    it('falls back to Comment metadata when DailyLogs column is absent', () => {
      const jobWithCommentFallback = {
        Comment: JSON.stringify({
          synced_from_repair: true,
          daily_logs: [{ id: 'fb-1', date: '2026-10-23', details: 'บันทึกใน Comment สำรอง' }],
        }),
      }
      expect(getJobDailyLogs(jobWithCommentFallback)).toHaveLength(1)
      expect(getLatestDailyLog(jobWithCommentFallback).details).toBe('บันทึกใน Comment สำรอง')
    })

    it('returns the latest log by date even if stored out of order', () => {
      const outOfOrderJob = {
        DailyLogs: JSON.stringify([
          { id: '2', date: '2026-10-23', details: 'วันที่ 23 ล่าสุด' },
          { id: '1', date: '2026-10-21', details: 'วันที่ 21 เริ่มต้น' },
        ]),
      }
      expect(getLatestDailyLog(outOfOrderJob).details).toBe('วันที่ 23 ล่าสุด')
    })
  })

  describe('matchesWorkOrderProblemCauseFilter', () => {
    it('returns true when filter is empty or "ALL"', () => {
      expect(matchesWorkOrderProblemCauseFilter('คน', '')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('เครื่องจักร', 'ALL')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter(null, '')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter(undefined, 'ALL')).toBe(true)
    })

    it('matches exact cause string correctly', () => {
      expect(matchesWorkOrderProblemCauseFilter('คน', 'คน')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('เครื่องจักร', 'เครื่องจักร')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('วัตถุดิบ', 'วัตถุดิบ')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('คน', 'เครื่องจักร')).toBe(false)
      expect(matchesWorkOrderProblemCauseFilter('', 'คน')).toBe(false)
    })

    it('matches "UNSPECIFIED" only when cause is empty or whitespace', () => {
      expect(matchesWorkOrderProblemCauseFilter('', 'UNSPECIFIED')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('  ', 'UNSPECIFIED')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter(null, 'UNSPECIFIED')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter(undefined, 'UNSPECIFIED')).toBe(true)
      expect(matchesWorkOrderProblemCauseFilter('คน', 'UNSPECIFIED')).toBe(false)
      expect(matchesWorkOrderProblemCauseFilter('เครื่องจักร', 'UNSPECIFIED')).toBe(false)
    })
  })

  describe('calculateProblemCauseStats', () => {
    const kpiTargets = { REPAIR: 1.0, DESIGN: 3.0, PM: 2.0 }

    it('handles empty or null work orders array gracefully', () => {
      const stats = calculateProblemCauseStats([], kpiTargets)
      expect(stats.personnel.total).toBe(0)
      expect(stats.machine.total).toBe(0)
      expect(stats.material.total).toBe(0)
      expect(stats.unspecified.total).toBe(0)
      expect(stats.personnel.avgDurationText).toBe('—')
    })

    it('ignores deleted work orders (IsDeleted: true)', () => {
      const jobs = [
        { Job_ID: 'JOB-1', ProblemCause: 'คน', IsDeleted: true },
        { Job_ID: 'JOB-2', ProblemCause: 'เครื่องจักร', IsDeleted: false },
      ]
      const stats = calculateProblemCauseStats(jobs, kpiTargets)
      expect(stats.personnel.total).toBe(0)
      expect(stats.machine.total).toBe(1)
      expect(stats.machine.percentage).toBe(100)
    })

    it('accurately calculates counts, percentages, and SLA metrics across all causes', () => {
      const mockJobs = [
        // 2 คน: 1 onTime (2 hrs), 1 overdue (4 hrs)
        {
          Job_ID: 'J-1',
          JobType: 'REPAIR',
          ProblemCause: 'คน',
          WorkingHoursDecimal: 2,
          Status: 'COMPLETED',
          CreatedDate: '2026-10-20',
          CompletedDate: '2026-10-20',
        },
        {
          Job_ID: 'J-2',
          JobType: 'REPAIR',
          ProblemCause: 'คน',
          WorkingHoursDecimal: 4,
          Status: 'COMPLETED',
          CreatedDate: '2026-10-10',
          CompletedDate: '2026-10-20',
        },
        // 1 เครื่องจักร: 1 onTime (1.5 hrs)
        {
          Job_ID: 'J-3',
          JobType: 'REPAIR',
          ProblemCause: 'เครื่องจักร',
          WorkingHoursDecimal: 1.5,
          Status: 'COMPLETED',
          CreatedDate: '2026-10-20',
          CompletedDate: '2026-10-20',
        },
        // 1 วัตถุดิบ: 1 overdue (6 hrs)
        {
          Job_ID: 'J-4',
          JobType: 'REPAIR',
          problem_cause: 'วัตถุดิบ', // alternate column name
          WorkingHoursDecimal: 6,
          Status: 'COMPLETED',
          CreatedDate: '2026-10-01',
          CompletedDate: '2026-10-20',
        },
        // 1 ยังไม่ระบุ: (ไม่มี ProblemCause)
        {
          Job_ID: 'J-5',
          JobType: 'REPAIR',
          ProblemCause: '',
          Status: 'IN_PROGRESS',
        },
      ]

      const stats = calculateProblemCauseStats(mockJobs, kpiTargets)

      // Total = 5 jobs
      // 1. คน: 2 jobs (40%)
      expect(stats.personnel.total).toBe(2)
      expect(stats.personnel.percentage).toBe(40)
      expect(stats.personnel.exactPercentage).toBe(40.0)
      expect(stats.personnel.avgDurationText).toBe('3.0 ชม.')

      // 2. เครื่องจักร: 1 job (20%)
      expect(stats.machine.total).toBe(1)
      expect(stats.machine.percentage).toBe(20)
      expect(stats.machine.avgDurationText).toBe('1.5 ชม.')

      // 3. วัตถุดิบ: 1 job (20%)
      expect(stats.material.total).toBe(1)
      expect(stats.material.percentage).toBe(20)
      expect(stats.material.avgDurationText).toBe('6.0 ชม.')

      // 4. ยังไม่ระบุ: 1 job (20%)
      expect(stats.unspecified.total).toBe(1)
      expect(stats.unspecified.percentage).toBe(20)

      // Total sum of totals = 5
      const sumTotals = stats.personnel.total + stats.machine.total + stats.material.total + stats.unspecified.total
      expect(sumTotals).toBe(5)
    })
  })

  describe('buildCancelJobPayload', () => {
    it('returns null if job is missing', () => {
      expect(buildCancelJobPayload(null)).toBeNull()
      expect(buildCancelJobPayload()).toBeNull()
    })

    it('creates cancel payload with CANCELLED status, audit log and cancellation reason', () => {
      const mockJob = {
        Job_ID: 'JOB-2026-001',
        MC: 'K-01',
        Status: 'IN_PROGRESS',
        DailyLogs: JSON.stringify([
          {
            id: 'DLOG-1',
            date: '2026-10-28',
            status: 'IN_PROGRESS',
            details: 'เริ่มตรวจเช็คเครื่อง',
            techs: ['ช่างทดสอบ'],
          },
        ]),
      }

      const result = buildCancelJobPayload({
        job: mockJob,
        cancelDate: '2026-10-29',
        reason: 'เปลี่ยนแผนการผลิต เครื่องถูกนำไปใช้ไลน์อื่น',
        technician: 'สมชาย ช่างกล',
      })

      expect(result.Status).toBe('CANCELLED')
      expect(result.CancellationReason).toBe('เปลี่ยนแผนการผลิต เครื่องถูกนำไปใช้ไลน์อื่น')
      expect(result.UpdatedBy).toBe('สมชาย ช่างกล')
      expect(result.updated_at).toBeDefined()

      const parsedLogs = JSON.parse(result.DailyLogs)
      expect(parsedLogs).toHaveLength(2)
      expect(parsedLogs[1].status).toBe('CANCELLED')
      expect(parsedLogs[1].details).toBe('[ยกเลิกใบสั่งงาน]: เปลี่ยนแผนการผลิต เครื่องถูกนำไปใช้ไลน์อื่น')
      expect(parsedLogs[1].recorded_by).toBe('สมชาย ช่างกล')
      expect(parsedLogs[1].date).toBe('2026-10-29')
      expect(result.daily_logs).toBe(result.DailyLogs)
    })
  })
})
