import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersReportBridge } from './WorkOrdersReportBridge'

// Characterization: lock the report-modal gate exactly as WorkOrders rendered it
// (inner WorkOrdersReportModal returns null unless open — covered by its own module).
function renderBridge(over = {}) {
  const handlers = {
    reportModalOpen: false, setReportModalOpen: vi.fn(), filteredJobs: [],
    typeFilters: [], statusFilters: [], search: '', showDeleted: false,
    kpiTargets: {}, user: { username: 'admin' }, ...over,
  }
  return render(<WorkOrdersReportBridge {...handlers} />)
}

describe('WorkOrdersReportBridge characterization', () => {
  it('renders nothing when closed', () => {
    const { container } = renderBridge()

    expect(container.textContent).toBe('')
  })
})
