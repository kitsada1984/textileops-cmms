import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Logs from './Logs'

// Mock useEntity
const mockLogs = [
  {
    id: 'log-1',
    Module: 'MACHINE',
    ActionType: 'CREATE',
    RecordID: 'MC-101',
    User: 'admin',
    FieldName: null,
    OldValue: null,
    NewValue: JSON.stringify({ Mc: 'MC-101', Location: 'A1' }),
    Comment: 'สร้างข้อมูลใหม่ใน เครื่องจักร (รหัส: MC-101)',
    created_at: new Date().toISOString(),
  },
  {
    id: 'log-2',
    Module: 'CYLINDER',
    ActionType: 'UPDATE',
    RecordID: '68757',
    User: 'kitsada (LINE)',
    FieldName: 'NewMC, Location',
    OldValue: JSON.stringify({ NewMC: 'DB-307M' }),
    NewValue: JSON.stringify({ NewMC: 'DB-302M' }),
    Comment: 'แก้ไขข้อมูลใน กระบอก (รหัส: 68757)',
    created_at: new Date().toISOString(),
  },
  {
    id: 'log-3',
    Module: 'WORKORDER',
    ActionType: 'DELETE',
    RecordID: 'WO-999',
    User: 'tech01',
    FieldName: null,
    OldValue: JSON.stringify({ WO_ID: 'WO-999', status: 'cancelled' }),
    NewValue: null,
    Comment: 'ลบข้อมูลใน ใบสั่งงาน (รหัส: WO-999)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
]

vi.mock('../hooks/useEntity', () => ({
  default: () => ({
    data: mockLogs,
    loading: false,
    load: vi.fn(),
  }),
}))

vi.mock('../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

describe('Logs - Enterprise Audit Log System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders KPI summary statistics correctly', () => {
    render(<Logs />)

    expect(screen.getByText('กิจกรรมทั้งหมด')).toBeInTheDocument()
    expect(screen.getAllByText('เพิ่มข้อมูล (CREATE)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('แก้ไข (UPDATE)')[0]).toBeInTheDocument()
    expect(screen.getAllByText('ลบข้อมูล (DELETE)')[0]).toBeInTheDocument()

    // 3 total items in mock
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders all audit log table rows with badges and user info', () => {
    render(<Logs />)

    expect(screen.getByText('MC-101')).toBeInTheDocument()
    expect(screen.getByText('68757')).toBeInTheDocument()
    expect(screen.getByText('WO-999')).toBeInTheDocument()
    expect(screen.getAllByText('kitsada (LINE)')[0]).toBeInTheDocument()
  })

  it('filters rows by text search', async () => {
    render(<Logs />)

    const searchInput = screen.getByPlaceholderText('ค้นหาชื่อผู้ใช้, รหัสรายการ, หรือคำอธิบาย...')
    fireEvent.change(searchInput, { target: { value: '68757' } })

    expect(screen.getByText('68757')).toBeInTheDocument()
    expect(screen.queryByText('MC-101')).not.toBeInTheDocument()
    expect(screen.queryByText('WO-999')).not.toBeInTheDocument()
  })

  it('opens detail modal with Before vs After comparison when clicking a row', () => {
    render(<Logs />)

    // Click on log-2 (UPDATE)
    fireEvent.click(screen.getByText('68757'))

    expect(screen.getByText('รายละเอียดบันทึกกิจกรรม (Audit Log Detail)')).toBeInTheDocument()
    expect(screen.getByText('การเปรียบเทียบข้อมูล (Before vs After)')).toBeInTheDocument()
    expect(screen.getByText('DB-307M')).toBeInTheDocument()
    expect(screen.getByText('DB-302M')).toBeInTheDocument()
  })
})
