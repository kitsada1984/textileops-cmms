import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('D1TestPage - Pilot Page for TanStack Table Integration & Cloudflare Quota Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/d1/quota')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              plan: 'Cloudflare Free Plan',
              has_warning: true,
              quotas: {
                rows_read: {
                  label: 'การอ่านแถวข้อมูล D1 (Rows Read)',
                  current: 4431650,
                  limit: 5000000,
                  percent: 88.63,
                  level: 'critical',
                  readable_current: '4.43M',
                  readable_limit: '5.00M',
                  unit: 'แถว/วัน',
                },
                rows_written: {
                  label: 'การเขียนแถวข้อมูล D1 (Rows Written)',
                  current: 685,
                  limit: 100000,
                  percent: 0.69,
                  level: 'normal',
                  readable_current: '685',
                  readable_limit: '100,000',
                  unit: 'แถว/วัน',
                },
                storage: {
                  label: 'พื้นที่จัดเก็บฐานข้อมูล (Storage)',
                  current: 2351104,
                  limit: 5368709120,
                  percent: 0.05,
                  level: 'normal',
                  readable_current: '2.35 MB',
                  readable_limit: '5.00 GB',
                  unit: 'ไบต์',
                },
                functions_requests: {
                  label: 'การเรียกใช้ Pages Functions (Requests)',
                  current: 4937,
                  limit: 100000,
                  percent: 4.94,
                  level: 'normal',
                  readable_current: '4,937',
                  readable_limit: '100,000',
                  unit: 'ครั้ง/วัน',
                },
              },
              activity_24h: {
                read_queries: 49919,
                write_queries: 111,
                total_queries: 50030,
                num_tables: 19,
              },
              last_updated: new Date().toISOString(),
            }),
        })
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`))
    })
  })

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

  it('renders Cloudflare Quotas & Resource Usage monitor cards and warning banner', async () => {
    render(<D1TestPage />)

    expect(screen.getByText('สถานะโควต้า Cloudflare (Cloudflare Quota & Resource Usage)')).toBeInTheDocument()
    expect(screen.getByText('D1 ROWS READ (24H)')).toBeInTheDocument()
    expect(screen.getByText('D1 ROWS WRITTEN (24H)')).toBeInTheDocument()
    expect(screen.getByText('D1 STORAGE SIZE')).toBeInTheDocument()
    expect(screen.getByText('PAGES FUNCTIONS (24H)')).toBeInTheDocument()

    // Warning banner should be present due to 88.6% rows read
    expect(screen.getByText(/⚠️ แจ้งเตือน: การอ่านข้อมูล D1 \(Rows Read\) อยู่ในระดับเสี่ยงสูง/)).toBeInTheDocument()
    expect(screen.getByText('⚠️ ใกล้ติดลิมิต')).toBeInTheDocument()
    expect(screen.getByText(/อ่านคำสั่ง \(Read Queries\):/)).toBeInTheDocument()
  })

  it('opens and closes Cloudflare API Token configuration modal', async () => {
    render(<D1TestPage />)

    const tokenBtn = screen.getByRole('button', { name: /ตั้งค่า Token/i })
    fireEvent.click(tokenBtn)

    expect(screen.getByText('ตั้งค่า Cloudflare API Token')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/เช่น cfoat_.../i)).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /ยกเลิก/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/เช่น cfoat_.../i)).not.toBeInTheDocument()
    })
  })
})
