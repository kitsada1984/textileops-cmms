import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import YarnBeltsView from './YarnBeltsView'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin Test' } }),
}))

const MOCK_MACHINES = [
  {
    id: 1,
    Mc: 'MC-01',
    Location: 'GMK1',
    Type: 'Single Jersey',
    Tape1_No: '8200',
    Tape2_No: '8200',
    Tape3_No: '9800',
    Tape4_No: '9800',
    Tape5_No: '11000',
  },
  {
    id: 2,
    Mc: 'MC-02',
    Location: 'GMK3',
    Type: 'Double Jersey',
    Tape1_No: '7200',
    Tape2_No: '7200',
    Tape3_No: '8800',
    Tape4_No: '8800',
    Tape5_No: '-',
  },
]

describe('YarnBeltsView', () => {
  const mockLogic = {
    data: MOCK_MACHINES,
    loading: false,
    load: vi.fn(),
    setDetailRec: vi.fn(),
  }

  it('renders summary statistics and belt breakdown accurately', () => {
    render(<YarnBeltsView logic={mockLogic} />)

    // Check KPI cards
    expect(screen.getByText('สายพานที่ใช้งานรวม')).toBeInTheDocument()
    // MC-01 has 5, MC-02 has 4 -> total 9 belts
    expect(screen.getByText('9')).toBeInTheDocument()

    // Belt numbers in summary: 7200, 8200, 8800, 9800, 11000 (5 distinct numbers)
    expect(screen.getByText('5')).toBeInTheDocument()

    // Overall summary cards
    expect(screen.getAllByText('8200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('9800').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('7200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('8800').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('11000').length).toBeGreaterThanOrEqual(1)

    // Tape breakdown positions & table headers
    expect(screen.getAllByText('เทป 1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('เทป 2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('เทป 3').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('เทป 4').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('เทป 5').length).toBeGreaterThanOrEqual(1)

    // Machines in matrix table
    expect(screen.getByText('MC-01')).toBeInTheDocument()
    expect(screen.getByText('MC-02')).toBeInTheDocument()
  })

  it('filters machines when clicking a belt number card', () => {
    render(<YarnBeltsView logic={mockLogic} />)

    // Click on 7200 card (which belongs only to MC-02)
    const belt7200Btn = screen.getByRole('button', { name: /7200/i })
    fireEvent.click(belt7200Btn)

    // Tag for drilldown appears
    expect(screen.getByText(/กำลังเจาะลึกเบอร์:/i)).toBeInTheDocument()

    // MC-02 should be in document, MC-01 should NOT
    expect(screen.getByText('MC-02')).toBeInTheDocument()
    expect(screen.queryByText('MC-01')).not.toBeInTheDocument()

    // Clear filter
    const clearBtn = screen.getByTitle('ล้างตัวเลือกเบอร์สายพาน')
    fireEvent.click(clearBtn)
    expect(screen.getByText('MC-01')).toBeInTheDocument()
  })

  it('opens print modal when clicking Print A4 button', () => {
    render(<YarnBeltsView logic={mockLogic} />)

    const printBtn = screen.getByRole('button', { name: /พิมพ์รายงาน A4/i })
    fireEvent.click(printBtn)

    expect(screen.getByText(/พรีวิวรายงานสายพานส่งด้าย เทป 1-5/i)).toBeInTheDocument()
  })
})
