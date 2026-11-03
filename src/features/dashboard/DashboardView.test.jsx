import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dashboard from './Dashboard'

// Characterization tests (plan Task 2): lock Dashboard render behavior
// before splitting the main component.
// (Mock datasets live inside the vi.mock factory below — vitest hoists
// factories, so top-level variables are not visible there.)

vi.mock('../../contexts/LanguageContext', () => ({
  useT: () => ({ t: (k) => k }),
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('../../api/realtimeSync', () => ({
  useRealtimeTables: () => {},
}))

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  const byApi = new Map([
    ['MachineAPI', [
      { id: 'm1', Status: 'BREAKDOWN' },
      { id: 'm2', Status: 'RUNNING' },
    ]],
    ['WorkOrderAPI', [
      { id: 'w1', Status: 'OPEN', Job_ID: 'JOB-TEST-1', MC: 'MC-01' },
    ]],
    ['RepairRequestAPI', [
      {
        id: 'r1',
        request_no: 'REQ-TEST-01',
        status: 'PENDING',
        machine_mc: 'MC-01',
        created_at: '2026-11-01T08:00:00.000Z',
      },
    ]],
  ])
  const patched = { ...orig }
  for (const key of Object.keys(patched)) {
    if (patched[key] && typeof patched[key] === 'object' && 'list' in patched[key]) {
      const rows = byApi.get(key) || []
      patched[key] = { ...patched[key], list: async () => rows }
    }
  }
  return patched
})

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('shows machine KPI labels with live counts', async () => {
    renderDashboard()

    expect(await screen.findAllByText('dash_total_mc')).not.toHaveLength(0)
    expect(screen.getAllByText('dash_breakdown')).not.toHaveLength(0)
  })

  it('lists the pending repair row', async () => {
    renderDashboard()

    expect(await screen.findAllByText('REQ-TEST-01')).not.toHaveLength(0)
  })

  it('opens the repair drawer when the row is clicked', async () => {
    renderDashboard()
    const rows = await screen.findAllByText('REQ-TEST-01')

    fireEvent.click(rows[0])

    expect(await screen.findAllByText(/งานแจ้งซ่อม: REQ-TEST-01/)).not.toHaveLength(0)
  })

  it('lists the pending work order row', async () => {
    renderDashboard()

    expect(await screen.findAllByText('JOB-TEST-1')).not.toHaveLength(0)
  })
})
