import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterSortPanel, { INIT_FS } from './FilterSortPanel'

const MOCK_COLS = [
  { key: 'name', label: 'ชื่อเครื่องจักร', sortable: true, filter: { type: 'text' } },
  { key: 'status', label: 'สถานะ', sortable: true, filter: { type: 'select', opts: ['RUNNING', 'BREAKDOWN', 'IDLE'] } },
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
    
    // Click RUNNING tag
    const runningOpt = screen.getByRole('button', { name: /RUNNING/i })
    fireEvent.click(runningOpt)

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
