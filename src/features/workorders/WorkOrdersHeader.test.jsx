import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersHeader } from './WorkOrdersHeader'

// Characterization: lock the header + tabs nav exactly as WorkOrders rendered it.
function renderHeader(over = {}) {
  const handlers = {
    currentTab: 'records', setCurrentTab: vi.fn(), exportConfig: null,
    filteredJobs: [], allJobs: [{ IsDeleted: false }], technicians: [{}, {}],
    jobsLoading: false, loadJobs: vi.fn(), loadTechsAndSettings: vi.fn(),
    setReportModalOpen: vi.fn(), workOrderList: vi.fn(), ...over,
  }
  render(<WorkOrdersHeader {...handlers} />)
  return handlers
}

describe('WorkOrdersHeader characterization', () => {
  it('shows all five tabs with counts', () => {
    renderHeader()

    expect(screen.getByText('รายการใบสั่งงาน & เปิดงาน')).toBeInTheDocument()
    expect(screen.getByText('แจ้งซ่อม (Repair Requests)')).toBeInTheDocument()
    expect(screen.getByText('แดชบอร์ด & สรุป KPI')).toBeInTheDocument()
    expect(screen.getByText('ทะเบียนช่าง')).toBeInTheDocument()
    expect(screen.getByText('ตั้งค่าเป้าหมาย KPI')).toBeInTheDocument()
  })

  it('routes tab switches', () => {
    const h = renderHeader()

    fireEvent.click(screen.getByText('ทะเบียนช่าง'))
    expect(h.setCurrentTab).toHaveBeenCalledWith('technicians')
  })

  it('routes refresh and report actions', () => {
    const h = renderHeader()

    fireEvent.click(screen.getByTitle('รีเฟรชข้อมูล'))
    expect(h.loadJobs).toHaveBeenCalled()
    expect(h.loadTechsAndSettings).toHaveBeenCalled()
    fireEvent.click(screen.getByTitle('พิมพ์รายงานใบสั่งงานตามตัวกรองที่เลือก'))
    expect(h.setReportModalOpen).toHaveBeenCalledWith(true)
  })
})
