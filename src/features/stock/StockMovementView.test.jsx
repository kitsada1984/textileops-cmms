import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StockMovement from './StockMovement'

// Characterization tests: lock StockMovement stats behavior before
// splitting presentational blocks out of the main component.

const seedTxns = [
  { id: 't1', TXN_Type: 'RECEIVE', Part_Name: 'เข็ม S-01' },
  { id: 't2', TXN_Type: 'ISSUE', Part_Name: 'เข็ม D-01' },
  { id: 't3', TXN_Type: 'ADJUST', Part_Name: 'เข็ม J-01' },
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
  default: (api) => ({
    data: api && api.__kind === 'sparepart' ? [] : seedTxns,
    loading: false,
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    SparePartAPI: { ...(orig.SparePartAPI || {}), __kind: 'sparepart' },
  }
})

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => null,
  useWebBuilderColumn: () => null,
  useFieldOptions: (route, field, fallback) => fallback,
}))

describe('StockMovement characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows stats summary computed from seeded transactions', async () => {
    render(<StockMovement />)
    await screen.findAllByText('รายการเคลื่อนไหวทั้งหมด')

    expect(screen.getAllByText('รายการเคลื่อนไหวทั้งหมด').length).toBeGreaterThan(0)
    expect(screen.getAllByText('รับเข้าสต๊อก (Receive)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('เบิกจ่ายสต๊อก (Issue)').length).toBeGreaterThan(0)
  })

  it('opens the add/edit modal from the add button', async () => {
    render(<StockMovement />)
    await screen.findAllByText('รายการเคลื่อนไหวทั้งหมด')

    fireEvent.click(screen.getByText('บันทึกเคลื่อนไหว'))

    expect(await screen.findAllByText(/บันทึกเคลื่อนไหวสต๊อก/)).not.toHaveLength(0)
  })
})
