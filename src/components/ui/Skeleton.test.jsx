import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton, TableSkeleton, CardSkeleton } from './Skeleton'

describe('Skeleton Loader Component', () => {
  it('renders base skeleton with accessible status and busy attribute', () => {
    render(<Skeleton className="h-6 w-24" />)
    const el = screen.getByRole('status')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('aria-busy', 'true')
    expect(el).toHaveClass('animate-pulse')
  })

  it('renders TableSkeleton with specified rows and cols', () => {
    const { container } = render(
      <table>
        <tbody>
          <TableSkeleton rows={4} cols={3} />
        </tbody>
      </table>
    )
    const rows = container.querySelectorAll('tr')
    expect(rows).toHaveLength(4)
    const cols = container.querySelectorAll('td')
    expect(cols).toHaveLength(12)
  })

  it('renders CardSkeleton correctly', () => {
    render(<CardSkeleton />)
    expect(screen.getByLabelText('กำลังโหลดการ์ด...')).toBeInTheDocument()
  })
})
