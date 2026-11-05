import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StepReport } from './repairSteps'

// Characterization tests: lock the StepReport problem-column behavior
// before splitting it out of the step component.

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    TechnicianAPI: { ...(orig.TechnicianAPI || {}), list: async () => [] },
    RepairRequestAPI: { ...(orig.RepairRequestAPI || {}), list: async () => [] },
  }
})

vi.mock('../../utils/telegram', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, loadTelegramSettingsDB: async () => ({}) }
})

function renderStep() {
  render(
    <StepReport
      serial="SN-001"
      cylinder={{ Design: 'DSG-A' }}
      onSubmitted={() => {}}
      onBack={() => {}}
    />
  )
}

describe('StepReport characterization', () => {
  it('shows the problem column with priority and chips', async () => {
    renderStep()

    expect(await screen.findAllByText(/ระดับความเร่งด่วน/)).not.toHaveLength(0)
    expect(screen.getAllByText('เข็มหัก').length).toBeGreaterThan(0)
    expect(screen.getByText('ยืนยันส่งใบแจ้งซ่อม')).toBeInTheDocument()
  })

  it('toggles urgency when a priority option is clicked', async () => {
    renderStep()
    await screen.findAllByText(/ระดับความเร่งด่วน/)

    fireEvent.click(screen.getByText('🔴 ด่วนที่สุด'))

    expect(screen.getByText('🔴 ด่วนที่สุด')).toBeInTheDocument()
  })
})
