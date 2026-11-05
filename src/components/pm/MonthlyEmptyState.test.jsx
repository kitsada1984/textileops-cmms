import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MonthlyEmptyState } from './MonthlyEmptyState'

// Characterization: lock the table empty state exactly as rendered before.
describe('MonthlyEmptyState characterization', () => {
  it('shows the loading spinner while loading', () => {
    render(
      <MonthlyEmptyState loadingSchedule selectedMonth={10} selectedYear={2026} canAdd handleAutoGenerate={() => {}} daysPerMachine={3} />
    )

    expect(screen.getByText('กำลังโหลดข้อมูลแผนงาน...')).toBeInTheDocument()
  })

  it('shows the empty message with generate action', () => {
    const onGenerate = vi.fn()
    render(
      <MonthlyEmptyState loadingSchedule={false} selectedMonth={10} selectedYear={2026} canAdd handleAutoGenerate={onGenerate} daysPerMachine={3} />
    )

    expect(screen.getByText(/ยังไม่มีรายการแผน PM สำหรับเดือน/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/คลิกสร้างแผนอัตโนมัติ/))
    expect(onGenerate).toHaveBeenCalled()
  })
})
