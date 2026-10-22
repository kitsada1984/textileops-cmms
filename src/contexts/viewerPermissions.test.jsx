import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { canAccess, hasPerm, normalizeUser } from './AuthContext'
import usePagePerms from '../hooks/usePagePerms'

// Mock useAuth to return specific user for testing usePagePerms
let mockUser = null
vi.mock('./AuthContext', async () => {
  const actual = await vi.importActual('./AuthContext')
  return {
    ...actual,
    useAuth: () => ({ user: mockUser }),
  }
})

describe('Viewer Default Permissions (Scanned User Permissions)', () => {
  const scannedViewerUser = normalizeUser({
    id: 'usr_scanned_001',
    username: 'line_abcd12',
    full_name: 'สมชาย ผู้ชม',
    role: 'viewer',
    permissions: JSON.stringify({
      dashboard: ['view'],
      machines: ['view'],
      cylinders: ['view'],
      workorders: ['view'],
      pm: ['view'],
      designbom: ['view'],
      needlestock: ['view'],
      spareparts: ['view'],
      purchasing: ['view'],
      stock: ['view'],
      reports: ['view'],
      logs: ['view'],
    }),
  })

  it('allows viewing operational and analytics menus', () => {
    expect(canAccess(scannedViewerUser, 'dashboard')).toBe(true)
    expect(canAccess(scannedViewerUser, 'machines')).toBe(true)
    expect(canAccess(scannedViewerUser, 'cylinders')).toBe(true)
    expect(canAccess(scannedViewerUser, 'workorders')).toBe(true)
    expect(canAccess(scannedViewerUser, 'pm')).toBe(true)
    expect(canAccess(scannedViewerUser, 'spareparts')).toBe(true)
    expect(canAccess(scannedViewerUser, 'reports')).toBe(true)
    expect(canAccess(scannedViewerUser, 'logs')).toBe(true)
  })

  it('strictly blocks adding, editing, and deleting across all modules', () => {
    const modules = ['machines', 'cylinders', 'workorders', 'pm', 'spareparts', 'stock']
    for (const mod of modules) {
      expect(hasPerm(scannedViewerUser, mod, 'view')).toBe(true)
      expect(hasPerm(scannedViewerUser, mod, 'add')).toBe(false)
      expect(hasPerm(scannedViewerUser, mod, 'edit')).toBe(false)
      expect(hasPerm(scannedViewerUser, mod, 'delete')).toBe(false)
    }
  })

  it('blocks access to system administration menus (users, settings, webbuilder)', () => {
    expect(canAccess(scannedViewerUser, 'users')).toBe(false)
    expect(canAccess(scannedViewerUser, 'settings')).toBe(false)
    expect(canAccess(scannedViewerUser, 'webbuilder')).toBe(false)
  })

  it('evaluates usePagePerms hook correctly with canView=true and canAdd/canEdit/canDelete=false', () => {
    mockUser = scannedViewerUser
    const { result } = renderHook(() => usePagePerms('machines'))
    expect(result.current.canView).toBe(true)
    expect(result.current.canAdd).toBe(false)
    expect(result.current.canEdit).toBe(false)
    expect(result.current.canDelete).toBe(false)
  })

  it('preserves full permissions for existing admin users (backward compatibility)', () => {
    const adminUser = normalizeUser({
      id: 'usr_admin_001',
      username: 'admin',
      role: 'admin',
      permissions: {},
    })

    expect(canAccess(adminUser, 'users')).toBe(true)
    expect(canAccess(adminUser, 'settings')).toBe(true)
    expect(hasPerm(adminUser, 'machines', 'add')).toBe(true)
    expect(hasPerm(adminUser, 'machines', 'edit')).toBe(true)
    expect(hasPerm(adminUser, 'machines', 'delete')).toBe(true)

    mockUser = adminUser
    const { result } = renderHook(() => usePagePerms('machines'))
    expect(result.current.canView).toBe(true)
    expect(result.current.canAdd).toBe(true)
    expect(result.current.canEdit).toBe(true)
    expect(result.current.canDelete).toBe(true)
  })
})
