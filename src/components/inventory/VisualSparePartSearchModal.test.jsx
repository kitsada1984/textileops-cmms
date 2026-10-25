import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import VisualSparePartSearchModal from './VisualSparePartSearchModal'

const MOCK_PARTS = [
  {
    id: 'sp-1',
    Part_Code: 'SP-001',
    Part_Name_EN: 'Bearing 6204',
    Category: 'ลูกปืน',
    ImageUrl: 'https://example.com/bearing.jpg',
    Stock_Qty: 10,
    Location_Store: 'Store',
    Unit_Price: 150,
  },
  {
    id: 'sp-2',
    Part_Code: 'SP-027',
    Part_Name_EN: '11600',
    Category: 'สายพานส่งด้าย',
    ImageUrl: 'https://example.com/belt.jpg',
    Stock_Qty: 5,
    Location_Store: 'Store',
    Unit_Price: 350,
  },
]

describe('VisualSparePartSearchModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <VisualSparePartSearchModal
        isOpen={false}
        onClose={vi.fn()}
        spareParts={MOCK_PARTS}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal header, tabs, and camera/upload modes when open', () => {
    render(
      <VisualSparePartSearchModal
        isOpen={true}
        onClose={vi.fn()}
        spareParts={MOCK_PARTS}
      />
    )

    expect(screen.getByText(/ค้นหาอะไหล่ด้วยภาพ/i)).toBeInTheDocument()
    expect(screen.getByText(/Vector Search 128-D/i)).toBeInTheDocument()
    expect(screen.getByText('เปิดกล้องถ่ายสด')).toBeInTheDocument()
    expect(screen.getByText('เลือกไฟล์รูปภาพ')).toBeInTheDocument()
  })

  it('switches to file upload mode when clicking the upload tab', () => {
    render(
      <VisualSparePartSearchModal
        isOpen={true}
        onClose={vi.fn()}
        spareParts={MOCK_PARTS}
      />
    )

    const uploadTab = screen.getByText('เลือกไฟล์รูปภาพ')
    fireEvent.click(uploadTab)

    expect(screen.getByText(/คลิกเพื่อเลือกไฟล์รูปถ่าย หรือลากรูปมาวางที่นี่/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <VisualSparePartSearchModal
        isOpen={true}
        onClose={onClose}
        spareParts={MOCK_PARTS}
      />
    )

    const closeBtn = screen.getByTitle('ปิดหน้าต่าง')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
