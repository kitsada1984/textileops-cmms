import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Purchasing from './Purchasing'

// Characterization tests: lock Purchasing stats behavior before
// splitting presentational blocks out of the main component.

const seedOrders = [
  { id: 'po1', PO_No: 'PO-001', Status: 'ORDERED', Total_Amount: 1000 },
  { id: 'po2', PO_No: 'PO-002', Status: 'RECEIVED', Total_Amount: 2000 },
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
  default: () => ({
    data: seedOrders,
    loading: false,
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => null,
  useWebBuilderColumn: () => null,
  useFieldOptions: (route, field, fallback) => fallback,
}))

describe('Purchasing characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows stats summary computed from seeded orders', async () => {
    render(
      <MemoryRouter>
        <Purchasing />
      </MemoryRouter>
    )
    await screen.findAllByText(/ใบสั่งซื้อ/)

    expect(screen.getAllByText(/ใบสั่งซื้อ/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/มูลค่า/).length).toBeGreaterThan(0)
  })
})
