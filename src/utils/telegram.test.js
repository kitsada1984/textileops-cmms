import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchTelegramContacts,
  loadTelegramSettings,
  saveTelegramSettings,
  getAppBaseUrl,
} from './telegram'

const DEFAULTS = {
  bot_token:   '',
  supervisors: [{ name: 'กฤษดา', chat_id: '6981653027' }],
  technicians: [{ name: 'หนึ่ง',  chat_id: '8207474130' }],
  app_base_url: 'https://textileops-cmms.vercel.app',
}

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

// ─── loadTelegramSettings ─────────────────────────────────────
describe('loadTelegramSettings', () => {
  it('returns defaults when localStorage is empty', () => {
    const cfg = loadTelegramSettings()
    expect(cfg.app_base_url).toBe(DEFAULTS.app_base_url)
    expect(cfg.bot_token).toBe(DEFAULTS.bot_token)
  })

  it('returns fresh object, not same reference as DEFAULTS', () => {
    const cfg = loadTelegramSettings()
    expect(cfg).not.toBe(DEFAULTS)
  })

  it('merges saved settings on top of defaults', () => {
    localStorage.setItem('telegram_settings', JSON.stringify({ app_base_url: 'https://myapp.com' }))
    const cfg = loadTelegramSettings()
    expect(cfg.app_base_url).toBe('https://myapp.com')
    expect(cfg.bot_token).toBe(DEFAULTS.bot_token)
  })

  it('falls back to defaults on invalid JSON', () => {
    localStorage.setItem('telegram_settings', 'INVALID{{{')
    const cfg = loadTelegramSettings()
    expect(cfg.app_base_url).toBe(DEFAULTS.app_base_url)
  })

  it('falls back to defaults when stored value is null', () => {
    localStorage.setItem('telegram_settings', 'null')
    const cfg = loadTelegramSettings()
    expect(cfg.app_base_url).toBe(DEFAULTS.app_base_url)
  })

  it('supervisors array is preserved from saved settings', () => {
    const saved = { supervisors: [{ name: 'Test', chat_id: '123' }] }
    localStorage.setItem('telegram_settings', JSON.stringify(saved))
    const cfg = loadTelegramSettings()
    expect(cfg.supervisors[0].chat_id).toBe('123')
  })
})

// ─── saveTelegramSettings ─────────────────────────────────────
describe('saveTelegramSettings', () => {
  it('persists config to localStorage', () => {
    const cfg = { ...DEFAULTS, app_base_url: 'https://custom.com' }
    saveTelegramSettings(cfg)
    const raw = localStorage.getItem('telegram_settings')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw).app_base_url).toBe('https://custom.com')
  })

  it('round-trip: save then load returns same data', () => {
    const cfg = { ...DEFAULTS, bot_token: 'NEW_TOKEN' }
    saveTelegramSettings(cfg)
    const loaded = loadTelegramSettings()
    expect(loaded.bot_token).toBe('NEW_TOKEN')
  })
})

// ─── getAppBaseUrl ────────────────────────────────────────────
describe('getAppBaseUrl', () => {
  it('returns saved URL without trailing slash', () => {
    localStorage.setItem('telegram_settings', JSON.stringify({ app_base_url: 'https://example.com/' }))
    expect(getAppBaseUrl()).toBe('https://example.com')
  })

  it('returns URL as-is when no trailing slash', () => {
    localStorage.setItem('telegram_settings', JSON.stringify({ app_base_url: 'https://example.com' }))
    expect(getAppBaseUrl()).toBe('https://example.com')
  })

  it('strips multiple trailing slashes correctly (only last char)', () => {
    localStorage.setItem('telegram_settings', JSON.stringify({ app_base_url: 'https://example.com/' }))
    const url = getAppBaseUrl()
    expect(url.endsWith('/')).toBe(false)
  })

  it('uses default Vercel URL when localStorage is empty', () => {
    const url = getAppBaseUrl()
    expect(url).toBe('https://textileops-cmms.vercel.app')
  })

  it('returns window.location.origin fallback when app_base_url is empty string', () => {
    localStorage.setItem('telegram_settings', JSON.stringify({ app_base_url: '' }))
    const url = getAppBaseUrl()
    expect(typeof url).toBe('string')
    expect(url.length).toBeGreaterThan(0)
  })
})

describe('fetchTelegramContacts', () => {
  it('returns an error when token is missing', async () => {
    const result = await fetchTelegramContacts('')
    expect(result.ok).toBe(false)
  })

  it('maps Telegram updates to unique contact rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({
        ok: true,
        result: [
          {
            message: {
              from: { id: 111, first_name: 'Somchai', last_name: 'Dee', username: 'somchai' },
              chat: { id: 111, type: 'private' },
            },
          },
          {
            message: {
              from: { id: 111, first_name: 'Somchai', last_name: 'Dee', username: 'somchai' },
              chat: { id: 111, type: 'private' },
            },
          },
          {
            message: {
              from: { id: 222, first_name: 'Team' },
              chat: { id: -100222, title: 'Maintenance Team', type: 'supergroup' },
            },
          },
        ],
      }),
    })))

    const result = await fetchTelegramContacts('TOKEN')

    expect(result.ok).toBe(true)
    expect(result.contacts).toHaveLength(2)
    expect(result.contacts[0]).toEqual({
      name: 'Somchai Dee',
      chat_id: '111',
      username: 'somchai',
      type: 'private',
    })
    expect(result.contacts[1].chat_id).toBe('-100222')
  })

  it('passes Telegram API errors through', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ ok: false, description: 'Conflict: webhook is active' }),
    })))

    const result = await fetchTelegramContacts('TOKEN')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('webhook')
  })
})
