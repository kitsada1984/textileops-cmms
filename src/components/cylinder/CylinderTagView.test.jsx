import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CylinderTagView, { DEFAULT_SPARE_SETTINGS } from './CylinderTagView'

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
    Machine_Ref: 'Spare-GMK1',
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
    Machine_Ref: 'Spare-GMK2',
    Comment: 'กระบอกสำรองพร้อมใช้งาน',
  },
  {
    id: 'cyl-3',
    Serial_NOW: '20240901-03',
    Serial_OLD: 'OLD-003',
    NewMC: 'MC-99',
    Location: 'ACTIVE-LINE',
    Standard: 'STANDARD-C',
    Diameter: '32',
    Gauge: '22',
    Needle: '2200',
    Machine_Ref: 'In-use-GMK1',
    Comment: 'เครื่องกำลังเดินงาน',
  },
]

describe('CylinderTagView Component (Customizable Tack Spare Tag)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    window.print = vi.fn()
  })

  it('renders correctly and displays all 7 required fields with default v1.3.184 values', () => {
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

  it('filters only spare machines by default and allows toggling to all cylinders', () => {
    render(<CylinderTagView cylinders={mockCylinders} />)

    // Default: onlySpare is true (showing 2 spare cylinders: cyl-1 and cyl-2)
    const spareBadgeBtn = screen.getByRole('button', { name: /เฉพาะ Spare/i })
    expect(spareBadgeBtn).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // count 2 spares

    // Toggle filter to all cylinders
    fireEvent.click(spareBadgeBtn)
    expect(screen.getByRole('button', { name: /กระบอกทั้งหมด/i })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // count 3 total
  })

  it('allows switching cylinder via next and previous buttons', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const nextBtn = screen.getByRole('button', { name: /กระบอกถัดไป/i })
    fireEvent.click(nextBtn)

    // Should now show cyl-2
    expect(screen.getByText('MC-15')).toBeInTheDocument()
    expect(screen.getByText('20240901-02')).toBeInTheDocument()
    expect(screen.getByText('34"')).toBeInTheDocument()
    expect(screen.getByText('24G')).toBeInTheDocument()
    expect(screen.getByText('2,560 เล่ม')).toBeInTheDocument()
    expect(screen.getByText('กระบอกสำรองพร้อมใช้งาน')).toBeInTheDocument()

    // Click previous button to return to cyl-1
    const prevBtn = screen.getByRole('button', { name: /กระบอกก่อนหน้า/i })
    fireEvent.click(prevBtn)
    expect(screen.getByText('MC-12')).toBeInTheDocument()
    expect(screen.getByText('20240901-01')).toBeInTheDocument()
  })

  it('allows searching and selecting a cylinder from autocomplete dropdown', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const searchInput = screen.getByPlaceholderText(/พิมพ์ค้นหาเครื่องหรือรหัสกระบอก/i)
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: 'MC-15' } })

    // Find the item in the dropdown
    const dropdownItem = screen.getByText('MC: MC-15')
    fireEvent.click(dropdownItem)

    // Check cylinder updated
    expect(screen.getByText('MC-15')).toBeInTheDocument()
    expect(screen.getByText('20240901-02')).toBeInTheDocument()
  })

  it('allows opening settings panel and configuring dimensions and section heights', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    // Open settings panel
    const settingsBtn = screen.getByRole('button', { name: /ตั้งค่าป้าย/i })
    fireEvent.click(settingsBtn)

    expect(screen.getByText(/ขนาดกระดาษ \(กว้าง × ยาว\)/i)).toBeInTheDocument()

    // Test paper size preset (A5 Landscape: 21 x 14.8 cm)
    const a5PresetBtn = screen.getByRole('button', { name: /A5 แนวนอน/i })
    fireEvent.click(a5PresetBtn)
    expect(screen.getByDisplayValue('21')).toBeInTheDocument()
    expect(screen.getByDisplayValue('14.8')).toBeInTheDocument()

    // Test proportion preset (เน้นเครื่องใหญ่: hero 235px)
    const bigHeroPresetBtn = screen.getByRole('button', { name: /เน้นเครื่องใหญ่/i })
    fireEvent.click(bigHeroPresetBtn)
    expect(screen.getByText('235px')).toBeInTheDocument()

    // Test font mode toggle to custom
    const customFontBtn = screen.getByRole('button', { name: /กำหนดเอง/i })
    fireEvent.click(customFontBtn)
    expect(screen.getByText(/ฟอนต์เครื่อง\/ซีเรียล:/i)).toBeInTheDocument()

    // Test reset settings to default
    const resetBtn = screen.getByRole('button', { name: /รีเซ็ตค่าเริ่มต้น/i })
    fireEvent.click(resetBtn)

    // Dimensions should be restored to default A4 Landscape
    expect(screen.getByDisplayValue(String(DEFAULT_SPARE_SETTINGS.widthCm))).toBeInTheDocument()
    expect(screen.getByDisplayValue(String(DEFAULT_SPARE_SETTINGS.heightCm))).toBeInTheDocument()
  })

  it('allows real-time editing of remark and date', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const remarkInput = screen.getByPlaceholderText(/พิมพ์ข้อความหมายเหตุเพิ่มเติมสำหรับติดกระบอก/i)
    fireEvent.change(remarkInput, { target: { value: 'เปลี่ยนเข็มใหม่ครบชุด 100%' } })

    expect(screen.getByText('เปลี่ยนเข็มใหม่ครบชุด 100%')).toBeInTheDocument()

    const dateInput = screen.getByLabelText(/วันที่พิมพ์/i)
    fireEvent.change(dateInput, { target: { value: '2026-12-31' } })
    expect(screen.getByText(/พิมพ์เมื่อ: 31\/12\/2026/i)).toBeInTheDocument()
  })

  it('triggers window.print when clicking print button', () => {
    render(<CylinderTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const printButton = screen.getByRole('button', { name: /สั่งพิมพ์เอกสารติดกระบอก/i })
    fireEvent.click(printButton)

    expect(window.print).toHaveBeenCalledTimes(1)
  })
})
