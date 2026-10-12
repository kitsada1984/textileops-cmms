import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SearchInput from './SearchInput'

describe('SearchInput Accessibility & Functionality', () => {
  it('renders input with aria-label matching placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="ค้นหาข้อมูล..." />)
    const input = screen.getByLabelText('ค้นหาข้อมูล...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'ค้นหาข้อมูล...')
  })

  it('renders clear button with aria-label when value is present and clears text on click', () => {
    const handleChange = vi.fn()
    render(<SearchInput value="test" onChange={handleChange} placeholder="ค้นหา" />)

    const clearBtn = screen.getByLabelText('ล้างคำค้นหา')
    expect(clearBtn).toBeInTheDocument()
    expect(clearBtn).toHaveAttribute('title', 'ล้างคำค้นหา')

    fireEvent.click(clearBtn)
    expect(handleChange).toHaveBeenCalledWith('')
  })
})
