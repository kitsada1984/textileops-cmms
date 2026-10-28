import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CylinderMachineTagView, {
  getDynamicFontSize,
  DEFAULT_SETTINGS,
} from './CylinderMachineTagView'

const mockCylinders = [
  {
    id: 'cyl-1',
    Serial_NOW: 'CYL-2026-01',
    NewMC: 'MC-12',
    Location: 'KNITTING-FLOOR-1',
    Machine_Ref: 'In-use-GMK1', // In-use
  },
  {
    id: 'cyl-2',
    Serial_NOW: 'CYL-2026-02',
    NewMC: 'MC-15',
    Location: 'KNITTING-FLOOR-2',
    Machine_Ref: 'In-use-GMK3', // In-use
  },
  {
    id: 'cyl-3',
    Serial_NOW: 'CYL-2026-03',
    NewMC: 'MC-99',
    Location: 'SPARE-ROOM',
    Machine_Ref: 'Spare-GMK1', // SPARE (Not in-use)
  },
  {
    id: 'cyl-4',
    Serial_NOW: 'CYL-2026-04',
    NewMC: 'MC-12', // Duplicate MC-12 on another cylinder
    Location: 'KNITTING-FLOOR-1',
    Machine_Ref: 'In-use-GMK1',
  },
]

describe('CylinderMachineTagView Component (Customizable In-Use Machine Tag)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
    localStorage.clear()
  })

  it('filters and displays only In-Use machines without duplicates', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    // Initially in-use filter is enabled (2 unique in-use machines: MC-12 and MC-15)
    expect(screen.getByText('2')).toBeInTheDocument() // Counter badge for in-use machines
    expect(screen.getByText(/เฉพาะ In-use/i)).toBeInTheDocument()

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toBeInTheDocument()
    // Should display the first in-use machine MC-12
    expect(printableTag).toHaveTextContent('MC-12')
  })

  it('allows searching machines via autocomplete input', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const searchInput = screen.getByPlaceholderText(/พิมพ์ค้นหาชื่อเครื่อง/i)
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: '15' } })

    // MC-15 should appear in the autocomplete dropdown
    const option = screen.getByText('MC-15')
    expect(option).toBeInTheDocument()

    fireEvent.click(option)

    // Tag should now show MC-15
    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toHaveTextContent('MC-15')
  })

  it('toggles in-use filter to show all machines including spare', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const filterBtn = screen.getByRole('button', { name: /เฉพาะ In-use/i })
    fireEvent.click(filterBtn)

    // Now showing all machines (MC-12, MC-15, and spare MC-99 -> total 3 unique)
    expect(screen.getByText(/เครื่องทั้งหมด/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('opens settings panel and allows changing tag dimensions (presets & custom cm)', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    // Click "ตั้งค่าป้าย" button
    const settingsBtn = screen.getByRole('button', { name: /ตั้งค่าป้าย/i })
    fireEvent.click(settingsBtn)

    // Presets should be visible
    const preset15x5 = screen.getByRole('button', { name: /15 × 5/i })
    fireEvent.click(preset15x5)

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag.style.width).toBe('15cm')
    expect(printableTag.style.height).toBe('5cm')
  })

  it('allows customizing font size with slider in custom mode', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const settingsBtn = screen.getByRole('button', { name: /ตั้งค่าป้าย/i })
    fireEvent.click(settingsBtn)

    // Click "กำหนดเอง" mode
    const customModeBtn = screen.getByRole('button', { name: /กำหนดเอง/i })
    fireEvent.click(customModeBtn)

    // Slider appears
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '110' } })

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag.querySelector('span').style.fontSize).toBe('110pt')
  })

  it('allows selecting background and text colors from palettes', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const settingsBtn = screen.getByRole('button', { name: /ตั้งค่าป้าย/i })
    fireEvent.click(settingsBtn)

    // Pick yellow background (#fef08a)
    const yellowBtn = screen.getByTitle('สีพื้นหลัง: เหลืองอ่อน')
    fireEvent.click(yellowBtn)

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag.style.backgroundColor).toBe('rgb(254, 240, 138)') // #fef08a in rgb

    // Pick white text (#ffffff)
    const whiteTextBtn = screen.getByTitle('สีตัวหนังสือ: ขาว')
    fireEvent.click(whiteTextBtn)

    expect(printableTag.style.color).toBe('rgb(255, 255, 255)')
  })

  it('persists customized settings to localStorage and resets to default', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const settingsBtn = screen.getByRole('button', { name: /ตั้งค่าป้าย/i })
    fireEvent.click(settingsBtn)

    // Change to 10 x 5 cm
    const preset10x5 = screen.getByRole('button', { name: /10 × 5/i })
    fireEvent.click(preset10x5)

    // Check localStorage
    const saved = JSON.parse(localStorage.getItem('textileops_machine_tag_settings'))
    expect(saved.widthCm).toBe(10)
    expect(saved.heightCm).toBe(5)

    // Click reset
    const resetBtn = screen.getByRole('button', { name: /รีเซ็ตค่าเริ่มต้น/i })
    fireEvent.click(resetBtn)

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag.style.width).toBe('20cm')
    expect(printableTag.style.height).toBe('7cm')
  })

  it('triggers window.print when clicking print button', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} />)

    const printBtn = screen.getByRole('button', { name: /พิมพ์ Tack/i })
    fireEvent.click(printBtn)

    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('computes dynamic font size scaling across different tag dimensions and text lengths', () => {
    const defaultSize = getDynamicFontSize('MC-12', 20, 7)
    expect(defaultSize).toBeGreaterThan(60)

    const smallerTagSize = getDynamicFontSize('MC-12', 10, 5)
    expect(smallerTagSize).toBeLessThan(defaultSize)

    const longTextSize = getDynamicFontSize('SUPER-LONG-MACHINE-NAME-100', 20, 7)
    expect(longTextSize).toBeLessThan(defaultSize)
  })
})
