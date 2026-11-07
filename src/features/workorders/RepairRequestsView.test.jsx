import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RepairRequests from './RepairRequests'
import { updateRepairRequest } from '../../modules/repair'

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

vi.mock('../../modules/repair', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    updateRepairRequest: vi.fn(async (id, payload) => ({ ok: true, data: { id, ...payload } })),
  }
})

describe('RepairRequests characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
    try {
      localStorage.removeItem('textileops_rr_show_finished')
    } catch {}
  })

  it('shows status summary computed from seeded requests', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    expect(screen.getAllByText('รอแก้ไข').length).toBeGreaterThan(0)
  })

  it('changes status from the drawer quick dropdown without the edit modal', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    fireEvent.click(screen.getAllByText('REQ-001')[0])
    const quickSelect = await screen.findByTitle('เปลี่ยนสถานะใบแจ้งซ่อมด่วน')

    fireEvent.change(quickSelect, { target: { value: 'IN_PROGRESS' } })

    await screen.findAllByText('กำลังแก้ไข')
    expect(updateRepairRequest).toHaveBeenCalledWith('r1', { status: 'IN_PROGRESS' })
  })

  it('offers the WorkOrders status set in the edit form dropdown', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    fireEvent.click(screen.getAllByTitle('แก้ไข')[0])

    const names = screen.getAllByRole('option').map((o) => o.textContent).join(' ')
    for (const label of ['กำลังทำ', 'รอช่าง', 'รออะไหล่', 'รอสรุป', 'รอเทส-ย้อม', 'เสร็จสิ้น', 'ยกเลิก', 'อนุมัติแล้ว']) {
      expect(names).toContain(label)
    }
  })

  it('offers the WorkOrders status set in the drawer quick dropdown', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    fireEvent.click(screen.getAllByText('REQ-001')[0])
    const quickSelect = await screen.findByTitle('เปลี่ยนสถานะใบแจ้งซ่อมด่วน')
    const names = Array.from(quickSelect.querySelectorAll('option')).map((o) => o.textContent).join(' ')
    for (const label of ['กำลังทำ', 'รอช่าง', 'รออะไหล่', 'รอสรุป', 'รอเทส-ย้อม', 'เสร็จสิ้น', 'ยกเลิก']) {
      expect(names).toContain(label)
    }
  })

  it('hides completed repairs by default and shows them when requested', async () => {
    render(<RepairRequests />)
    await screen.findAllByText('รอแก้ไข')

    expect(screen.getAllByText('REQ-001').length).toBeGreaterThan(0)
    expect(screen.queryByText('REQ-002')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: /งานที่เสร็จแล้ว/ }))

    expect(screen.getAllByText('REQ-002').length).toBeGreaterThan(0)
  })
})
