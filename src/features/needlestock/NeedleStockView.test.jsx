import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NeedleStock from './NeedleStock'

// Characterization tests (plan Task 5): lock NeedleStock tab behavior
// before splitting the main component.

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin', full_name: 'Test Admin' } }),
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

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  const sets = [
    { id: 's1', setId: 'SET-A-01', grade: 'เกรด A', machineId: 'MC-01', quantity: 10 },
    { id: 's2', setId: 'SET-B-01', grade: 'เกรด B', machineId: 'MC-02', quantity: 5 },
  ]
  const logs = [
    { id: 'l1', actionType: 'IN', setId: 'SET-A-01', quantity: 10 },
  ]
  const byApi = new Map([
    ['NeedleSetAPI', sets],
    ['NeedleHistoryAPI', logs],
    ['SpareNeedleRequestAPI', []],
  ])
  const patched = { ...orig }
  for (const key of Object.keys(patched)) {
    const v = patched[key]
    if (v && typeof v === 'object' && 'list' in v) {
      const rows = byApi.get(key) || []
      patched[key] = { ...v, list: async () => rows }
    }
  }
  return patched
})

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => null,
  useWebBuilderColumn: () => null,
  useFieldOptions: (route, field, fallback) => fallback,
}))

describe('NeedleStock characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows all three tab buttons', async () => {
    render(<NeedleStock />)
    await screen.findAllByText('SET-A-01')

    expect(screen.getAllByText('รายการชุดเข็ม & สต็อก').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/สมุดบันทึกการเคลื่อนไหวสต็อก/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('รายการขอเบิกเข็ม Spare').length).toBeGreaterThan(0)
  })

  it('lists both seeded needle sets on the inventory tab', async () => {
    render(<NeedleStock />)

    expect(await screen.findAllByText('SET-A-01')).not.toHaveLength(0)
    expect(screen.getAllByText('SET-B-01')).not.toHaveLength(0)
  })

  it('grade card filters the inventory down to that grade', async () => {
    render(<NeedleStock />)
    await screen.findAllByText('SET-A-01')

    fireEvent.click(screen.getAllByText('เกรด A (พร้อมใช้)')[0])

    await waitFor(() => {
      expect(screen.queryAllByText('SET-B-01')).toHaveLength(0)
    })
    expect(screen.getAllByText('SET-A-01')).not.toHaveLength(0)
  })

  it('shows the stock activity strip with computed totals', async () => {
    render(<NeedleStock />)
    await screen.findAllByText('SET-A-01')

    expect(screen.getAllByText('สต็อกพร้อมใช้ (A+B)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('รับเข้าสะสม (In)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('เบิกออกสะสม (Out)').length).toBeGreaterThan(0)
  })

  it('switches to the ledger tab content on click', async () => {
    render(<NeedleStock />)
    await screen.findAllByText('SET-A-01')

    fireEvent.click(screen.getAllByText('สมุดบันทึกการเคลื่อนไหวสต็อก (Ledger)')[0])

    expect(await screen.findAllByText('ทั้งหมด')).not.toHaveLength(0)
  })
})
