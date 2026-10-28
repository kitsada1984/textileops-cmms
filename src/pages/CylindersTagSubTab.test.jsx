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

describe('Cylinders Sub-tab "พิมพ์ Tack" Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('renders sub-tab buttons: [รายการกระบอก] and [พิมพ์ Tack]', () => {
    render(<Cylinders />)

    expect(screen.getByRole('button', { name: /รายการกระบอก/i })).toBeInTheDocument()
    const allTagBtns = screen.getAllByRole('button', { name: /พิมพ์ Tack/i })
    expect(allTagBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('switches to "พิมพ์ Tack" tab when clicking the sub-tab header', () => {
    render(<Cylinders />)

    // The sub-tab button has text 'พิมพ์ Tack' inside span
    const tagSubTabSpan = screen.getByText('พิมพ์ Tack')
    const tagSubTabBtn = tagSubTabSpan.closest('button')
    fireEvent.click(tagSubTabBtn)

    // Tag preview header and fields should now be visible
    expect(screen.getByText(/เอกสารติดกระบอกเข็ม/i)).toBeInTheDocument()
    expect(screen.getByText(/CYLINDER IDENTIFICATION TAG/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /สั่งพิมพ์เอกสารติดกระบอก/i })).toBeInTheDocument()
  })

  it('clicking the Tag shortcut button in desktop table switches tab to "พิมพ์ Tack" and selects that cylinder', () => {
    render(<Cylinders />)

    // Find the Tag buttons in table rows
    const tagButtons = screen.getAllByRole('button', { name: /พิมพ์ Tack/i })
    // The first one is the sub-tab button, subsequent ones are table buttons
    const rowTagButton = tagButtons.find((btn) => btn.getAttribute('title')?.includes('A4 แนวนอน'))
    expect(rowTagButton).toBeDefined()

    fireEvent.click(rowTagButton)

    // Should now be on "พิมพ์ Tack" tab with cylinder CYL-2026-01 preselected
    expect(screen.getByText('MC-01')).toBeInTheDocument()
    expect(screen.getByText('CYL-2026-01')).toBeInTheDocument()
    expect(screen.getByText('30"')).toBeInTheDocument()
    expect(screen.getByText('28G')).toBeInTheDocument()
    expect(screen.getByText('2,640 เล่ม')).toBeInTheDocument()
    expect(screen.getByText('ตรวจเช็คปกติ')).toBeInTheDocument()
  })
})
