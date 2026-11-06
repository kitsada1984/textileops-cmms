import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyLineSignature } from './_auth.js'
import { onRequestPost } from './line-webhook.js'

// Security + failure-feedback tests for the LINE webhook hardening:
// signature gate (fail-closed when a secret is configured) and an explicit
// user-facing reply when account linking fails (no more silent QR spin).

const SECRET = 'chan-secret-123'

function sign(raw, secret = SECRET) {
  return createHmac('sha256', secret).update(raw).digest('base64')
}

function makeRequest(raw, signature) {
  return {
    text: () => Promise.resolve(raw),
    url: 'https://x.test/api/line-webhook',
    headers: { get: (k) => (String(k).toLowerCase() === 'x-line-signature' ? signature : null) },
  }
}

function qrEvent(text = 'เข้าสู่ระบบ TextileOps #ABC123') {
  return { type: 'message', replyToken: 'RT1', source: { userId: 'U111' }, message: { type: 'text', text } }
}

// Minimal in-memory D1 stub routing on SQL shape.
function makeDb(over = {}) {
  const calls = { saves: [], runs: [] }
  const first = vi.fn(async (ctx) => {
    const { sql, args } = ctx
    if (sql.includes('FROM appconfigs') && args[0] === 'line_settings') {
      return over.settings !== undefined ? over.settings : null
    }
    if (sql.includes('FROM appconfigs')) return null
    if (sql.includes('FROM users')) return over.userRow !== undefined ? over.userRow : null
    return null
  })
  const run = vi.fn(async (ctx) => {
    const { sql, args } = ctx
    calls.runs.push(sql.slice(0, 40))
    if (over.failUsersInsert && sql.includes('INSERT INTO users')) {
      throw new Error('db down')
    }
    if (sql.includes('INSERT INTO appconfigs') || sql.includes('ON CONFLICT')) {
      calls.saves.push(args)
    }
    return {}
  })
  const bound = (sql) => ({
    bind: (...args) => {
      const ctx = { sql, args }
      return { first: () => first(ctx), run: () => run(ctx), all: async () => ({ results: [] }) }
    },
  })
  return { db: { prepare: vi.fn((sql) => bound(sql)) }, calls, first, run }
}

function stubFetch(profile = { displayName: 'Tester' }) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    calls.push({ url, body: opts?.body ? JSON.parse(opts.body) : null })
    if (String(url).includes('/v2/bot/profile/')) {
      return { ok: true, json: async () => profile }
    }
    return { ok: true, json: async () => ({}) }
  }))
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('verifyLineSignature', () => {
  it('accepts a correct HMAC and rejects anything else', async () => {
    const raw = '{"events":[]}'

    expect(await verifyLineSignature(raw, sign(raw), SECRET)).toBe(true)
    expect(await verifyLineSignature(raw, sign(raw, 'other'), SECRET)).toBe(false)
    expect(await verifyLineSignature(raw, '', SECRET)).toBe(false)
    expect(await verifyLineSignature(raw, sign(raw), '')).toBe(false)
  })
})

describe('webhook signature gate', () => {
  it('rejects forged events with 403 before any session write', async () => {
    const { db, calls } = makeDb()
    stubFetch()
    const raw = JSON.stringify({ events: [qrEvent()] })
    const res = await onRequestPost({
      request: makeRequest(raw, 'bogus-signature'),
      env: { DB: db, AUTH_SECRET: 'test', LINE_CHANNEL_SECRET: SECRET },
    })

    expect(res.status).toBe(403)
    expect(calls.saves).toHaveLength(0)
  })

  it('falls back to the D1 channel secret when env has none', async () => {
    const { db } = makeDb({
      settings: { value: JSON.stringify({ channel_access_token: 'tok', channel_secret: SECRET }) },
    })
    stubFetch()
    const raw = JSON.stringify({ events: [qrEvent()] })
    const res = await onRequestPost({ request: makeRequest(raw, 'bogus'), env: { DB: db, AUTH_SECRET: 'test' } })

    expect(res.status).toBe(403)
  })

  it('warns and continues when no secret is configured anywhere', async () => {
    const { db } = makeDb()
    stubFetch()
    const raw = JSON.stringify({ events: [qrEvent()] })
    const res = await onRequestPost({
      request: makeRequest(raw, sign(raw)),
      env: { DB: db, AUTH_SECRET: 'test' },
    })

    expect(res.status).toBe(200)
    expect(db.prepare).toHaveBeenCalled()
  })
})

describe('webhook QR session flow', () => {
  it('marks the matched session authenticated on a valid message', async () => {
    const { db, calls } = makeDb({
      settings: { value: JSON.stringify({ channel_access_token: 'tok' }) },
    })
    const fetchCalls = stubFetch()
    const raw = JSON.stringify({ events: [qrEvent()] })
    const res = await onRequestPost({
      request: makeRequest(raw, sign(raw)),
      env: { DB: db, AUTH_SECRET: 'test', LINE_CHANNEL_SECRET: SECRET },
    })

    expect(res.status).toBe(200)
    const sessionSave = calls.saves.find((args) => args[1] === 'line_login_session_ABC123')
    expect(sessionSave).toBeTruthy()
    expect(JSON.parse(sessionSave[2]).status).toBe('authenticated')
    expect(fetchCalls.some((c) => String(c.url).includes('/message/reply'))).toBe(true)
  })

  it('replies with a clear error when account linking fails', async () => {
    const { db, calls } = makeDb({
      failUsersInsert: true,
      settings: { value: JSON.stringify({ channel_access_token: 'tok' }) },
    })
    const fetchCalls = stubFetch()
    const raw = JSON.stringify({ events: [qrEvent()] })
    const res = await onRequestPost({
      request: makeRequest(raw, sign(raw)),
      env: { DB: db, AUTH_SECRET: 'test', LINE_CHANNEL_SECRET: SECRET },
    })

    expect(res.status).toBe(200)
    const reply = fetchCalls.find((c) => String(c.url).includes('/message/reply'))
    expect(reply.body.messages[0].text).toContain('เชื่อมบัญชีไม่สำเร็จ')
    const authed = calls.saves.filter(
      (args) => String(args[1]).startsWith('line_login_session_') && JSON.parse(args[2]).status === 'authenticated'
    )
    expect(authed).toHaveLength(0)
  })
})
