import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdminSecurityModal } from './adminSecurityModal'

// Characterization tests: lock the admin gate modal exactly as the
// in-component version behaved (moved verbatim, props only).

function renderModal(over = {}) {
  const handlers = {
    setAdminModalOpen: vi.fn(),
    setAdminFormName: vi.fn(),
    setAdminFormChatId: vi.fn(),
    setAdminAuthPwd: vi.fn(),
    setAdminAuthError: vi.fn(),
    setAdminStep: vi.fn(),
    setShowAdminPwd: vi.fn(),
    handleVerifyAdminPassword: vi.fn(),
    handleConfirmAdminAction: vi.fn(),
    ...over,
  }
  render(
    <AdminSecurityModal
      adminModalOpen
      adminSubmitting={false}
      adminModalMode="add"
      adminFormName=""
      adminFormChatId=""
      adminAuthPwd=""
      adminAuthError=""
      adminStep={1}
      showAdminPwd={false}
      {...handlers}
    />
  )
  return handlers
}

describe('AdminSecurityModal characterization', () => {
  it('shows the step-1 password verification', () => {
    renderModal()

    expect(screen.getByText(/การยืนยันสิทธิ์ความปลอดภัย/)).toBeInTheDocument()
  })

  it('routes password input to its setter', () => {
    const h = renderModal()

    fireEvent.change(screen.getByPlaceholderText(/กรอกรหัสผ่าน/), {
      target: { value: 'secret123' },
    })
    expect(h.setAdminAuthPwd).toHaveBeenCalledWith('secret123')
  })
})
