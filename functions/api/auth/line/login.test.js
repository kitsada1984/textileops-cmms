import { describe, it, expect, vi } from 'vitest'
import { onRequestGet } from './login.js'

// Locks the bot-QR login URL shape: short ASCII-only prefilled message so
// the QR stays sparse and scannable (Thai text percent-encodes ~9x and
// pushed the URL past 200 chars). The #CODE must survive for webhook match.
function makeDb() {
  const run = vi.fn(async () => ({}))
  const first = vi.fn(async () => null)
  const prepare = vi.fn((sql) => ({
    bind: (...args) => ({ first, run, all: async () => ({ results: [] }) }),
  }))
  return { prepare }
}

function getRequest(query = 'format=json') {
  return { url: `https://x.test/api/auth/line/login?${query}` }
}

describe('line login QR url', () => {
  it('returns a short scannable bot deep-link carrying the session code', async () => {
    const res = await onRequestGet({ request: getRequest(), env: { DB: makeDb() } })
    const data = await res.json()

    expect(data.ok).toBe(true)
    expect(data.mode).toBe('bot_qr')
    expect(data.url.length).toBeLessThan(100)
    expect(data.url).toContain(encodeURIComponent(`#${data.session_code}`))
    expect(decodeURIComponent(new URL(data.url).search.slice(1))).toBe(`TextileOps #${data.session_code}`)
  })

  it('answers pending for an unknown session instead of leaking state', async () => {
    const res = await onRequestGet({
      request: getRequest('check_session=NOPE12'),
      env: { DB: makeDb() },
    })
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.status).toBe('expired')
  })
})
