import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SpareParts from './SpareParts'

// Characterization tests: lock SpareParts stats behavior before
// splitting presentational blocks out of the main component.

const seedParts = [
  { id: 'p1', Part_Code: 'SP-001', Part_Name_EN: 'Needle S-01', Part_Name: 'เข็ม S-01', Stock_Qty: 10, Min_Qty: 2, Unit_Price: 100 },
  { id: 'p2', Part_Code: 'SP-002', Part_Name_EN: 'Needle D-01', Part_Name: 'เข็ม D-01', Stock_Qty: 0, Min_Qty: 5, Unit_Price: 200 },
  { id: 'p3', Part_Code: 'SP-003', Part_Name_EN: 'Belt X-01', Part_Name: 'สายพาน X-01', Stock_Qty: 3, Min_Qty: 1, Unit_Price: 5500, ImageUrl: 'https://drive.google.com/file/d/abc', Remark: 'ของแท้ เบิกศูนย์\nImageUrl: https://drive.google.com/file/d/abc' },
]

vi.mock('react-router-dom', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, useNavigate: () => vi.fn() }
})

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
    data: seedParts,
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

describe('SpareParts characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows stats summary computed from seeded parts', async () => {
    render(<SpareParts />)

    expect(await screen.findAllByText('รายการอะไหล่ทั้งหมด')).not.toHaveLength(0)
    expect(screen.getAllByText('มูลค่าสต๊อกรวม').length).toBeGreaterThan(0)
  })

  it('opens the add/edit modal from the add button', async () => {
    render(<SpareParts />)
    await screen.findAllByText('รายการอะไหล่ทั้งหมด')

    fireEvent.click(screen.getByText('sp_add'))

    expect(await screen.findAllByText(/เพิ่มข้อมูลอะไหล่ใหม่/)).not.toHaveLength(0)
  })

  it('opens the category modal from the toolbar button', async () => {
    render(<SpareParts />)
    await screen.findAllByText('รายการอะไหล่ทั้งหมด')

    fireEvent.click(screen.getByText('จัดการหมวดหมู่'))

    expect(await screen.findAllByText(/จัดการหมวดหมู่อะไหล่/)).not.toHaveLength(0)
  })

  it('shows the data table with manage column', async () => {
    render(<SpareParts />)
    await screen.findAllByText('รายการอะไหล่ทั้งหมด')

    expect(screen.getAllByText('จัดการ').length).toBeGreaterThan(0)
  })

  it('shows a clean remark without the image URL when editing', async () => {
    render(<SpareParts />)
    await screen.findAllByText('Belt X-01')

    const editButtons = screen.getAllByTitle('แก้ไขข้อมูลอะไหล่')
    fireEvent.click(editButtons[editButtons.length - 1])

    await screen.findAllByText(/แก้ไขข้อมูลอะไหล่/)
    const remarkInput = screen.getByLabelText('remark')
    expect(remarkInput.value).toBe('ของแท้ เบิกศูนย์')
    expect(remarkInput.value).not.toContain('ImageUrl:')
  })

  it('opens the detail drawer on row click', async () => {
    render(<SpareParts />)
    await screen.findAllByText('Needle S-01')

    fireEvent.click(screen.getAllByText('Needle S-01')[0])

    expect(await screen.findAllByText('dr_general_info')).not.toHaveLength(0)
  })
})
