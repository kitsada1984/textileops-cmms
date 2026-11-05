import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StepComplete } from './repairSteps'

// Characterization: lock StepComplete status-gate behavior before
// splitting the gates out (no logic change).

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    SparePartAPI: { ...(orig.SparePartAPI || {}), list: async () => [] },
    StockTxnAPI: { ...(orig.StockTxnAPI || {}), create: async () => ({}) },
    WorkOrderAPI: { ...(orig.WorkOrderAPI || {}), list: async () => [] },
  }
})

const base = {
  repair_details: '',
  technician_name: '',
  parts_used: '',
  approved_at: new Date().toISOString(),
}

describe('StepComplete characterization', () => {
  it('gates PENDING requests with approval message', async () => {
    render(<StepComplete request={{ ...base, status: 'PENDING' }} onUpdated={() => {}} />)

    expect(await screen.findAllByText('ไม่สามารถปิดงานได้')).not.toHaveLength(0)
  })

  it('gates REJECTED requests', async () => {
    render(<StepComplete request={{ ...base, status: 'REJECTED' }} onUpdated={() => {}} />)

    expect(await screen.findAllByText('งานถูกปฏิเสธแล้ว')).not.toHaveLength(0)
  })

  it('gates COMPLETED requests', async () => {
    render(<StepComplete request={{ ...base, status: 'COMPLETED' }} onUpdated={() => {}} />)

    expect(await screen.findAllByText('ปิดงานซ่อมเสร็จสมบูรณ์')).not.toHaveLength(0)
  })

  it('shows the spare-parts picker for approved requests', async () => {
    render(<StepComplete request={{ ...base, status: 'APPROVED' }} onUpdated={() => {}} />)

    expect(await screen.findAllByText(/อะไหล่ที่เบิกใช้/)).not.toHaveLength(0)
  })

  it('shows the duration summary and interruption toggle', async () => {
    render(<StepComplete request={{ ...base, status: 'APPROVED' }} onUpdated={() => {}} />)

    expect(await screen.findAllByText(/สรุปเวลาปฏิบัติงาน/)).not.toHaveLength(0)
  })
})
