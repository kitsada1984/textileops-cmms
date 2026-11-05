import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StockTransactionModal } from './StockTransactionModal'

// Characterization tests: lock the transaction modal type-specific
// fields before splitting them out of the modal component.

const sets = [
  { id: 's1', setId: 'SET-A-01', grade: 'เกรด A', machineId: 'MC-01', quantity: 10 },
]

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

function renderOpen() {
  render(
    <StockTransactionModal
      isOpen
      onClose={() => {}}
      currentSet={sets[0]}
      needleSets={sets}
      comboboxStore={{}}
      onLearnValues={() => {}}
      onSuccess={() => {}}
    />
  )
}

describe('StockTransactionModal characterization', () => {
  it('shows IN-specific source options when receiving', () => {
    renderOpen()

    fireEvent.click(screen.getByText('รับเข้า'))

    expect(screen.getAllByText('สั่งซื้อของใหม่ (PO)').length).toBeGreaterThan(0)
  })

  it('shows ADJUST-specific reason options on recount', () => {
    renderOpen()

    fireEvent.click(screen.getByText('ตัดยอด'))

    expect(
      screen.getAllByText('ตรวจนับสต็อกประจำเดือน (ยอดจริงไม่ตรง)').length
    ).toBeGreaterThan(0)
  })
})
