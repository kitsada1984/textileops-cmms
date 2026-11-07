import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UnifiedJobs, buildUnifiedRows, getSyncedRepairKeys } from './UnifiedJobs'

vi.mock('../../hooks/useEntity', () => ({
  default: () => ({
    data: [
      { id: 'r1', request_no: 'RR-001', status: 'PENDING', machine_mc: 'DA-1', problem_description: 'เสียงดัง', created_at: '2026-11-02T00:00:00Z' },
      { id: 'r2', request_no: 'RR-002', status: 'COMPLETED', machine_mc: 'DA-2', problem_description: 'เสร็จแล้ว', created_at: '2026-11-03T00:00:00Z' },
    ],
    loading: false,
    load: vi.fn(),
  }),
}))

const jobs = [
  { id: 'j1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', MC: 'GK1', Details: 'ซ่อม', StartTime: '2026-11-04T00:00:00Z' },
  { id: 'j2', Job_ID: 'JOB-002', Status: 'COMPLETED', MC: 'GK2', Details: 'จบแล้ว', StartTime: '2026-11-05T00:00:00Z' },
  {
    id: 'j3', Job_ID: 'WO-RR-009', Status: 'WAITING_DYE_TEST', MC: 'GK3', Details: 'รอเทส',
    Comment: JSON.stringify({ synced_from_repair: true, request_no: 'RR-009', req_id: 'r9' }),
  },
]

const syncedRepair = { id: 'r9', request_no: 'RR-009', status: 'COMPLETED', machine_mc: 'GK3' }

describe('getSyncedRepairKeys', () => {
  it('collects request keys from synced WO rows', () => {
    const keys = getSyncedRepairKeys(jobs)

    expect(keys.has('RR-009')).toBe(true)
    expect(keys.has('r9')).toBe(true)
  })
})

describe('buildUnifiedRows', () => {
  it('shows pending work only and suppresses the synced repair side', () => {
    const rows = buildUnifiedRows(jobs, [{ ...syncedRepair }, { id: 'r8', request_no: 'RR-008', status: 'PENDING' }])
    const nos = rows.map((r) => r.no)

    expect(nos).toContain('JOB-001')
    expect(nos).toContain('RR-008')
    expect(nos).not.toContain('JOB-002')
    expect(nos).not.toContain('RR-009')
    expect(rows.find((r) => r.no === 'WO-RR-009').source).toBe('SYNCED')
  })
})

describe('UnifiedJobs', () => {
  it('renders one row per pending job with its origin badge', () => {
    render(<UnifiedJobs allJobs={jobs} setCurrentTab={vi.fn()} setSearch={vi.fn()} />)

    expect(screen.getByText('JOB-001')).toBeInTheDocument()
    expect(screen.getByText('RR-001')).toBeInTheDocument()
    expect(screen.queryByText('JOB-002')).not.toBeInTheDocument()
    expect(screen.queryByText('RR-002')).not.toBeInTheDocument()
    expect(screen.getAllByText('ใบสั่งงาน').length).toBeGreaterThan(0)
    expect(screen.getAllByText('แจ้งซ่อม').length).toBeGreaterThan(0)
  })

  it('filters rows by origin chip', () => {
    render(<UnifiedJobs allJobs={jobs} setCurrentTab={vi.fn()} setSearch={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /^แจ้งซ่อม/ }))

    expect(screen.getByText('RR-001')).toBeInTheDocument()
    expect(screen.queryByText('JOB-001')).not.toBeInTheDocument()
  })

  it('opens a WO row in the records tab with search set', () => {
    const setCurrentTab = vi.fn()
    const setSearch = vi.fn()
    render(<UnifiedJobs allJobs={jobs} setCurrentTab={setCurrentTab} setSearch={setSearch} />)

    fireEvent.click(screen.getByText('JOB-001'))

    expect(setSearch).toHaveBeenCalledWith('JOB-001')
    expect(setCurrentTab).toHaveBeenCalledWith('records')
  })
})
