import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterSortPanel, { INIT_FS } from './FilterSortPanel'

const MOCK_COLS = [
  { key: 'name', label: 'ชื่อเครื่องจักร', sortable: true, filter: { type: 'text' } },
  { key: 'status', label: 'สถานะ', sortable: true, filter: { type: 'select', opts: ['RUNNING', 'BREAKDOWN', 'IDLE', 'MAINTENANCE', 'SPARE'] } },
  { key: 'count', label: 'จำนวน', sortable: true, filter: { type: 'number' } },
  { key: 'date', label: 'วันที่', sortable: true, filter: { type: 'date' } },
]

describe('FilterSortPanel Component', () => {
  it('renders closed initially with the filter button', () => {
    render(<FilterSortPanel cols={MOCK_COLS} value={INIT_FS} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ตัวกรอง/i })).toBeInTheDocument()
    expect(screen.queryByText(/ตัวกรองข้อมูล/i)).not.toBeInTheDocument()
  })

  it('opens panel when filter button is clicked without throwing errors', () => {
    render(<FilterSortPanel cols={MOCK_COLS} value={INIT_FS} onChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /ตัวกรอง/i })
    fireEvent.click(btn)

    // Panel should be visible
    expect(screen.getByText(/ตัวกรองข้อมูล/i)).toBeInTheDocument()
    expect(screen.getByText(/เรียงลำดับ/i)).toBeInTheDocument()
    expect(screen.getByText(/เงื่อนไขกรองข้อมูล/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /นำไปใช้/i })).toBeInTheDocument()
  })

  it('allows selecting filter options and applying changes', () => {
    const handleChange = vi.fn()
    render(<FilterSortPanel cols={MOCK_COLS} value={INIT_FS} onChange={handleChange} />)

    fireEvent.click(screen.getByRole('button', { name: /ตัวกรอง/i }))
    
    // Select RUNNING from dropdown list
    const statusSelect = screen.getByLabelText(/ดรอปดาวน์ลิสต์ สถานะ/i)
    fireEvent.change(statusSelect, { target: { value: 'RUNNING' } })

    // Click Apply
    const applyBtn = screen.getByRole('button', { name: /นำไปใช้/i })
    fireEvent.click(applyBtn)

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          status: ['RUNNING'],
        }),
      })
    )
  })

  it('clears all filters correctly without crash', () => {
    const initialWithFilter = {
      sort: { key: '', dir: 'asc' },
      filters: { status: ['RUNNING'] },
    }
    render(<FilterSortPanel cols={MOCK_COLS} value={initialWithFilter} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /ตัวกรอง/i }))
    
    const clearBtn = screen.getByRole('button', { name: /ล้างเงื่อนไข/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
  })
})

describe('FilterSortPanel select mode (chips vs dropdown)', () => {
  const FEW_OPTS_COLS = [
    { key: 'location', label: 'ตำแหน่ง', sortable: true, filter: { type: 'select', opts: ['GMK1', 'GMK3', 'STORE'], multi: true } },
  ]
  const MANY_OPTS_COLS = [
    { key: 'mc', label: 'รหัสเครื่อง', sortable: true, filter: { type: 'select', opts: ['MC-01', 'MC-02', 'MC-03', 'MC-04', 'MC-05', 'MC-06'], multi: true } },
  ]

  it('shows chips and lets the user pick multiple options when there are fewer than 5', () => {
    const handleChange = vi.fn()
    render(<FilterSortPanel cols={FEW_OPTS_COLS} value={INIT_FS} onChange={handleChange} />)

    fireEvent.click(screen.getByRole('button', { name: /ตัวกรอง/i }))

    // การ์ดตัวเลือก ปรากฏ และไม่มีดรอปดาวน์ลิสต์
    expect(screen.getByRole('button', { name: /GMK1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /GMK3/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /STORE/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/ดรอปดาวน์ลิสต์ ตำแหน่ง/i)).not.toBeInTheDocument()

    // กดเลือก 2 การ์ด แล้วกดนำไปใช้
    const chip1 = screen.getByRole('button', { name: /GMK1/i })
    fireEvent.click(chip1)
    expect(chip1.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /GMK3/i }))
    fireEvent.click(screen.getByRole('button', { name: /นำไปใช้/i }))

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ location: ['GMK1', 'GMK3'] }),
      })
    )
  })

  it('shows a dropdown when there are 5 or more options (multi select)', () => {
    render(<FilterSortPanel cols={MANY_OPTS_COLS} value={INIT_FS} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /ตัวกรอง/i }))

    expect(screen.getByLabelText(/ดรอปดาวน์ลิสต์ รหัสเครื่อง/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^MC-01$/ })).not.toBeInTheDocument()
  })

  it('keeps the single-select dropdown as-is even with few options', () => {
    const singleCols = [
      { key: 'grade', label: 'เกรด', sortable: true, filter: { type: 'select', opts: ['A', 'B'], multi: false } },
    ]
    render(<FilterSortPanel cols={singleCols} value={INIT_FS} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /ตัวกรอง/i }))

    expect(screen.getByLabelText(/ดรอปดาวน์ลิสต์ เกรด/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^A$/ })).not.toBeInTheDocument()
  })
})
