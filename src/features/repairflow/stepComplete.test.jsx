import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StepComplete } from './repairSteps'
import { WorkOrderAPI, SparePartAPI, StockTxnAPI } from '../../api/entities'
import { completeRepairRequest } from '../../modules/repair'

// Characterization: lock StepComplete status-gate behavior before
// splitting the gates out (no logic change).

vi.mock('../../api/entities', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    SparePartAPI: {
      ...(orig.SparePartAPI || {}),
      list: async () => [{ id: 'p1', Part_Code: 'NDL-01', Part_Name_EN: 'เข็ม', Unit: 'ชิ้น', Unit_Price: 10, Stock_Qty: 5 }],
      update: vi.fn(async () => ({})),
    },
    StockTxnAPI: { ...(orig.StockTxnAPI || {}), create: vi.fn(async () => ({})) },
    WorkOrderAPI: { ...(orig.WorkOrderAPI || {}), list: async () => [], create: vi.fn(async () => ({})) },
  }
})

vi.mock('../../modules/repair', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    completeRepairRequest: vi.fn(async () => ({ ok: true, data: { id: 'r1', status: 'COMPLETED' } })),
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

  it('offers the closing-status dropdown before confirming', async () => {
    render(<StepComplete request={{ ...base, status: 'APPROVED' }} onUpdated={() => {}} />)

    const select = await screen.findByTitle('สถานะหลังบันทึกปิดงาน')
    expect(select.value).toBe('COMPLETED')
    const names = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(names.join(' ')).toContain('รอเทส-ย้อม')
  })

  it('syncs the work order as WAITING_DYE_TEST when the tech chooses it', async () => {
    const onUpdated = vi.fn()
    render(<StepComplete request={{ ...base, status: 'APPROVED', id: 'r1', request_no: 'RR-1' }} onUpdated={onUpdated} />)

    fireEvent.change(screen.getByPlaceholderText('ชื่อช่างผู้ปฏิบัติงาน'), { target: { value: 'ช่างหนึ่ง' } })
    fireEvent.change(screen.getByPlaceholderText(/อธิบายวิธีแก้ไข/), { target: { value: 'เปลี่ยนเข็มใหม่' } })
    fireEvent.change(await screen.findByTitle('สถานะหลังบันทึกปิดงาน'), { target: { value: 'WAITING_DYE_TEST' } })
    fireEvent.click(screen.getByRole('button', { name: /ยืนยันบันทึกปิดงานซ่อม/ }))

    await waitFor(() => {
      expect(WorkOrderAPI.create).toHaveBeenCalledWith(expect.objectContaining({ Status: 'WAITING_DYE_TEST' }))
    })
    expect(onUpdated).toHaveBeenCalled()
  })

  it('records used parts as a note without deducting stock', async () => {
    const onUpdated = vi.fn()
    render(<StepComplete request={{ ...base, status: 'APPROVED', id: 'r1', request_no: 'RR-1' }} onUpdated={onUpdated} />)

    const picker = (await screen.findAllByRole('combobox'))[0]
    fireEvent.change(picker, { target: { value: 'p1' } })
    fireEvent.click(screen.getAllByRole('button', { name: /\+ เพิ่ม/ })[0])
    fireEvent.change(screen.getByPlaceholderText('ชื่อช่างผู้ปฏิบัติงาน'), { target: { value: 'ช่างหนึ่ง' } })
    fireEvent.change(screen.getByPlaceholderText(/อธิบายวิธีแก้ไข/), { target: { value: 'เปลี่ยนเข็มใหม่' } })
    fireEvent.click(screen.getByRole('button', { name: /ยืนยันบันทึกปิดงานซ่อม/ }))

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalled()
    })
    expect(completeRepairRequest).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ parts_used: expect.stringContaining('เข็ม') })
    )
    expect(SparePartAPI.update).not.toHaveBeenCalled()
    expect(StockTxnAPI.create).not.toHaveBeenCalled()
  })
})
