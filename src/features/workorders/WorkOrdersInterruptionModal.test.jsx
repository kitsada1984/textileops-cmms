import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersInterruptionModal } from './WorkOrdersInterruptionModal'

// Characterization: lock the interruption modal exactly as WorkOrders rendered it.
const interruptionJob = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS' }

function renderModal(over = {}) {
  const handlers = {
    interruptionModalOpen: true, interruptionJob, setInterruptionModalOpen: vi.fn(),
    interruptionTaskName: 'ไปขึ้นด้าย', setInterruptionTaskName: vi.fn(),
    interruptionManualMins: '', setInterruptionManualMins: vi.fn(),
    interruptionManualNotes: '', setInterruptionManualNotes: vi.fn(),
    showManualAdd: false, setShowManualAdd: vi.fn(),
    handleAddManualInterruption: vi.fn(), handleDeleteInterruption: vi.fn(),
    handleStartInterruption: vi.fn(), handleStopInterruption: vi.fn(),
    getJobInterruptions: () => [], QUICK_INTERRUPTION_PRESETS: [{ value: 'รอวัตถุดิบ', label: 'รอวัตถุดิบ' }],
    ...over,
  }
  render(<WorkOrdersInterruptionModal {...handlers} />)
  return handlers
}

describe('WorkOrdersInterruptionModal characterization', () => {
  it('shows the interruption title', () => {
    renderModal()

    expect(screen.getByText('⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)')).toBeInTheDocument()
  })

  it('routes the live-start action', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('⏸️ เริ่มจับเวลางานแทรกทันที (Auto Timestamp)'))
    expect(h.handleStartInterruption).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    renderModal({ interruptionModalOpen: false, interruptionJob: null })

    expect(screen.queryByText('⏸️ บันทึกงานแทรก & เวลาที่สูญเสียไป (Interruption Tracking)')).not.toBeInTheDocument()
  })
})
