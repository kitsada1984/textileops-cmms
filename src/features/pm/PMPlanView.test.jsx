import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PMPlan from './PMPlan'

// Characterization tests (plan Task 3): lock the plan tab behavior before
// splitting the main component. Cylinders are seeded via localStorage
// (the component's real data source); children tabs are stubbed.

const seedCylinders = [
  {
    id: 'cyl-1',
    Serial_NOW: '60709',
    Serial_OLD: 'OLD-01',
    NewMC: 'MC-01',
    Location: 'GMK1',
    Type: 'S',
    Machine_Ref: 'In-use-GMK1',
  },
  {
    id: 'cyl-2',
    Serial_NOW: '63873',
    Serial_OLD: 'OLD-02',
    NewMC: 'MC-02',
    Location: 'GMK3',
    Type: 'D',
    Machine_Ref: 'In-use-GMK3',
  },
]

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin', full_name: 'Test Admin' }, refreshUser: vi.fn() }),
}))

vi.mock('../../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../../hooks/usePagePerms', () => ({
  default: () => ({ canAdd: true, canEdit: true, canDelete: true }),
}))

vi.mock('../../hooks/useEntity', () => ({
  default: () => ({ data: [], loading: false, load: vi.fn(), save: vi.fn(), remove: vi.fn() }),
}))

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => null,
  useWebBuilderColumn: () => null,
  useFieldOptions: (route, field, fallback) => fallback,
}))

vi.mock('./CenterCheck', () => ({
  default: () => <div data-testid="stub-center-check" />,
}))

vi.mock('./NeedleCondition', () => ({
  default: () => <div data-testid="stub-needle" />,
}))

vi.mock('./PMLog', () => ({
  default: () => <div data-testid="stub-pmlog" />,
}))

vi.mock('../../components/pm/PMMonthlyScheduleView', () => ({
  default: () => <div data-testid="stub-monthly" />,
}))

describe('PMPlan characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
    localStorage.setItem('textileops_tbl_cylinders', JSON.stringify(seedCylinders))
  })

  afterEach(() => {
    localStorage.removeItem('textileops_tbl_cylinders')
  })

  it('shows all five tab buttons', async () => {
    render(<PMPlan />)

    await waitFor(() => {
      expect(screen.getAllByText('ประเภททั้งหมด').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByRole('button').length).toBeGreaterThan(5)
  })

  it('shows type summary counts from seeded cylinders', async () => {
    render(<PMPlan />)

    await waitFor(() => {
      expect(screen.getAllByText('ประเภททั้งหมด').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Single Jersey').length).toBeGreaterThan(0)
  })

  it('lists rows driven by in-use cylinders', async () => {
    render(<PMPlan />)

    expect(await screen.findAllByText('MC-01')).not.toHaveLength(0)
    expect(screen.getAllByText('MC-02')).not.toHaveLength(0)
    expect(screen.getAllByText('จัดการ').length).toBeGreaterThan(0)
  })

  it('opens the sync modal from the toolbar button', async () => {
    render(<PMPlan />)
    await screen.findAllByText('MC-01')

    fireEvent.click(screen.getByText('อัพเดตแผน PM'))

    expect(await screen.findAllByText(/อัพเดตแผน PM จากเมนูกระบอก/)).not.toHaveLength(0)
  })

  it('search narrows the plan rows', async () => {
    render(<PMPlan />)
    await screen.findAllByText('MC-01')

    const search = screen.getByPlaceholderText('ค้นหา Machine, ช่าง...')
    fireEvent.change(search, { target: { value: 'MC-01' } })

    await waitFor(() => {
      expect(screen.queryAllByText('MC-02')).toHaveLength(0)
    })
    expect(screen.getAllByText('MC-01')).not.toHaveLength(0)
  })

  it('switches to the needle tab content on click', async () => {
    render(<PMPlan />)
    await screen.findAllByText('MC-01')

    const buttons = screen.getAllByRole('button')
    const needleBtn = buttons.find((b) => b.textContent.includes('สภาพเข็ม'))
    expect(needleBtn).toBeDefined()
    fireEvent.click(needleBtn)

    expect(await screen.findByTestId('stub-needle')).toBeInTheDocument()
  })
})
