import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RepairRequests from './RepairRequests'

// Characterization tests: lock RepairRequests stats behavior before
// splitting presentational blocks out of the main component.

const seedRequests = [
  { id: 'r1', request_no: 'REQ-001', status: 'PENDING' },
  { id: 'r2', request_no: 'REQ-002', status: 'COMPLETED' },
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
    data: seedRequests,
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

describe('RepairRequests characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows status summary computed from seeded requests', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    expect(screen.getAllByText('รอแก้ไข').length).toBeGreaterThan(0)
    expect(screen.getAllByText('แก้ไขสำเร็จ').length).toBeGreaterThan(0)
  })
})
