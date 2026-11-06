import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrdersTechnicians } from './WorkOrdersTechnicians'

// Characterization: lock the technicians tab exactly as WorkOrders rendered it.
const tech = { id: 't1', Name: 'ช.ต๋อง', Phone: '081-000-0000', SkillLevel: 'Senior', Specialization: 'ไฟฟ้า, เครื่องกล', Status: 'ACTIVE' }

function renderTab(over = {}) {
  const handlers = {
    technicians: [tech], unregisteredLineUsers: [], canAdd: true, canEdit: true, canDelete: true,
    openAddTech: vi.fn(), openEditTech: vi.fn(), handleDeleteTech: vi.fn(), ...over,
  }
  render(<WorkOrdersTechnicians {...handlers} />)
  return handlers
}

describe('WorkOrdersTechnicians characterization', () => {
  it('shows the registry header and tech card', () => {
    renderTab()

    expect(screen.getByText('ทะเบียนช่างปรับ & ซ่อมบำรุง (Technicians Registry)')).toBeInTheDocument()
    expect(screen.getByText('ช.ต๋อง')).toBeInTheDocument()
  })

  it('routes add/edit/delete actions', () => {
    const h = renderTab()

    fireEvent.click(screen.getByText('เพิ่มช่างใหม่'))
    expect(h.openAddTech).toHaveBeenCalled()
    fireEvent.click(screen.getByText('แก้ไขข้อมูล'))
    expect(h.openEditTech).toHaveBeenCalledWith(tech)
    fireEvent.click(screen.getByTitle('ลบรายชื่อช่าง'))
    expect(h.handleDeleteTech).toHaveBeenCalledWith(tech)
  })

  it('shows the empty state with first-tech CTA', () => {
    renderTab({ technicians: [] })

    expect(screen.getByText('ยังไม่มีรายชื่อในทะเบียนช่าง')).toBeInTheDocument()
    expect(screen.getByText('+ เพิ่มช่างคนแรก')).toBeInTheDocument()
  })
})
