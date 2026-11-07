import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  resolveEffectiveActualEnd,
  resolveSyncProgressDate,
  resolveSyncWoDates,
  applySyncWoToItem,
  buildUnplannedSyncItem,
} from './monthlySyncItem'
import {
  syncWorkOrdersToMonthlyPlan,
} from './PMMonthlyScheduleView'
import { TimelineActualBar } from './TimelineActualBar'
import { MonthlyUpdateModal } from './MonthlyUpdateModal'

describe('Monthly PM Schedule - Ongoing Progress Tracking (ความคืบหน้าตามวันที่ จนกว่าจะจบงาน)', () => {
  describe('resolveEffectiveActualEnd', () => {
    it('returns empty string if item has no actualStartDate', () => {
      expect(resolveEffectiveActualEnd(null, 2026, 11)).toBe('')
      expect(resolveEffectiveActualEnd({}, 2026, 11)).toBe('')
      expect(resolveEffectiveActualEnd({ actualStartDate: '' }, 2026, 11)).toBe('')
    })

    it('returns fixed actualEndDate for COMPLETED items', () => {
      const item = {
        status: 'COMPLETED',
        actualStartDate: '2026-11-01',
        actualEndDate: '2026-11-04',
      }
      expect(resolveEffectiveActualEnd(item, 2026, 11, new Date('2026-11-08'))).toBe('2026-11-04')
    })

    it('returns today date for IN_PROGRESS items in the current month when today is after start date', () => {
      const item = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-02',
      }
      // Fixed reference date: 2026-11-07
      const mockToday = new Date('2026-11-07T10:00:00Z')
      const result = resolveEffectiveActualEnd(item, 2026, 11, mockToday)
      expect(result).toBe('2026-11-07')
    })

    it('returns latestDailyLog date if it is later than today', () => {
      const item = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-02',
        latestDailyLog: { date: '2026-11-09', details: 'เปลี่ยนซีลกระบอก' },
      }
      const mockToday = new Date('2026-11-07T10:00:00Z')
      const result = resolveEffectiveActualEnd(item, 2026, 11, mockToday)
      expect(result).toBe('2026-11-09')
    })

    it('returns actualStartDate if start date is in the future relative to today', () => {
      const item = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-15',
      }
      const mockToday = new Date('2026-11-07T10:00:00Z')
      const result = resolveEffectiveActualEnd(item, 2026, 11, mockToday)
      expect(result).toBe('2026-11-15')
    })

    it('caps to the last day of the month when viewing a past month for an unfinished job', () => {
      const item = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-10-25',
      }
      // Viewing October 2026 while today is in November 2026
      const mockToday = new Date('2026-11-07T10:00:00Z')
      const result = resolveEffectiveActualEnd(item, 2026, 10, mockToday)
      expect(result).toBe('2026-10-31')
    })

    it('returns item actualEndDate or actualStartDate for other non-progress statuses (e.g. CANCELLED, POSTPONED)', () => {
      const cancelledItem = {
        status: 'CANCELLED',
        actualStartDate: '2026-11-02',
        actualEndDate: '2026-11-03',
      }
      expect(resolveEffectiveActualEnd(cancelledItem, 2026, 11, new Date('2026-11-07'))).toBe('2026-11-03')
    })
  })

  describe('resolveSyncProgressDate & resolveSyncWoDates', () => {
    it('calculates dynamic progress date up to today for open active work order', () => {
      const wo = {
        Job_ID: 'WO-PM-01',
        JobType: 'PM',
        StartDate: '2026-11-01',
        Status: 'IN_PROGRESS',
      }
      const { progressDate, latestLog } = resolveSyncProgressDate(wo, '2026-11-01', '2026-11', {
        todayStr: '2026-11-06',
      })
      expect(progressDate).toBe('2026-11-06')
      expect(latestLog).toBeNull()
    })

    it('extracts latestDailyLog and uses its date when available', () => {
      const wo = {
        Job_ID: 'WO-PM-02',
        JobType: 'PM',
        StartDate: '2026-11-01',
        Status: 'IN_PROGRESS',
        DailyLogs: JSON.stringify([
          { id: '1', date: '2026-11-03', details: 'เริ่มถอดกระบอก' },
          { id: '2', date: '2026-11-05', details: 'ล้างชิ้นส่วนเสร็จแล้ว' },
        ]),
      }
      const woDates = resolveSyncWoDates(wo, '2026-11', { todayStr: '2026-11-04' })
      expect(woDates.sDate).toBe('2026-11-01')
      expect(woDates.hasEnded).toBe(false)
      // Because latest log is 2026-11-05 (later than 2026-11-04), progress date is 2026-11-05
      expect(woDates.progressDate).toBe('2026-11-05')
      expect(woDates.eDate).toBe('2026-11-05')
      expect(woDates.latestLog.details).toBe('ล้างชิ้นส่วนเสร็จแล้ว')
    })

    it('locks to rawEndDate when work order has ended', () => {
      const wo = {
        Job_ID: 'WO-PM-03',
        JobType: 'PM',
        StartDate: '2026-11-01',
        EndDate: '2026-11-04',
        Status: 'COMPLETED',
      }
      const woDates = resolveSyncWoDates(wo, '2026-11', { todayStr: '2026-11-07' })
      expect(woDates.hasEnded).toBe(true)
      expect(woDates.eDate).toBe('2026-11-04')
      expect(woDates.rawEndDate).toBe('2026-11-04')
    })
  })

  describe('applySyncWoToItem & buildUnplannedSyncItem', () => {
    it('sets progressDate and latestDailyLog on synced item for IN_PROGRESS status', () => {
      const baseItem = {
        id: 'PMSCH-202611-01',
        mc: 'MC-101',
        plannedStartDate: '2026-11-02',
        plannedEndDate: '2026-11-05',
        status: 'SCHEDULED',
      }

      const woFields = {
        sDate: '2026-11-02',
        eDate: '2026-11-06',
        rawEndDate: '',
        mappedStatus: 'IN_PROGRESS',
        techName: 'ช่างวิชัย',
        woNotes: 'กำลังดำเนินการตรวจเช็คประจำปี',
        woId: 'WO-101',
        progressDate: '2026-11-06',
        latestLog: { date: '2026-11-06', details: 'ทดสอบการหมุน', status: 'IN_PROGRESS', hours: 4 },
      }

      const updated = applySyncWoToItem(baseItem, woFields)
      expect(updated.status).toBe('IN_PROGRESS')
      expect(updated.actualStartDate).toBe('2026-11-02')
      expect(updated.actualEndDate).toBe('2026-11-06')
      expect(updated.progressDate).toBe('2026-11-06')
      expect(updated.latestDailyLog).toBeDefined()
      expect(updated.latestDailyLog.details).toBe('ทดสอบการหมุน')
    })

    it('builds unplanned sync item with progress tracking metadata', () => {
      const wo = {
        Job_ID: 'WO-UNP-01',
        created_at: '2026-11-03T08:00:00Z',
      }
      const woFields = {
        sDate: '2026-11-03',
        eDate: '2026-11-05',
        rawEndDate: '',
        mappedStatus: 'IN_PROGRESS',
        techName: 'ช่างสมหมาย',
        woNotes: 'งานด่วนนอกแผน',
        woId: 'WO-UNP-01',
        progressDate: '2026-11-05',
        latestLog: { date: '2026-11-05', details: 'อะไหล่มาถึงแล้ว' },
      }

      const item = buildUnplannedSyncItem({
        wo,
        woFields,
        effectiveMC: 'MC-UNP',
        effectiveKI: '99999',
        matchedMachine: { Location: 'GK2', Type: 'S' },
        monthKey: '2026-11',
      })

      expect(item.isUnplanned).toBe(true)
      expect(item.mc).toBe('MC-UNP')
      expect(item.actualStartDate).toBe('2026-11-03')
      expect(item.actualEndDate).toBe('2026-11-05')
      expect(item.progressDate).toBe('2026-11-05')
      expect(item.latestDailyLog.details).toBe('อะไหล่มาถึงแล้ว')
    })
  })

  describe('syncWorkOrdersToMonthlyPlan with dynamic ongoing progress', () => {
    it('extends IN_PROGRESS item execution date up to specified today option', () => {
      const initialPlan = [
        {
          id: 'PMSCH-202611-01',
          mc: 'DA-306M',
          ki: '66936',
          plannedStartDate: '2026-11-02',
          plannedEndDate: '2026-11-05',
          status: 'SCHEDULED',
        },
      ]

      const workOrders = [
        {
          Job_ID: 'WO-PM-DA',
          JobType: 'PM',
          MC: 'DA-306M',
          KI: '66936',
          StartDate: '2026-11-02',
          Technicians: 'ช่างกิต',
          Status: 'IN_PROGRESS',
          Comment: 'กำลังดำเนินการขัดกระบอก',
        },
      ]

      const machines = [{ NewMC: 'DA-306M', Serial_OLD: '66936' }]

      // Day 4 of work
      const synced = syncWorkOrdersToMonthlyPlan(initialPlan, workOrders, machines, 2026, 11, {
        todayStr: '2026-11-05',
      })

      expect(synced).toHaveLength(1)
      const item = synced[0]
      expect(item.status).toBe('IN_PROGRESS')
      expect(item.actualStartDate).toBe('2026-11-02')
      expect(item.actualEndDate).toBe('2026-11-05')
      expect(item.progressDate).toBe('2026-11-05')
    })

    it('locks to actual completion date once COMPLETED', () => {
      const initialPlan = [
        {
          id: 'PMSCH-202611-01',
          mc: 'DA-306M',
          ki: '66936',
          plannedStartDate: '2026-11-02',
          plannedEndDate: '2026-11-05',
          status: 'IN_PROGRESS',
          actualStartDate: '2026-11-02',
          actualEndDate: '2026-11-05',
        },
      ]

      const completedWO = [
        {
          Job_ID: 'WO-PM-DA',
          JobType: 'PM',
          MC: 'DA-306M',
          KI: '66936',
          StartDate: '2026-11-02',
          EndDate: '2026-11-04',
          Technicians: 'ช่างกิต',
          Status: 'COMPLETED',
          Comment: 'งานเสร็จสิ้นก่อนกำหนด',
        },
      ]

      const machines = [{ NewMC: 'DA-306M', Serial_OLD: '66936' }]

      // Even though today is 2026-11-10, completed job stays 2026-11-04!
      const synced = syncWorkOrdersToMonthlyPlan(initialPlan, completedWO, machines, 2026, 11, {
        todayStr: '2026-11-10',
      })

      const item = synced[0]
      expect(item.status).toBe('COMPLETED')
      expect(item.actualStartDate).toBe('2026-11-02')
      expect(item.actualEndDate).toBe('2026-11-04')
      expect(item.isOnTime).toBe(true)
    })
  })

  describe('TimelineActualBar UI component', () => {
    it('renders progress info for IN_PROGRESS item spanning across days', () => {
      const item = {
        mc: 'MC-200',
        actualTech: 'ช่างเอก',
        actualStartDate: '2026-11-02',
        actualEndDate: '2026-11-07',
        status: 'IN_PROGRESS',
        workOrderId: 'WO-200',
      }
      const actRange = { startDay: 2, endDay: 7, span: 6 }
      const statusMeta = { label: 'กำลังทำ', badgeClass: 'bg-amber-100 text-amber-800' }

      render(
        <TimelineActualBar
          item={item}
          actRange={actRange}
          hasOverlap={false}
          showActual={true}
          statusMeta={statusMeta}
          handleOpenUpdateModal={vi.fn()}
          effectiveEndDate="2026-11-07"
        />
      )

      expect(screen.getByText(/จริง: ช่างเอก/)).toBeDefined()
      expect(screen.getByText(/\(ถึง 07\)/)).toBeDefined()
    })
  })

  describe('Admin Role-Based Date Control (วันที่อัตโนมัติ admin สามารถแก้ไขได้คนเดียวเท่านั้น)', () => {
    it('resolveEffectiveActualEnd respects manualOverrideEndDate when set by admin', () => {
      const item = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-01',
        actualEndDate: '2026-11-04',
        manualOverrideEndDate: true,
      }
      // Today is 2026-11-08, but since admin manually overrode the end date to 2026-11-04, it must return 2026-11-04
      const result = resolveEffectiveActualEnd(item, 2026, 11, new Date('2026-11-08'))
      expect(result).toBe('2026-11-04')
    })

    it('MonthlyUpdateModal disables auto date input and shows lock badge for non-admin on IN_PROGRESS items', () => {
      const mockSetActualForm = vi.fn()
      const actualForm = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-01',
        actualEndDate: '2026-11-07',
        actualTech: 'ช่างทดสอบ',
        notes: '',
      }

      render(
        <MonthlyUpdateModal
          updateModalOpen={true}
          setUpdateModalOpen={vi.fn()}
          selectedItem={{ id: 'item-1', mc: 'MC-01', plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-03' }}
          actualForm={actualForm}
          setActualForm={mockSetActualForm}
          handleSaveActual={vi.fn()}
          daysPerMachine={3}
          isAdmin={false}
        />
      )

      expect(screen.getByText('เฉพาะ Admin')).toBeDefined()
      expect(screen.getByText(/วันที่อัตโนมัติ: ระบบอัปเดตตามวันต่อเนื่อง/)).toBeDefined()

      // The date input should be disabled
      const dateInputs = screen.getAllByDisplayValue('2026-11-07')
      expect(dateInputs.length).toBeGreaterThan(0)
      const autoDateInput = dateInputs[0]
      expect(autoDateInput.hasAttribute('disabled')).toBe(true)
      expect(autoDateInput.getAttribute('aria-disabled')).toBe('true')

      // Reset button should not be rendered for non-admin
      expect(screen.queryByText('รีเซ็ต')).toBeNull()
    })

    it('MonthlyUpdateModal enables date input, displays Admin badge, and allows reset for admin users', () => {
      const mockSetActualForm = vi.fn()
      const mockResetAutoDate = vi.fn()
      const actualForm = {
        status: 'IN_PROGRESS',
        actualStartDate: '2026-11-01',
        actualEndDate: '2026-11-07',
        actualTech: 'ช่างแอดมิน',
        notes: '',
      }

      render(
        <MonthlyUpdateModal
          updateModalOpen={true}
          setUpdateModalOpen={vi.fn()}
          selectedItem={{ id: 'item-1', mc: 'MC-01', plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-03' }}
          actualForm={actualForm}
          setActualForm={mockSetActualForm}
          handleSaveActual={vi.fn()}
          daysPerMachine={3}
          isAdmin={true}
          onResetAutoDate={mockResetAutoDate}
        />
      )

      expect(screen.getByText('Admin แก้ไขได้')).toBeDefined()
      expect(screen.getByText(/สิทธิ์ Admin: สามารถแก้ไขวันที่อัตโนมัตินี้ได้คนเดียวเท่านั้น/)).toBeDefined()

      // Date input must NOT be disabled for admin
      const dateInputs = screen.getAllByDisplayValue('2026-11-07')
      expect(dateInputs.length).toBeGreaterThan(0)
      const autoDateInput = dateInputs[0]
      expect(autoDateInput.hasAttribute('disabled')).toBe(false)

      // Admin can click reset button
      const resetBtn = screen.getByText('รีเซ็ต')
      expect(resetBtn).toBeDefined()
      fireEvent.click(resetBtn)
      expect(mockResetAutoDate).toHaveBeenCalledTimes(1)
    })

    it('MonthlyUpdateModal enables date input for COMPLETED status regardless of admin role', () => {
      const actualForm = {
        status: 'COMPLETED',
        actualStartDate: '2026-11-01',
        actualEndDate: '2026-11-03',
        actualTech: 'ช่างเอก',
        notes: 'เสร็จเรียบร้อย',
      }

      render(
        <MonthlyUpdateModal
          updateModalOpen={true}
          setUpdateModalOpen={vi.fn()}
          selectedItem={{ id: 'item-1', mc: 'MC-01' }}
          actualForm={actualForm}
          setActualForm={vi.fn()}
          handleSaveActual={vi.fn()}
          daysPerMachine={3}
          isAdmin={false}
        />
      )

      expect(screen.getByText('วันที่เสร็จจริง (Actual End)')).toBeDefined()
      const dateInput = screen.getByDisplayValue('2026-11-03')
      expect(dateInput.hasAttribute('disabled')).toBe(false)
    })
  })

})
