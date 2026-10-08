import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import YarnBeltsPrintModal from './YarnBeltsPrintModal'

const MOCK_DATA = {
  stats: {
    totalBelts: 10,
    uniqueBeltSizes: 3,
    totalMachines: 2,
    machinesWithBelts: 2,
  },
  overallSummary: [
    {
      beltNo: '8200',
      totalQty: 4,
      machineCount: 2,
      tapePositions: { 1: 2, 2: 2, 3: 0, 4: 0, 5: 0 },
    },
    {
      beltNo: '9800',
      totalQty: 4,
      machineCount: 2,
      tapePositions: { 1: 0, 2: 0, 3: 2, 4: 2, 5: 0 },
    },
  ],
  tapeBreakdown: {
    1: [{ beltNo: '8200', qty: 2 }],
    2: [{ beltNo: '8200', qty: 2 }],
    3: [{ beltNo: '9800', qty: 2 }],
    4: [{ beltNo: '9800', qty: 2 }],
    5: [],
  },
}

describe('YarnBeltsPrintModal', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <YarnBeltsPrintModal open={false} onClose={vi.fn()} data={MOCK_DATA} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders report title, stats, and tables when open', () => {
    render(
      <YarnBeltsPrintModal
        open={true}
        onClose={vi.fn()}
        data={MOCK_DATA}
        locationFilter="GMK1"
        currentUserName="Admin Tester"
      />
    )

    expect(screen.getByText('รายงานสรุปสายพานส่งด้าย (เทป 1 - 5)')).toBeInTheDocument()
    expect(screen.getByText(/บริษัท เจ็มม่า นิตส์ จำกัด/i)).toBeInTheDocument()
    expect(screen.getByText(/โซน GMK1/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Admin Tester/i).length).toBeGreaterThanOrEqual(1)

    // Check overall summary
    expect(screen.getAllByText('8200').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('9800').length).toBeGreaterThanOrEqual(1)
  })

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <YarnBeltsPrintModal
        open={true}
        onClose={vi.fn()}
        data={MOCK_DATA}
      />
    )

    const printBtn = screen.getByRole('button', { name: /พิมพ์เอกสาร \/ บันทึก PDF/i })
    fireEvent.click(printBtn)

    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <YarnBeltsPrintModal
        open={true}
        onClose={onClose}
        data={MOCK_DATA}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /ปิดหน้าต่าง/i })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
