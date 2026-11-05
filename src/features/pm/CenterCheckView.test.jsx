import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CenterCheck from './CenterCheck'

// Characterization tests (plan Task 4): lock CenterCheck behavior before
// splitting the main component.

const seedRecords = [
  {
    id: 'cc-1',
    doc_no: 'CS-S-001',
    doc_date: '2026-10-20',
    mc: 'MC-01',
    type: 'Single',
    mechanic: 'ช่างทดสอบ',
    status: 'ผ่าน',
    counter_total: 100,
    items: [],
    needle_images: [],
  },
  {
    id: 'cc-2',
    doc_no: 'CS-D-001',
    doc_date: '2026-10-21',
    mc: 'MC-02',
    type: 'Double',
    mechanic: 'ช่างทดสอบ',
    status: 'ผ่าน',
    counter_total: 200,
    items: [],
    needle_images: [],
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
  default: (api) => ({
    data: api && api.__kind === 'centercheck' ? seedRecords : [],
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
    CenterCheckAPI: {
      ...(orig.CenterCheckAPI || {}),
      __kind: 'centercheck',
      getStandards: async () => null,
    },
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

describe('CenterCheck characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('lists both seeded inspection records on the history tab', async () => {
    render(<CenterCheck />)

    expect(await screen.findAllByText('CS-S-001')).not.toHaveLength(0)
    expect(screen.getAllByText('CS-D-001')).not.toHaveLength(0)
  })

  it('shows the history sub-tab switcher', () => {
    render(<CenterCheck />)

    expect(screen.getAllByText(/ประวัติการตรวจ/).length).toBeGreaterThan(0)
    // Count badge is wired to the filtered record list (2 seeded rows).
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('shows stats summary computed from seeded records', async () => {
    render(<CenterCheck />)
    await screen.findAllByText('CS-S-001')

    expect(screen.getAllByText('อัตราผ่านเกณฑ์มาตรฐาน').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Single Jersey').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Double Jersey').length).toBeGreaterThan(0)
  })

  it('search narrows the history rows', async () => {
    render(<CenterCheck />)
    await screen.findAllByText('CS-S-001')

    fireEvent.change(
      screen.getByPlaceholderText('ค้นหาเลขที่เอกสาร, เครื่อง M/C, ช่าง หรือ Serial...'),
      { target: { value: 'CS-S-001' } }
    )

    await waitFor(() => {
      expect(screen.queryAllByText('CS-D-001')).toHaveLength(0)
    })
    expect(screen.getAllByText('CS-S-001')).not.toHaveLength(0)
  })

  it('opens the single form when the entry button is clicked', async () => {
    render(<CenterCheck />)
    await screen.findAllByText('CS-S-001')

    fireEvent.click(screen.getAllByText('เช็คศูนย์ Single Jersey')[0])

    expect(await screen.findAllByText(/ฟอร์มบันทึกใหม่ \(Single Jersey\)/)).not.toHaveLength(0)
  })

  it('opens the record-details modal from the history row', async () => {
    render(<CenterCheck />)
    await screen.findAllByText('CS-S-001')

    fireEvent.click(screen.getAllByTitle('ดูรายละเอียดข้อตรวจ')[0])

    expect(await screen.findAllByText(/รายละเอียดใบบันทึก CS-S-001/)).not.toHaveLength(0)
    expect(screen.getAllByText('พิมพ์เอกสาร A4').length).toBeGreaterThan(0)
  })
})
