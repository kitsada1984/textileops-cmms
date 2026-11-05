import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DesignBom from './DesignBom'

// Characterization tests: lock DesignBom stats behavior before
// splitting presentational blocks out of the main component.

const seedRows = [
  { id: 'd1', MC: 'MC-01', Design: 'DSG-A' },
  { id: 'd2', MC: 'MC-02', Design: 'DSG-B' },
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
    data: seedRows,
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

describe('DesignBom characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows stats summary computed from seeded rows', async () => {
    render(<DesignBom />)
    await screen.findAllByText(/รายการ/)

    expect(screen.getAllByText(/รายการ/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/เครื่อง/).length).toBeGreaterThan(0)
  })
})
