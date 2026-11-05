import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrderCardActions } from './workOrderCardActions'

// Characterization tests: lock the card footer actions exactly as the
// in-component version behaved (moved verbatim, props only).

const job = { id: 'job-1', Job_ID: 'JOB-001', Status: 'OPEN' }
const sla = { label: 'ปกติ', badgeClass: '', activeInterruption: null, offShiftHoursDecimal: 0, sundayHoursDecimal: 0 }

function renderFooter(over = {}) {
  const handlers = {
    onInterruption: vi.fn(),
    onComplete: vi.fn(),
    onPrint: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDailyLog: vi.fn(),
    ...over,
  }
  render(
    <WorkOrderCardActions
      job={job}
      sla={sla}
      isCompleted={false}
      dailyLogs={[]}
      canEdit
      canDelete
      {...handlers}
    />
  )
  return handlers
}

describe('WorkOrderCardActions characterization', () => {
  it('shows all six action buttons', () => {
    renderFooter()

    expect(screen.getByTitle('บันทึกงานแทรก')).toBeInTheDocument()
    expect(screen.getByTitle('บันทึกจบงาน')).toBeInTheDocument()
    expect(screen.getByTitle('พิมพ์ใบสั่งงาน A4')).toBeInTheDocument()
    expect(screen.getByTitle('แก้ไข')).toBeInTheDocument()
    expect(screen.getByTitle('ลบ')).toBeInTheDocument()
  })

  it('routes clicks to the matching handlers with the job', () => {
    const h = renderFooter()

    fireEvent.click(screen.getByTitle('แก้ไข'))
    expect(h.onEdit).toHaveBeenCalledWith(job)

    fireEvent.click(screen.getByTitle('ลบ'))
    expect(h.onDelete).toHaveBeenCalledWith(job)
  })
})
