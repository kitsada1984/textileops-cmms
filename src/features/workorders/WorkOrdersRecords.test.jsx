import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersRecords } from './WorkOrdersRecords'
import { DEFAULT_ACTIVE_STATUS_FILTERS } from './workOrderNormalize.js'

// Characterization: lock the records tab exactly as WorkOrders rendered it.
// Mobile view renders WorkOrderCard rows (minimal fixture); desktop table
// needs full row shapes and is covered by the row-cell locks.
const job = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', JobType: 'REPAIR', MC: 'GK1-01', KI: 'KI-1' }

function renderTab(over = {}) {
  const handlers = {
    filteredJobs: [job], jobsLoading: false, kpiTargets: {},
    typeCounts: { ALL: 1 }, statusCounts: { ALL: 1 }, causeCounts: { ALL: 1 },
    WORK_ORDER_TYPE_OPTIONS: [
      { value: 'REPAIR', label: 'repair' }, { value: 'DESIGN', label: 'design' },
      { value: 'PM', label: 'pm' }, { value: 'SETUP', label: 'setup' },
    ],
    search: '', setSearch: vi.fn(),
    typeFilters: [], setTypeFilters: vi.fn(), statusFilters: [...DEFAULT_ACTIVE_STATUS_FILTERS], setStatusFilters: vi.fn(),
    causeFilter: '', setCauseFilter: vi.fn(), showDeleted: false, setShowDeleted: vi.fn(),
    isTypeFilterOpen: true, isStatusFilterOpen: true, isCauseFilterOpen: true,
    toggleTypeFilterOpen: vi.fn(), toggleStatusFilterOpen: vi.fn(), toggleCauseFilterOpen: vi.fn(),
    toggleTypeFilter: vi.fn(), toggleStatusFilter: vi.fn(), toggleCauseFilter: vi.fn(),
    canAdd: true, canEdit: true, canDelete: true,
    isMobile: true, isTablet: false, isDesktop: false,
    openEditModal: vi.fn(), openCompleteModal: vi.fn(), openDailyLogModal: vi.fn(),
    openInterruptionModal: vi.fn(), openPrintModal: vi.fn(),
    handleDeleteJob: vi.fn(), handleQuickStatusChange: vi.fn(),
    setCreateModalOpen: vi.fn(), setReportModalOpen: vi.fn(),
    ...over,
  }
  render(<WorkOrdersRecords {...handlers} />)
  return handlers
}

describe('WorkOrdersRecords characterization', () => {
  it('shows the search toolbar and job rows', () => {
    renderTab()

    expect(screen.getByPlaceholderText(/ค้นหา Job ID/)).toBeInTheDocument()
    expect(screen.getByText('JOB-001')).toBeInTheDocument()
  })

  it('routes the create and report actions', () => {
    const h = renderTab()

    fireEvent.click(screen.getByText('เปิดใบสั่งงาน'))
    expect(h.setCreateModalOpen).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByText('พิมพ์รายงาน'))
    expect(h.setReportModalOpen).toHaveBeenCalledWith(true)
  })

  it('shows all 7 status options including รอเทส-ย้อม', () => {
    renderTab()

    expect(screen.getByRole('button', { name: /รอเทส-ย้อม/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เสร็จสิ้น/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ยกเลิก/ })).toBeInTheDocument()
  })

  it('ticking an unticked finished status toggles it on', () => {
    const h = renderTab()

    fireEvent.click(screen.getByRole('button', { name: /เสร็จสิ้น/ }))
    expect(h.toggleStatusFilter).toHaveBeenCalledWith('COMPLETED')
  })

  it('unticking a pre-ticked status toggles it off', () => {
    const h = renderTab()

    fireEvent.click(screen.getByRole('button', { name: /กำลังทำ/ }))
    expect(h.toggleStatusFilter).toHaveBeenCalledWith('IN_PROGRESS')
  })

  it('shows the empty state when no jobs match', () => {
    renderTab({ filteredJobs: [] })

    expect(screen.getByText('ไม่พบรายการใบสั่งงาน')).toBeInTheDocument()
  })
})
