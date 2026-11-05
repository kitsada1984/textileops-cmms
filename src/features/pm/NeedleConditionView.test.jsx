import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NeedleCondition from './NeedleCondition'

// Characterization tests: lock NeedleCondition stats behavior before
// splitting presentational blocks out of the main component.

const seedInspections = [
  {
    id: 'nc-1',
    serial: 'SN-001',
    machine_mc: 'MC-01',
    status: 'สึกเล็กน้อย',
    inspection_date: '2026-10-20',
  },
  {
    id: 'nc-2',
    serial: 'SN-002',
    machine_mc: 'MC-02',
    status: 'สึกมาก(ควรเปลี่ยน)',
    inspection_date: '2026-10-21',
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

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../hooks/useWebBuilderMenu', () => ({
  default: () => null,
  useWebBuilderColumn: () => null,
  useFieldOptions: (route, field, fallback) => fallback,
}))

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    NeedleConditionAPI: {
      ...(orig.NeedleConditionAPI || {}),
      list: async () => seedInspections,
    },
    CylinderAPI: {
      ...(orig.CylinderAPI || {}),
      list: async () => [],
    },
    MachineAPI: {
      ...(orig.MachineAPI || {}),
      list: async () => [],
    },
  }
})

describe('NeedleCondition characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows stats summary computed from seeded inspections', async () => {
    render(<NeedleCondition />)

    expect(await screen.findAllByText('ตรวจสภาพเข็มแล้ว')).not.toHaveLength(0)
    expect(screen.getAllByText('สึกเล็กน้อย').length).toBeGreaterThan(0)
    expect(screen.getAllByText('สึกมาก (ควรเปลี่ยน)').length).toBeGreaterThan(0)
  })

  it('lists seeded inspection rows in the data table', async () => {
    render(<NeedleCondition />)

    expect(await screen.findAllByText('SN-001')).not.toHaveLength(0)
    expect(screen.getAllByText('SN-002').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ซีเรียล (Serial)').length).toBeGreaterThan(0)
  })
})
