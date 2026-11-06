import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkOrderCard } from './WorkOrderCard'

// Characterization: lock the mobile/tablet card exactly as WorkOrders rendered it.
const job = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', JobType: 'REPAIR', MC: 'GK1-01', KI: 'KI-1', RollNo: 'R1' }

function renderCard(over = {}) {
  const handlers = {
    onInterruption: vi.fn(), onComplete: vi.fn(), onPrint: vi.fn(),
    onEdit: vi.fn(), onDelete: vi.fn(), onDailyLog: vi.fn(), ...over,
  }
  render(<WorkOrderCard job={job} kpiTargets={{}} canEdit canDelete {...handlers} />)
  return handlers
}

describe('WorkOrderCard characterization', () => {
  beforeEach(() => {
    cleanup()
  })

  it('shows the job id and machine', () => {
    renderCard()

    expect(screen.getByText('JOB-001')).toBeInTheDocument()
    expect(screen.getByText('GK1-01')).toBeInTheDocument()
  })

  it('routes edit and delete actions with the job', () => {
    const h = renderCard()

    fireEvent.click(screen.getByTitle('แก้ไข'))
    expect(h.onEdit).toHaveBeenCalledWith(job)
    fireEvent.click(screen.getByTitle('ลบ'))
    expect(h.onDelete).toHaveBeenCalledWith(job)
  })
})
