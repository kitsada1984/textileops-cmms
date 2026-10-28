import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CylinderMachineTagView, { getMachineTagFontSize } from './CylinderMachineTagView'

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
    Comment: 'หมายเหตุส่วนตัว',
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
    Comment: 'กระบอกสำรอง',
  },
]

describe('CylinderMachineTagView Component (20cm x 7cm Machine Tag)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('renders correctly and displays ONLY current machine on the printable tag', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toBeInTheDocument()

    // Must display Current Machine
    expect(printableTag).toHaveTextContent('MC-12')

    // Must NOT display other cylinder specs inside the printable tag
    expect(printableTag).not.toHaveTextContent('20240901-01')
    expect(printableTag).not.toHaveTextContent('30"')
    expect(printableTag).not.toHaveTextContent('28G')
    expect(printableTag).not.toHaveTextContent('2640')
    expect(printableTag).not.toHaveTextContent('หมายเหตุส่วนตัว')

    // Verify background color is light green (#bbf7d0) and text is black
    expect(printableTag.style.backgroundColor).toBe('rgb(187, 247, 208)') // #bbf7d0 in rgb
    expect(printableTag.style.color).toBe('rgb(0, 0, 0)')
    expect(printableTag.style.width).toBe('200mm')
    expect(printableTag.style.height).toBe('70mm')
  })

  it('switches current cylinder via dropdown', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const select = screen.getByRole('combobox', { name: /เลือกกระบอกที่ต้องการพิมพ์ Tack/i })
    fireEvent.change(select, { target: { value: 'cyl-2' } })

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toHaveTextContent('MC-15')
  })

  it('allows live editing of the machine text before printing', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const input = screen.getByPlaceholderText(/ระบุชื่อเครื่อง/i)
    fireEvent.change(input, { target: { value: 'MC-99' } })

    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toHaveTextContent('MC-99')
  })

  it('triggers window.print when clicking the print button', () => {
    render(<CylinderMachineTagView cylinders={mockCylinders} selectedCylinder={mockCylinders[0]} />)

    const printBtn = screen.getByRole('button', { name: /สั่งพิมพ์ Tack/i })
    fireEvent.click(printBtn)

    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('computes dynamic font size based on text length', () => {
    expect(getMachineTagFontSize('12')).toBe('125pt')
    expect(getMachineTagFontSize('MC-1')).toBe('105pt')
    expect(getMachineTagFontSize('MC-12')).toBe('88pt')
    expect(getMachineTagFontSize('MC-1234')).toBe('72pt')
    expect(getMachineTagFontSize('MACHINE-101')).toBe('58pt')
    expect(getMachineTagFontSize('SUPER-MACHINE-1')).toBe('46pt')
    expect(getMachineTagFontSize('VERY-LONG-MACHINE-NAME-OVERFLOW')).toBe('36pt')
  })
})
