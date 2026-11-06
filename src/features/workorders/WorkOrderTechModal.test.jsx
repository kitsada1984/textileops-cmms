import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkOrderTechModal } from './WorkOrderTechModal'

// Characterization: lock the tech modal exactly as WorkOrders rendered it.
const techForm = {
  id: 'TECH-001',
  Technician_ID: 'TECH-001',
  Name: 'ช่างA',
  Phone: '',
  SkillLevel: 'Senior',
  Specialization: '',
  Status: 'ACTIVE',
  Line_ID: '',
  Telegram_ID: '',
  Avatar_URL: '',
  User_ID: '',
}

function renderModal(over = {}) {
  const handlers = {
    setTechModalOpen: vi.fn(),
    setTechForm: vi.fn(),
    handleSaveTech: vi.fn(),
    handleSelectUserForTech: vi.fn(),
    ...over,
  }
  render(
    <WorkOrderTechModal
      techModalOpen
      editingTechId={null}
      techForm={techForm}
      selectedUserId=""
      systemUsers={[]}
      technicians={[]}
      {...handlers}
    />
  )
  return handlers
}

describe('WorkOrderTechModal characterization', () => {
  it('shows the add form with name field', () => {
    renderModal()

    expect(screen.getByDisplayValue('ช่างA')).toBeInTheDocument()
  })

  it('routes save to its handler', () => {
    const h = renderModal()

    fireEvent.click(screen.getByText('บันทึก'))
    expect(h.handleSaveTech).toHaveBeenCalled()
  })

  it('shows the edit title when editing an existing tech', () => {
    renderModal({ editingTechId: 'TECH-001' })

    expect(screen.getByText(/แก้ไข/)).toBeInTheDocument()
  })
})
