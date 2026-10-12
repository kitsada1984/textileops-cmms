import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CylinderHistoryModal from './CylinderHistoryModal'

describe('CylinderHistoryModal Component', () => {
  const mockAuditLogs = [
    {
      id: 'log-1',
      Module: 'CYLINDERS',
      ActionType: 'SWAP',
      created_at: '2026-10-12T10:00:00Z',
      User: 'ช่างสมชาย',
      Comment: 'สลับกระบอก CYL-01 กับ CYL-02 ตามแผน',
      RecordID: 'CYL-01 <-> CYL-02',
      OldValue: JSON.stringify({
        in: { serial: 'CYL-01', mc: 'MC-01', loc: 'Line A' },
        out: { serial: 'CYL-02', mc: 'MC-02', loc: 'Line B' },
      }),
      NewValue: JSON.stringify({
        swapCols: ['Location', 'Machine_Ref', 'Feeder'],
        in: { serial: 'CYL-01', mc: 'MC-01', loc: 'Line B' },
        out: { serial: 'CYL-02', mc: 'MC-02', loc: 'Line A' },
      }),
    },
  ]

  it('renders history list with clickable cards', () => {
    const handleClose = vi.fn()
    render(
      <CylinderHistoryModal
        open={true}
        onClose={handleClose}
        cylinder={{ Serial_NOW: 'CYL-01', NewMC: 'MC-01' }}
        auditLogs={mockAuditLogs}
      />
    )

    // Verify list item exists
    expect(screen.getByText(/ประวัติการเปลี่ยน \/ สลับกระบอกเข็ม/i)).toBeInTheDocument()
    expect(screen.getByText('ช่างสมชาย')).toBeInTheDocument()
    expect(screen.getByText(/ดูรายละเอียดเหมือนตอนสลับ/i)).toBeInTheDocument()
  })

  it('drills down to detailed swap comparison when clicking on an item and allows returning', () => {
    const handleClose = vi.fn()
    render(
      <CylinderHistoryModal
        open={true}
        onClose={handleClose}
        cylinder={{ Serial_NOW: 'CYL-01', NewMC: 'MC-01' }}
        auditLogs={mockAuditLogs}
      />
    )

    // Click on the item card or button to view detailed swap
    const detailBtn = screen.getByText(/ดูรายละเอียดเหมือนตอนสลับ/i)
    fireEvent.click(detailBtn)

    // Detail view should now be displayed
    expect(screen.getByText('ย้อนกลับไปรายการประวัติทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('รายการสลับกระบอก (SWAP)')).toBeInTheDocument()
    expect(screen.getByText('ผู้ดำเนินการ: ช่างสมชาย')).toBeInTheDocument()
    expect(screen.getByText(/เปรียบเทียบสเปกตามจริง/i)).toBeInTheDocument()
    expect(screen.getByText('สถานที่จัดเก็บ (Location)')).toBeInTheDocument()

    // Test back button returns to list
    const backBtn = screen.getByText('ย้อนกลับไปรายการประวัติทั้งหมด')
    fireEvent.click(backBtn)

    expect(screen.getByText(/ดูรายละเอียดเหมือนตอนสลับ/i)).toBeInTheDocument()
  })
})
