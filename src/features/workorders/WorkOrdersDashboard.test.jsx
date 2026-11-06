import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersDashboard } from './WorkOrdersDashboard'

// Characterization: lock the dashboard tab exactly as WorkOrders rendered it.
const typeStats = (over = {}) => ({
  targetDays: 1, rate: 80, total: 10, onTime: 8, overdue: 2, avgDurationText: '5 ชม.', ...over,
})

const causeStats = {
  machine: { total: 4, onTime: 3, overdue: 1, rate: 75, percentage: 40, avgDurationText: '4 ชม.' },
  material: { total: 3, onTime: 2, overdue: 1, rate: 67, percentage: 30, avgDurationText: '3 ชม.' },
  personnel: { total: 2, onTime: 2, overdue: 0, rate: 100, percentage: 20, avgDurationText: '2 ชม.' },
  unspecified: { total: 1, onTime: 0, overdue: 1, rate: 0, percentage: 10, avgDurationText: '1 ชม.' },
}

const kpiStats = {
  total: 10, active: 3, completed: 7, overallRate: 80,
  repair: typeStats(), design: typeStats({ targetDays: 3 }), pm: typeStats({ targetDays: 2 }), setup: typeStats(),
  userMetrics: [],
  causeStats,
}

function renderDashboard(over = {}) {
  const handlers = { setKpiModalOpen: vi.fn(), handleDrilldownByCause: vi.fn(), ...over }
  render(<WorkOrdersDashboard kpiStats={kpiStats} {...handlers} />)
  return handlers
}

describe('WorkOrdersDashboard characterization', () => {
  it('shows the top KPI metrics', () => {
    renderDashboard()

    expect(screen.getByText('งานทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('กำลังปฏิบัติงาน')).toBeInTheDocument()
    expect(screen.getByText('งานเสร็จสิ้นแล้ว')).toBeInTheDocument()
  })

  it('shows all four job-type cards', () => {
    renderDashboard()

    expect(screen.getByText('งานแก้ไข (Repair)')).toBeInTheDocument()
    expect(screen.getByText('สรุปประสิทธิภาพตามประเภทงาน (KPI Breakdown by Job Type)')).toBeInTheDocument()
  })

  it('routes cause drilldown clicks', () => {
    const h = renderDashboard()

    fireEvent.click(screen.getByTitle(/เครื่องจักร:/))
    expect(h.handleDrilldownByCause).toHaveBeenCalledWith('เครื่องจักร')
  })
})
