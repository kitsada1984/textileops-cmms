import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersPrintModal } from './WorkOrdersPrintModal'

// Characterization: lock the print-modal gate exactly as WorkOrders rendered it
// (inner PdfPreviewModal returns null unless open — covered by its own module).
const printJob = { Job_ID: 'JOB-001', JobType: 'REPAIR', MC: 'GK1-01' }

describe('WorkOrdersPrintModal characterization', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <WorkOrdersPrintModal printModalOpen={false} printJob={printJob} setPrintModalOpen={vi.fn()} />
    )

    expect(container.textContent).toBe('')
  })

  it('renders nothing without a job', () => {
    const { container } = render(
      <WorkOrdersPrintModal printModalOpen printJob={null} setPrintModalOpen={vi.fn()} />
    )

    expect(container.textContent).toBe('')
  })
})
