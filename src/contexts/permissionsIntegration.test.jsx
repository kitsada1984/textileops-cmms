import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MobileBottomNav from '../components/common/MobileBottomNav'
import * as AuthContext from './AuthContext'

vi.mock('../components/common/MobileBottomNav', async () => {
  const actual = await vi.importActual('../components/common/MobileBottomNav')
  return actual
})

describe('Permission Enforcement Integration', () => {
  it('filters MobileBottomNav buttons according to user permissions', () => {
    // User with only workorders permission
    const testUser = {
      username: 'tech01',
      role: 'user',
      permissions: {
        workorders: ['view', 'add'],
      },
    }

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: testUser })

    render(
      <MemoryRouter>
        <MobileBottomNav onOpenMenu={vi.fn()} />
      </MemoryRouter>
    )

    // Should show ใบสั่งงาน, แจ้งซ่อม and เมนูอื่น
    expect(screen.getByText('ใบสั่งงาน')).toBeInTheDocument()
    expect(screen.getByText('แจ้งซ่อม')).toBeInTheDocument()
    expect(screen.getByText('เมนูอื่น')).toBeInTheDocument()

    // Should NOT show แดชบอร์ด, เครื่องจักร
    expect(screen.queryByText('แดชบอร์ด')).not.toBeInTheDocument()
    expect(screen.queryByText('เครื่องจักร')).not.toBeInTheDocument()
  })

  it('allows admin full access to all MobileBottomNav buttons', () => {
    const adminUser = {
      username: 'admin',
      role: 'admin',
      permissions: {},
    }

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: adminUser })

    render(
      <MemoryRouter>
        <MobileBottomNav onOpenMenu={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.getByText('แดชบอร์ด')).toBeInTheDocument()
    expect(screen.getByText('แจ้งซ่อม')).toBeInTheDocument()
    expect(screen.getByText('ใบสั่งงาน')).toBeInTheDocument()
    expect(screen.getByText('เครื่องจักร')).toBeInTheDocument()
    expect(screen.getByText('เมนูอื่น')).toBeInTheDocument()
  })
})
