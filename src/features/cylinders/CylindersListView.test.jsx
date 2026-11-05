import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Cylinders from './Cylinders'

// Characterization tests (plan Task 1): lock the LIST tab behavior before
// splitting the main component. Same mock pattern as sibling tab tests.

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}))

vi.mock('../../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../../contexts/DeviceViewContext', () => ({
  useDeviceView: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../../hooks/usePagePerms', () => ({
  default: () => ({ canAdd: true, canEdit: true, canDelete: true }),
}))

vi.mock('../../hooks/useEntity', () => ({
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

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => ({ columns: [], loading: false }),
  useWebBuilderColumn: () => ({ columns: [] }),
}))

describe('Cylinders list tab characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows both mocked cylinders on the default list tab', async () => {
    render(<Cylinders />)

    expect(await screen.findAllByText('CYL-2026-01')).not.toHaveLength(0)
    expect(screen.getAllByText('CYL-2026-02')).not.toHaveLength(0)
  })

  it('shows all three sub-tab buttons', () => {
    render(<Cylinders />)

    expect(screen.getAllByRole('button', { name: /รายการกระบอก/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /พิมพ์ Tack$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /พิมพ์ Tack Spare/i }).length).toBeGreaterThan(0)
  })

  it('search filters the list down to the match', async () => {
    render(<Cylinders />)
    await screen.findAllByText('CYL-2026-01')

    fireEvent.change(screen.getByPlaceholderText('cyl_search'), {
      target: { value: 'CYL-2026-01' },
    })

    await waitFor(() => {
      expect(screen.queryAllByText('CYL-2026-02')).toHaveLength(0)
    })
    expect(screen.getAllByText('CYL-2026-01')).not.toHaveLength(0)
  })

  it('shows row action buttons for each cylinder', async () => {
    render(<Cylinders />)
    await screen.findAllByText('CYL-2026-01')

    expect(screen.getAllByRole('button', { name: /แก้ไขข้อมูลกระบอก/i }).length).toBeGreaterThan(0)
  })

  it('opens the add/edit modal from the add button', async () => {
    render(<Cylinders />)
    await screen.findAllByText('CYL-2026-01')

    fireEvent.click(screen.getByText('cyl_add'))

    expect(await screen.findAllByText(/เพิ่มข้อมูลกระบอกใหม่/)).not.toHaveLength(0)
  })
})
