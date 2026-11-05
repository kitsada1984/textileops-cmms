import { describe, it, expect, vi } from 'vitest'
import {
  sha256Hex,
  hashPassword,
  verifyPasswordHash,
  createAuthToken,
  verifyAuthToken,
} from '../../_auth.js'
import { onRequestPost as loginPost } from './login.js'
import { onRequestPost as changePasswordPost } from './change-password.js'

// Characterization + migration tests for the auth hardening batch:
// fail-closed secret, salted hashing with legacy dual-verify + rehash.

function makeDb(row, spy = {}) {
  const first = vi.fn(() => Promise.resolve(row))
  const run = vi.fn(() => Promise.resolve((spy.ran = true, {})))
  const bound = { first, run }
  const prepare = vi.fn((sql) => ({ bind: (...args) => ((spy.binds = spy.binds || {})[sql] = args, bound) }))
  return { db: { prepare }, first, run, prepare, spy }
}

function postRequest(body, token) {
  return {
    json: () => Promise.resolve(body),
    headers: { get: (k) => (k.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null) },
    url: 'https://x.test/api',
  }
}

describe('auth secret fail-closed', () => {
  it('throws when AUTH_SECRET is missing', async () => {
    await expect(createAuthToken({}, { uid: 'u' })).rejects.toThrow('AUTH_SECRET is not configured')
  })

  it('round-trips tokens with a configured secret', async () => {
    const env = { AUTH_SECRET: 'test-secret-123' }
    const token = await createAuthToken(env, { uid: 'u1', username: 'a', role: 'admin' })
    const payload = await verifyAuthToken(env, token)
    expect(payload.uid).toBe('u1')
    expect(await verifyAuthToken({ AUTH_SECRET: 'other' }, token)).toBeNull()
  })
})

describe('salted password hashing', () => {
  it('hashes with a fresh random salt each time', async () => {
    const a = await hashPassword('secret123')
    const b = await hashPassword('secret123')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(await verifyPasswordHash('secret123', a.hash, a.salt)).toBe(true)
    expect(await verifyPasswordHash('wrong', a.hash, a.salt)).toBe(false)
  })

  it('still verifies legacy unsalted hashes', async () => {
    const legacy = await sha256Hex('secret123')
    expect(await verifyPasswordHash('secret123', legacy, null)).toBe(true)
    expect(await verifyPasswordHash('wrong', legacy, null)).toBe(false)
  })
})

describe('login dual-verify migration', () => {
  const env = { AUTH_SECRET: 'test-secret-123' }

  it('logs in with a legacy hash and rehashes to salted', async () => {
    const legacy = await sha256Hex('pw1234')
    const { db, run, spy } = makeDb({ id: 'u1', username: 'a', role: 'admin', status: 'active', permissions: '{}', password_hash: legacy, password_salt: null })
    const res = await loginPost({ request: postRequest({ username: 'a', password: 'pw1234' }), env: { ...env, DB: db } })
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(run).toHaveBeenCalled()
    const updateSql = Object.keys(spy.binds).find((s) => s.startsWith('UPDATE users'))
    const [newHash, newSalt] = spy.binds[updateSql]
    expect(newSalt).toMatch(/^[0-9a-f]{32}$/)
    expect(newHash).not.toBe(legacy)
  })

  it('logs in with a salted hash without rehashing', async () => {
    const { salt, hash } = await hashPassword('pw1234')
    const { db, run, prepare } = makeDb({ id: 'u1', username: 'a', role: 'admin', status: 'active', permissions: '{}', password_hash: hash, password_salt: salt })
    const res = await loginPost({ request: postRequest({ username: 'a', password: 'pw1234' }), env: { ...env, DB: db } })
    const body = await res.json()

    expect(body.ok).toBe(true)
    const updates = prepare.mock.calls.filter(([sql]) => sql.startsWith('UPDATE users'))
    expect(updates).toHaveLength(0)
    expect(run).toHaveBeenCalled()
  })

  it('rejects wrong passwords and unknown users with the same message', async () => {
    const legacy = await sha256Hex('pw1234')
    const { db } = makeDb({ id: 'u1', username: 'a', role: 'admin', status: 'active', permissions: '{}', password_hash: legacy, password_salt: null })
    const wrong = await (await loginPost({ request: postRequest({ username: 'a', password: 'nope' }), env: { ...env, DB: db } })).json()
    expect(wrong.ok).toBe(false)

    const { db: db2 } = makeDb(null)
    const missing = await (await loginPost({ request: postRequest({ username: 'ghost', password: 'x' }), env: { ...env, DB: db2 } })).json()
    expect(missing.ok).toBe(false)
    expect(missing.error).toBe(wrong.error)
  })
})

describe('change-password dual-verify', () => {
  const env = { AUTH_SECRET: 'test-secret-123' }

  it('rejects a wrong current password', async () => {
    const legacy = await sha256Hex('old123')
    const token = await createAuthToken(env, { uid: 'u1' })
    const { db } = makeDb({ id: 'u1', password_hash: legacy, password_salt: null })
    const res = await changePasswordPost({
      request: postRequest({ currentPassword: 'bad', newPassword: 'new123456' }, token),
      env: { ...env, DB: db },
    })
    expect((await res.json()).ok).toBe(false)
  })

  it('writes the new password salted', async () => {
    const legacy = await sha256Hex('old123')
    const token = await createAuthToken(env, { uid: 'u1' })
    const { db, spy } = makeDb({ id: 'u1', password_hash: legacy, password_salt: null })
    const res = await changePasswordPost({
      request: postRequest({ currentPassword: 'old123', newPassword: 'new123456' }, token),
      env: { ...env, DB: db },
    })
    const body = await res.json()

    expect(body.ok).toBe(true)
    const updateSql = Object.keys(spy.binds).find((s) => s.startsWith('UPDATE users'))
    const [newHash, newSalt] = spy.binds[updateSql]
    expect(newSalt).toMatch(/^[0-9a-f]{32}$/)
    expect(await verifyPasswordHash('new123456', newHash, newSalt)).toBe(true)
  })
})
