import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  WorkOrderJobTypeBadge,
  WorkOrderProblemCell,
  WorkOrderDetailsCell,
  WorkOrderStatusCell,
  WorkOrderDurationCell,
  WorkOrderRowActions,
} from './workOrderRowCells'

// Characterization: lock the table row cells exactly as the mapper rendered them.
const job = {
  id: 'w1',
  Job_ID: 'JOB-001',
  MC: 'DA-306M',
  JobType: 'PM',
  ProblemCause: 'เข็มหัก',
  Status: 'IN_PROGRESS',
  Technicians: 'ช่างA',
  StartDate: '2026-10-01',
}

describe('workOrderRowCells characterization', () => {
  it('badges the job type in Thai', () => {
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderJobTypeBadge job={job} />
          </tr>
        </tbody>
      </table>
    )

    expect(screen.getByText('🧹 PM')).toBeInTheDocument()
  })

  it('shows the problem-cause badge or a dash', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <tr>
            <WorkOrderProblemCell job={job} />
          </tr>
        </tbody>
      </table>
    )
    expect(screen.getByText('เข็มหัก')).toBeInTheDocument()

    rerender(
      <table>
        <tbody>
          <tr>
            <WorkOrderProblemCell job={{}} />
          </tr>
        </tbody>
      </table>
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('edits status through the select when allowed', () => {
    const onChange = vi.fn()
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderStatusCell
              job={job}
              statusMeta={{ value: 'IN_PROGRESS', label: 'กำลังทำ', badgeClass: 'badge-orange' }}
              canEdit
              handleQuickStatusChange={onChange}
            />
          </tr>
        </tbody>
      </table>
    )

    fireEvent.change(screen.getByTitle('คลิกเพื่อเปลี่ยนสถานะใบสั่งงาน'), {
      target: { value: 'COMPLETED' },
    })
    expect(onChange).toHaveBeenCalledWith(job, 'COMPLETED')

    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('🧪 รอเทส-ย้อม')
  })

  it('shows a static badge when editing is locked', () => {
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderStatusCell
              job={job}
              statusMeta={{ value: 'IN_PROGRESS', label: 'กำลังทำ', badgeClass: 'badge-orange' }}
              canEdit={false}
              handleQuickStatusChange={vi.fn()}
            />
          </tr>
        </tbody>
      </table>
    )

    expect(screen.getByText('กำลังทำ')).toBeInTheDocument()
    expect(screen.queryByTitle('คลิกเพื่อเปลี่ยนสถานะใบสั่งงาน')).toBeNull()
  })

  it('shows duration deductions and the interruption pulse', () => {
    const sla = {
      badgeClass: 'badge-blue',
      label: 'อยู่ในเกณฑ์',
      durationText: '5 ชม.',
      offShiftHoursDecimal: 1,
      offShiftDurationText: '1 ชม.',
      sundayHoursDecimal: 0,
      lostHoursDecimal: 2,
      lostDurationText: '2 ชม.',
      activeInterruption: null,
    }
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderDurationCell job={job} sla={sla} isCompleted={false} />
          </tr>
        </tbody>
      </table>
    )

    expect(screen.getByText(/หักนอกกะ/)).toBeInTheDocument()
    expect(screen.getByText(/หักงานแทรก/)).toBeInTheDocument()
  })

  it('shows detail text with the daily-log chip', () => {
    const openDailyLogModal = vi.fn()
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderDetailsCell
              job={job}
              detailsDisplay="เปลี่ยนเข็ม"
              dailyLogs={[{ date: '2026-10-02', details: 'คืบหน้า' }]}
              latestDailyLog={{ date: '2026-10-02', details: 'คืบหน้า' }}
              openDailyLogModal={openDailyLogModal}
            />
          </tr>
        </tbody>
      </table>
    )

    expect(screen.getByText('เปลี่ยนเข็ม')).toBeInTheDocument()
    fireEvent.click(screen.getByText('คืบหน้า'))
    expect(openDailyLogModal).toHaveBeenCalledWith(job)
  })

  it('fires every row action with the job', () => {
    const handlers = {
      openInterruptionModal: vi.fn(),
      openCompleteModal: vi.fn(),
      openDailyLogModal: vi.fn(),
      openPrintModal: vi.fn(),
      openEditModal: vi.fn(),
      handleDeleteJob: vi.fn(),
    }
    const sla = { activeInterruption: null, lostHoursDecimal: 0 }
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderRowActions
              job={job}
              sla={sla}
              isCompleted={false}
              canEdit
              canDelete
              dailyLogs={[]}
              {...handlers}
            />
          </tr>
        </tbody>
      </table>
    )

    fireEvent.click(screen.getByTitle('บันทึกจบงาน'))
    expect(handlers.openCompleteModal).toHaveBeenCalledWith(job)

    fireEvent.click(screen.getByTitle('ลบใบสั่งงาน'))
    expect(handlers.handleDeleteJob).toHaveBeenCalledWith(job)

    fireEvent.click(screen.getByTitle('พิมพ์ใบสั่งงาน A4'))
    expect(handlers.openPrintModal).toHaveBeenCalledWith(job)
  })

  it('hides edit actions for deleted jobs', () => {
    render(
      <table>
        <tbody>
          <tr>
            <WorkOrderRowActions
              job={{ ...job, IsDeleted: true }}
              sla={{}}
              isCompleted
              canEdit
              canDelete={false}
              dailyLogs={[]}
              openInterruptionModal={vi.fn()}
              openCompleteModal={vi.fn()}
              openDailyLogModal={vi.fn()}
              openPrintModal={vi.fn()}
              openEditModal={vi.fn()}
              handleDeleteJob={vi.fn()}
            />
          </tr>
        </tbody>
      </table>
    )

    expect(screen.queryByTitle('แก้ไขใบสั่งงาน')).toBeNull()
    expect(screen.queryByTitle('ลบใบสั่งงาน')).toBeNull()
  })
})
