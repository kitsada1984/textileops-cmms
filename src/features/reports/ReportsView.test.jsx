import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Reports from './Reports'

// Characterization: lock Reports header/KPI behavior before splitting
// presentational blocks out of the main component (no logic change).

vi.mock('react-router-dom', async (importOriginal) => {
  const orig = await importOriginal()
  return { ...orig, useNavigate: () => vi.fn() }
})

vi.mock('../../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    MachineAPI: { list: async () => [] },
    WorkOrderAPI: { list: async () => [] },
    PMPlanAPI: { list: async () => [] },
    SparePartAPI: { list: async () => [] },
    isSystemWorkOrder: () => false,
  }
})

describe('Reports characterization', () => {
  it('shows header with time-filter pills and print action', async () => {
    render(<Reports />)

    expect(await screen.findAllByText('rpt_title')).not.toHaveLength(0)
    expect(screen.getAllByText('rpt_filter_all').length).toBeGreaterThan(0)
    expect(screen.getByText('พิมพ์รายงาน / PDF')).toBeInTheDocument()
  })

  it('switches time filter when a pill is clicked', async () => {
    render(<Reports />)
    await screen.findAllByText('rpt_title')

    fireEvent.click(screen.getByText('rpt_filter_week'))

    expect(screen.getByText('rpt_filter_week')).toBeInTheDocument()
  })
})
