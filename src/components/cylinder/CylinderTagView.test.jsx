import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CylinderTagView from './CylinderTagView'

const mockCylinders = [
  {
    id: 'cyl-1',
    Serial_NOW: '20240901-01',
    Serial_OLD: 'OLD-001',
    NewMC: 'MC-12',
    Location: 'KNITTING-FLOOR-1',
    Standard: 'STANDARD-A',
    Diameter: '30',
    Gauge: '28',
    Needle: '2640',
    Comment: 'ImageUrl:https://example.com/img.jpg\nตรวจเช็คศูนย์เรียบร้อย',
  },
  {
    id: 'cyl-2',
    Serial_NOW: '20240901-02',
    Serial_OLD: 'OLD-002',
    NewMC: 'MC-15',
    Location: 'SPARE-ROOM',
    Standard: 'STANDARD-B',
    Diameter: '34',
    Gauge: '24',
    Needle: '2560',
    Comment: 'กระบอกสำรองพร้อมใช้งาน',
  },
]

describe('CylinderTagView Component (A4 Landscape Print Tag)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('renders correctly and displays all 7 required fields', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    // 1. วันที่
    expect(screen.getByText(/วันที่ \(DATE\)/i)).toBeInTheDocument()

    // 2. เครื่องปัจจุบัน (เน้นตัวใหญ่)
    expect(screen.getByText(/เครื่องปัจจุบัน \(CURRENT M\/C\)/i)).toBeInTheDocument()
    expect(screen.getByText('MC-12')).toBeInTheDocument()

    // 3. ซีเรียลปัจจุบัน (เน้นตัวใหญ่)
    expect(screen.getByText(/ซีเรียลปัจจุบัน \(SERIAL NOW\)/i)).toBeInTheDocument()
    expect(screen.getByText('20240901-01')).toBeInTheDocument()

    // 4. เส้นผ่าศูนย์กลาง
    expect(screen.getByText(/เส้นผ่าศูนย์กลาง \(DIAMETER\)/i)).toBeInTheDocument()
    expect(screen.getByText('30"')).toBeInTheDocument()

    // 5. เกจ
    expect(screen.getByText(/เกจ \(GAUGE\)/i)).toBeInTheDocument()
    expect(screen.getByText('28G')).toBeInTheDocument()

    // 6. จำนวนเข็ม
    expect(screen.getByText(/จำนวนเข็ม \(TOTAL NEEDLES\)/i)).toBeInTheDocument()
    expect(screen.getByText('2,640 เล่ม')).toBeInTheDocument()

    // 7. หมายเหตุ (remark) with stripped ImageUrl metadata
    expect(screen.getAllByText(/หมายเหตุ/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ตรวจเช็คศูนย์เรียบร้อย')).toBeInTheDocument()
  })

  it('allows switching cylinder via dropdown', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const select = screen.getByRole('combobox', { name: /เลือกกระบอกที่ต้องการพิมพ์ Tack/i })
    fireEvent.change(select, { target: { value: 'cyl-2' } })

    // Check updated cylinder data
    expect(screen.getByText('MC-15')).toBeInTheDocument()
    expect(screen.getByText('20240901-02')).toBeInTheDocument()
    expect(screen.getByText('34"')).toBeInTheDocument()
    expect(screen.getByText('24G')).toBeInTheDocument()
    expect(screen.getByText('2,560 เล่ม')).toBeInTheDocument()
    expect(screen.getByText('กระบอกสำรองพร้อมใช้งาน')).toBeInTheDocument()
  })

  it('allows real-time editing of remark and date', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const remarkInput = screen.getByPlaceholderText(/พิมพ์ข้อความหมายเหตุเพิ่มเติมสำหรับติดกระบอก/i)
    fireEvent.change(remarkInput, { target: { value: 'เปลี่ยนเข็มใหม่ครบชุด 100%' } })

    expect(screen.getByText('เปลี่ยนเข็มใหม่ครบชุด 100%')).toBeInTheDocument()
  })

  it('triggers window.print when clicking print button', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const printButton = screen.getByRole('button', { name: /สั่งพิมพ์เอกสารติดกระบอก \(A4 แนวนอน\)/i })
    fireEvent.click(printButton)

    expect(window.print).toHaveBeenCalledTimes(1)
  })
})
