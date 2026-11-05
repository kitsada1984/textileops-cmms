import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SpareRequestRow } from './spareRequestRow'

// Characterization tests: lock the spare-request row exactly as the
// in-component version behaved (moved verbatim, props only).

const req = {
  id: 'r1',
  request_no: 'REQ-001',
  machine_mc: 'MC-01',
  gauge: '28',
  cylinder_serial: 'SN-001',
  technician_name: 'ช่างทดสอบ',
  shift: 'กะเช้า',
  tracks_requested: { dial: { single: 5 }, cylinder: { t1: 3 } },
  status: 'PENDING',
  created_at: '2026-10-20T08:00:00',
}

function renderRow(over = {}) {
  const handlers = {
    setSelectedSpareReq: vi.fn(),
    setPrepareModalOpen: vi.fn(),
    setSelectedEditReq: vi.fn(),
    setEditSpareModalOpen: vi.fn(),
    setSelectedDeleteReq: vi.fn(),
    setDeleteAckReturned: vi.fn(),
    setDeleteConfirmModalOpen: vi.fn(),
    ...over,
  }
  render(
    <table>
      <tbody>
        <SpareRequestRow req={req} {...handlers} />
      </tbody>
    </table>
  )
  return handlers
}

describe('SpareRequestRow characterization', () => {
  it('shows dial/cylinder chips and pending status', () => {
    renderRow()

    expect(screen.getByText('Dial Single: 5')).toBeInTheDocument()
    expect(screen.getByText('Cyl T1: 3')).toBeInTheDocument()
    expect(screen.getByText(/รอจัดเตรียม/)).toBeInTheDocument()
  })

  it('routes prepare/edit/delete clicks with the row', () => {
    const h = renderRow()

    fireEvent.click(screen.getByTitle('จัดเตรียมเข็มและตัดสต็อกออกจากคลัง'))
    expect(h.setSelectedSpareReq).toHaveBeenCalledWith(req)
    expect(h.setPrepareModalOpen).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByTitle('แก้ไขข้อมูลใบเบิกเข็ม'))
    expect(h.setSelectedEditReq).toHaveBeenCalledWith(req)

    fireEvent.click(screen.getByTitle('ลบใบเบิก'))
    expect(h.setSelectedDeleteReq).toHaveBeenCalledWith(req)
  })
})
