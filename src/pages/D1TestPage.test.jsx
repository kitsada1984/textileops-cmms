import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import D1TestPage from './D1TestPage'
import { useUIStore } from '../stores/useUIStore'

// Mock d1 and supabase clients
vi.mock('../api/d1Client', () => ({
  d1: {
    channel: () => ({
      on: () => ({
        subscribe: (cb) => {
          cb('SUBSCRIBED')
          return { unsubscribe: vi.fn() }
        },
      }),
    }),
    from: () => ({
      select: () => ({
        limit: () =>
          Promise.resolve({
            data: [
              { id: '1', name: 'Machine A', location: 'GK1' },
              { id: '2', name: 'Machine B', location: 'GK3' },
            ],
            error: null,
          }),
      }),
    }),
  },
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}))

describe('D1TestPage - Pilot Page for TanStack Table Integration', () => {
  it('renders D1 test page and integrates DataTable properly', async () => {
    render(<D1TestPage />)

    expect(screen.getByText('ตรวจสอบข้อมูลในตาราง D1')).toBeInTheDocument()

    // Wait for mock data to be loaded into DataTable
    await waitFor(() => {
      expect(screen.getByText('Machine A')).toBeInTheDocument()
      expect(screen.getByText('Machine B')).toBeInTheDocument()
    })
  })

  it('toggles table density between comfortable and compact', async () => {
    act(() => {
      useUIStore.getState().setTableDensity('comfortable')
    })
    render(<D1TestPage />)

    const densityBtn = screen.getByTitle(/สลับโหมดความแน่นของตาราง/)
    expect(densityBtn).toHaveTextContent('ปกติ (Normal)')

    act(() => {
      fireEvent.click(densityBtn)
    })
    expect(useUIStore.getState().tableDensity).toBe('compact')
    expect(densityBtn).toHaveTextContent('กระชับ (Compact)')

    act(() => {
      fireEvent.click(densityBtn)
    })
    expect(useUIStore.getState().tableDensity).toBe('comfortable')
  })
})
