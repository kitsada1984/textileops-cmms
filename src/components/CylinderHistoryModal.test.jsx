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
      Comment: 'สลับกระบอก 11574 กับ M2500013459-1 ตามแผน',
      RecordID: '11574 <-> M2500013459-1',
      OldValue: JSON.stringify({
        in: { serial: '11574', mc: 'GA-306W', loc: 'GK1' },
        out: { serial: 'M2500013459-1', mc: 'SC-368M', loc: 'GK1' },
      }),
      NewValue: JSON.stringify({
        swapCols: ['Location', 'Machine_Ref', 'Feeder'],
        in: { serial: '11574', mc: 'GA-306W', loc: 'GK1' },
        out: { serial: 'M2500013459-1', mc: 'SC-368M', loc: 'GK1' },
      }),
    },
  ]

  it('renders history list with clickable cards', () => {
    const handleClose = vi.fn()
    render(
      <CylinderHistoryModal
        open={true}
        onClose={handleClose}
        cylinder={{ Serial_NOW: '11574', NewMC: 'GA-306W' }}
        auditLogs={mockAuditLogs}
      />
    )

    // Verify list item exists
    expect(screen.getByText(/ประวัติการเปลี่ยน \/ สลับกระบอกเข็ม/i)).toBeInTheDocument()
    expect(screen.getByText('ช่างสมชาย')).toBeInTheDocument()
    expect(screen.getByText(/ดูรายละเอียดเหมือนตอนสลับ/i)).toBeInTheDocument()
  })

  it('drills down to exact swap comparison matching user screenshot and allows returning', () => {
    const handleClose = vi.fn()
    render(
      <CylinderHistoryModal
        open={true}
        onClose={handleClose}
        cylinder={{ Serial_NOW: '11574', NewMC: 'GA-306W' }}
        auditLogs={mockAuditLogs}
      />
    )

    // Click on the item card or button to view detailed swap
    const detailBtn = screen.getByText(/ดูรายละเอียดเหมือนตอนสลับ/i)
    fireEvent.click(detailBtn)

    // Modal title should now show "สลับกระบอก" matching user's screenshot
    expect(screen.getByRole('heading', { name: 'สลับกระบอก' })).toBeInTheDocument()

    // StepBar should be displayed
    expect(screen.getByText('เลือกกระบอก')).toBeInTheDocument()
    expect(screen.getByText('ตรวจสอบ')).toBeInTheDocument()
    expect(screen.getByText('ยืนยัน')).toBeInTheDocument()

    // Table headers and chips should be displayed
    expect(screen.getByText('คอลัมน์')).toBeInTheDocument()
    expect(screen.getByText('สถานะ')).toBeInTheDocument()
    expect(screen.getByText('OUT')).toBeInTheDocument()
    expect(screen.getByText('IN')).toBeInTheDocument()

    // Notice alert matching screenshot should be displayed
    expect(screen.getByText(/ตรวจสอบคอลัมน์ที่จะ/i)).toBeInTheDocument()

    // Test back button returns to list
    const backBtn = screen.getByRole('button', { name: /ย้อนกลับ/i })
    fireEvent.click(backBtn)

    expect(screen.getByText(/ประวัติการเปลี่ยน \/ สลับกระบอกเข็ม/i)).toBeInTheDocument()
  })
})
