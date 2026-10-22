import { describe, it, expect } from 'vitest'
import { canAccess, hasPerm, hashPassword, PERM_ACTIONS, normalizeUser, parsePermissions } from './AuthContext'

// ─── PERM_ACTIONS constant ────────────────────────────────────
describe('PERM_ACTIONS', () => {
  it('contains all four expected actions', () => {
    expect(PERM_ACTIONS).toEqual(['view', 'add', 'edit', 'delete'])
  })
})

// ─── canAccess ───────────────────────────────────────────────
describe('canAccess', () => {
  it('returns false for null user', () => {
    expect(canAccess(null, 'machines')).toBe(false)
  })

  it('returns false for undefined user', () => {
    expect(canAccess(undefined, 'machines')).toBe(false)
  })

  it('returns true for admin regardless of menu', () => {
    const admin = { role: 'admin', permissions: {} }
    expect(canAccess(admin, 'machines')).toBe(true)
    expect(canAccess(admin, 'any_menu')).toBe(true)
  })

  it('returns true when user has at least one permission for the menu', () => {
    const user = { role: 'user', permissions: { machines: ['view'] } }
    expect(canAccess(user, 'machines')).toBe(true)
  })

  it('returns false when permissions array is empty', () => {
    const user = { role: 'user', permissions: { machines: [] } }
    expect(canAccess(user, 'machines')).toBe(false)
  })

  it('returns false when menu key is not in permissions', () => {
    const user = { role: 'user', permissions: { workorders: ['view'] } }
    expect(canAccess(user, 'machines')).toBe(false)
  })

  it('returns false when permissions object is missing', () => {
    const user = { role: 'user' }
    expect(canAccess(user, 'machines')).toBe(false)
  })
})

// ─── hasPerm ─────────────────────────────────────────────────
describe('hasPerm', () => {
  it('returns false for null user', () => {
    expect(hasPerm(null, 'machines', 'view')).toBe(false)
  })

  it('returns true for admin on any action', () => {
    const admin = { role: 'admin', permissions: {} }
    expect(hasPerm(admin, 'machines', 'view')).toBe(true)
    expect(hasPerm(admin, 'machines', 'delete')).toBe(true)
  })

  it('returns true when user has the specific action', () => {
    const user = { role: 'user', permissions: { machines: ['view', 'edit'] } }
    expect(hasPerm(user, 'machines', 'view')).toBe(true)
    expect(hasPerm(user, 'machines', 'edit')).toBe(true)
  })

  it('returns false when user lacks the specific action', () => {
    const user = { role: 'user', permissions: { machines: ['view'] } }
    expect(hasPerm(user, 'machines', 'delete')).toBe(false)
    expect(hasPerm(user, 'machines', 'add')).toBe(false)
  })

  it('defaults action to "view" when omitted', () => {
    const user = { role: 'user', permissions: { machines: ['view'] } }
    expect(hasPerm(user, 'machines')).toBe(true)
  })

  it('returns false when permissions is not an array', () => {
    const user = { role: 'user', permissions: { machines: 'view' } }
    expect(hasPerm(user, 'machines', 'view')).toBe(false)
  })

  it('returns false when menu not in permissions', () => {
    const user = { role: 'user', permissions: {} }
    expect(hasPerm(user, 'machines', 'view')).toBe(false)
  })
})

// ─── hashPassword ────────────────────────────────────────────
describe('hashPassword', () => {
  it('returns a 64-char hex string (SHA-256)', async () => {
    const hash = await hashPassword('password123')
    expect(typeof hash).toBe('string')
    expect(hash).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
  })

  it('same input always produces same hash (deterministic)', async () => {
    const h1 = await hashPassword('myPassword')
    const h2 = await hashPassword('myPassword')
    expect(h1).toBe(h2)
  })

  it('different inputs produce different hashes', async () => {
    const h1 = await hashPassword('password1')
    const h2 = await hashPassword('password2')
    expect(h1).not.toBe(h2)
  })

  it('empty string produces a valid hash', async () => {
    const hash = await hashPassword('')
    expect(hash).toHaveLength(64)
  })

  it('produces exactly 64 hex characters for any input', async () => {
    for (const input of ['abc', 'hello world', '12345', 'ภาษาไทย']) {
      const hash = await hashPassword(input)
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true)
    }
  })
})

// ─── normalizeUser & LINE Support ────────────────────────────
describe('normalizeUser with LINE attributes', () => {
  it('returns null/undefined if passed null/undefined', () => {
    expect(normalizeUser(null)).toBeNull()
    expect(normalizeUser(undefined)).toBeUndefined()
  })

  it('preserves line_user_id, line_display_name, line_picture_url', () => {
    const raw = {
      id: 'usr_123',
      username: 'line_kitsa',
      full_name: 'กฤษดา',
      role: 'user',
      line_user_id: 'U66f2b207af94e739c10a3cf937af2965',
      line_display_name: 'Kitsada LINE',
      line_picture_url: 'https://profile.line-scdn.net/123',
      permissions: '{"machines":["view","edit"]}',
    }
    const user = normalizeUser(raw)
    expect(user.line_user_id).toBe('U66f2b207af94e739c10a3cf937af2965')
    expect(user.line_display_name).toBe('Kitsada LINE')
    expect(user.line_picture_url).toBe('https://profile.line-scdn.net/123')
    expect(user.permissions).toEqual({ machines: ['view', 'edit'] })
    expect(canAccess(user, 'machines')).toBe(true)
    expect(hasPerm(user, 'machines', 'edit')).toBe(true)
    expect(hasPerm(user, 'machines', 'delete')).toBe(false)
  })

  it('handles parsePermissions for invalid JSON or null safely', () => {
    expect(parsePermissions(null)).toEqual({})
    expect(parsePermissions('invalid-json')).toEqual({})
    expect(parsePermissions({ test: ['view'] })).toEqual({ test: ['view'] })
  })
})
