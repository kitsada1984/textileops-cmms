import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SearchableDropdown from './SearchableDropdown'

describe('SearchableDropdown Component', () => {
  const options = [
    { value: 'SP-001', label: 'SP-001 - Bearing 6204' },
    { value: 'SP-002', label: 'SP-002 - Timing Belt' },
    { value: 'SP-003', label: 'SP-003 - Cylinder Needle' },
  ]

  it('renders input with placeholder and value', () => {
    render(
      <SearchableDropdown
        value="SP-001"
        onChange={vi.fn()}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )
    const input = screen.getByPlaceholderText('เลือกอะไหล่...')
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('SP-001')
  })

  it('opens dropdown list when toggle chevron button is clicked', () => {
    render(
      <SearchableDropdown
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    const toggleBtn = screen.getByLabelText('เปิดดรอปดาวน์ลิสต์')
    fireEvent.click(toggleBtn)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('SP-001 - Bearing 6204')).toBeInTheDocument()
    expect(screen.getByText('SP-002 - Timing Belt')).toBeInTheDocument()
  })

  it('allows selecting an option from dropdown list and triggers onChange', () => {
    const handleChange = vi.fn()
    render(
      <SearchableDropdown
        value=""
        onChange={handleChange}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )

    const input = screen.getByPlaceholderText('เลือกอะไหล่...')
    fireEvent.focus(input)

    const optBtn = screen.getByText('SP-002 - Timing Belt')
    fireEvent.click(optBtn)

    expect(handleChange).toHaveBeenCalledWith('SP-002')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('filters options when typing search query', () => {
    render(
      <SearchableDropdown
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )

    const input = screen.getByPlaceholderText('เลือกอะไหล่...')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Belt' } })

    expect(screen.getByText('SP-002 - Timing Belt')).toBeInTheDocument()
    expect(screen.queryByText('SP-001 - Bearing 6204')).not.toBeInTheDocument()
  })

  it('allows custom typed value when not matching options', () => {
    const handleChange = vi.fn()
    render(
      <SearchableDropdown
        value=""
        onChange={handleChange}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )

    const input = screen.getByPlaceholderText('เลือกอะไหล่...')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'CUSTOM-999' } })

    expect(handleChange).toHaveBeenCalledWith('CUSTOM-999')
    const customBtn = screen.getByText(/ใช้ค่าที่พิมพ์:/i)
    expect(customBtn).toBeInTheDocument()

    fireEvent.click(customBtn)
    expect(handleChange).toHaveBeenLastCalledWith('CUSTOM-999')
  })

  it('clears value when X clear button is clicked', () => {
    const handleChange = vi.fn()
    render(
      <SearchableDropdown
        value="SP-001"
        onChange={handleChange}
        options={options}
        placeholder="เลือกอะไหล่..."
      />
    )

    const clearBtn = screen.getByLabelText('ล้างค่า')
    fireEvent.click(clearBtn)
    expect(handleChange).toHaveBeenCalledWith('')
  })
})
