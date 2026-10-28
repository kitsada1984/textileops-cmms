import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Cylinders from './Cylinders'

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}))

vi.mock('../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../contexts/DeviceViewContext', () => ({
  useDeviceView: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}))

vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../hooks/usePagePerms', () => ({
  default: () => ({ canAdd: true, canEdit: true, canDelete: true }),
}))

vi.mock('../hooks/useEntity', () => ({
  default: (api) => ({
    data: [
      {
        id: 'cyl-1',
        Serial_NOW: 'CYL-2026-01',
        Serial_OLD: 'OLD-01',
        NewMC: 'MC-01',
        Location: 'KNITTING-A',
        Standard: 'STD-1',
        Diameter: '30',
        Gauge: '28',
        Needle: '2640',
        Machine_Ref: 'In-use-GMK1',
        Comment: 'ตรวจเช็คปกติ',
      },
      {
        id: 'cyl-2',
        Serial_NOW: 'CYL-2026-02',
        Serial_OLD: 'OLD-02',
        NewMC: 'MC-02',
        Location: 'KNITTING-B',
        Standard: 'STD-2',
        Diameter: '34',
        Gauge: '24',
        Needle: '2560',
        Machine_Ref: 'Spare-GMK1',
        Comment: 'กระบอกสำรอง',
      },
    ],
    loading: false,
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('../hooks/useWebBuilderMenu', () => ({
  default: () => ({ columns: [], loading: false }),
  useWebBuilderColumn: () => ({ columns: [] }),
}))

describe('Cylinders Sub-tab "พิมพ์ Tack" (20cm x 7cm Machine Tag) Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('renders all 3 sub-tab buttons: [รายการกระบอก], [พิมพ์ Tack], and [พิมพ์ Tack Spare]', () => {
    render(<Cylinders />)

    expect(screen.getByRole('button', { name: /รายการกระบอก/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /พิมพ์ Tack \(20x7cm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /พิมพ์ Tack Spare \(A4/i })).toBeInTheDocument()
  })

  it('switches to "พิมพ์ Tack" tab when clicking the sub-tab header', () => {
    render(<Cylinders />)

    const tagSubTabBtn = screen.getByRole('button', { name: /พิมพ์ Tack \(20x7cm/i })
    fireEvent.click(tagSubTabBtn)

    // Tag preview controls, settings button, and print button should now be visible
    expect(screen.getByRole('button', { name: /ตั้งค่าป้าย/i })).toBeInTheDocument()
    expect(screen.getByText(/เครื่อง In-use:/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^พิมพ์ Tack$/i })).toBeInTheDocument()

    // The tag container must display the current machine
    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toBeInTheDocument()
    expect(printableTag).toHaveTextContent('MC-01')
  })

  it('clicking the green Tag shortcut button in desktop table switches tab to "พิมพ์ Tack" and selects that cylinder', () => {
    render(<Cylinders />)

    // Find the green Tag button for 20x7cm
    const greenTagBtns = screen.getAllByRole('button', { name: 'พิมพ์ Tack' })
    const rowButton = greenTagBtns.find((btn) => btn.getAttribute('title')?.includes('20x7cm'))
    expect(rowButton).toBeDefined()

    fireEvent.click(rowButton)

    // Should now be on "พิมพ์ Tack" tab with cylinder MC-01 preselected
    const printableTag = document.getElementById('printable-machine-tag')
    expect(printableTag).toBeInTheDocument()
    expect(printableTag).toHaveTextContent('MC-01')

    // Must NOT show serial or specs inside the printable tag
    expect(printableTag).not.toHaveTextContent('CYL-2026-01')
    expect(printableTag).not.toHaveTextContent('30"')
    expect(printableTag).not.toHaveTextContent('28G')
  })
})
