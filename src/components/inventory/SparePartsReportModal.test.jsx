import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SparePartsReportModal from './SparePartsReportModal'

const MOCK_PARTS = [
  {
    id: 1,
    Part_Code: 'SP-001',
    Part_Name_EN: 'Bearing 6204',
    Part_Name_TH: 'ลูกปืน 6204',
    Category: 'ลูกปืน',
    Location_Store: 'GMK1',
    Stock_Qty: 10,
    Min_Qty: 5,
    Unit: 'ชิ้น',
    Unit_Price: 150,
  },
  {
    id: 2,
    Part_Code: 'SP-002',
    Part_Name_EN: 'Belt 3V-500',
    Part_Name_TH: 'สายพาน 3V-500',
    Category: 'สายพาน',
    Location_Store: 'Store',
    Stock_Qty: 2,
    Min_Qty: 5,
    Unit: 'เส้น',
    Unit_Price: 300,
  },
]

describe('SparePartsReportModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <SparePartsReportModal open={false} onClose={vi.fn()} items={MOCK_PARTS} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders correctly with summary calculations and table rows when open', () => {
    render(
      <SparePartsReportModal
        open={true}
        onClose={vi.fn()}
        items={MOCK_PARTS}
        filterContext="หมวดหมู่: ทั้งหมด"
        currentUserName="Admin Test"
      />
    )

    // Check title and company
    expect(screen.getByText('รายงานทะเบียนและสต็อกอะไหล่')).toBeInTheDocument()
    expect(screen.getByText(/บริษัท เจ็มม่า นิตส์ จำกัด/i)).toBeInTheDocument()

    // Check summary cards
    // Total items: 2
    expect(screen.getByText('รายการอะไหล่ทั้งหมด')).toBeInTheDocument()
    // Total Qty: 10 + 2 = 12 (shows in both summary card and footer total)
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1)
    // Total valuation: 10*150 + 2*300 = 1500 + 600 = 2100 (in card and footer)
    expect(screen.getAllByText('฿2,100').length).toBeGreaterThanOrEqual(1)
    // Low stock count: SP-002 has 2 <= 5 -> 1
    expect(screen.getByText('ต่ำกว่าเกณฑ์ / หมด')).toBeInTheDocument()

    // Check table rows
    expect(screen.getByText('SP-001')).toBeInTheDocument()
    expect(screen.getByText('Bearing 6204')).toBeInTheDocument()
    expect(screen.getByText('SP-002')).toBeInTheDocument()
    expect(screen.getByText('Belt 3V-500')).toBeInTheDocument()

    // Check statuses
    expect(screen.getByText('สต็อกปกติ')).toBeInTheDocument()
    expect(screen.getByText('สต็อกต่ำ')).toBeInTheDocument()

    // Check user info and filter context
    expect(screen.getAllByText(/Admin Test/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/หมวดหมู่: ทั้งหมด/i)).toBeInTheDocument()
  })

  it('handles toggle thumbnails button', () => {
    render(
      <SparePartsReportModal
        open={true}
        onClose={vi.fn()}
        items={MOCK_PARTS}
      />
    )

    const toggleBtn = screen.getByRole('button', { name: /แสดงรูปภาพ/i })
    expect(toggleBtn).toBeInTheDocument()

    // Initially "รูป" header is present
    expect(screen.getByRole('columnheader', { name: 'รูป' })).toBeInTheDocument()

    // Click toggle to hide
    fireEvent.click(toggleBtn)
    expect(screen.queryByRole('columnheader', { name: 'รูป' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ซ่อนรูปภาพ/i })).toBeInTheDocument()

    // Click again to re-show
    fireEvent.click(screen.getByRole('button', { name: /ซ่อนรูปภาพ/i }))
    expect(screen.getByRole('columnheader', { name: 'รูป' })).toBeInTheDocument()
  })

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <SparePartsReportModal
        open={true}
        onClose={vi.fn()}
        items={MOCK_PARTS}
      />
    )

    const printBtn = screen.getByRole('button', { name: /พิมพ์เอกสาร \/ บันทึก PDF/i })
    fireEvent.click(printBtn)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <SparePartsReportModal
        open={true}
        onClose={onClose}
        items={MOCK_PARTS}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /ปิดหน้าต่าง/i })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
