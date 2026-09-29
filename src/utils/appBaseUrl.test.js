import { describe, it, expect, beforeEach } from 'vitest'

// resolveAppBaseUrl must always produce the CURRENT deployment origin —
// QR codes and notification links from the old Vercel/Supabase era must
// never be used again.
import { resolveAppBaseUrl } from './telegram'

describe('resolveAppBaseUrl (QR / notification link base)', () => {
  beforeEach(() => {
    // jsdom origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://textileops-cmms.pages.dev' },
      writable: true,
    })
  })

  it('replaces the legacy vercel host with the current origin', () => {
    expect(resolveAppBaseUrl('https://textileops-cmms.vercel.app')).toBe('https://textileops-cmms.pages.dev')
  })

  it('strips trailing slashes from the legacy host too', () => {
    expect(resolveAppBaseUrl('https://textileops-cmms.vercel.app/')).toBe('https://textileops-cmms.pages.dev')
  })

  it('falls back to the current origin when empty or missing', () => {
    expect(resolveAppBaseUrl('')).toBe('https://textileops-cmms.pages.dev')
    expect(resolveAppBaseUrl(undefined)).toBe('https://textileops-cmms.pages.dev')
    expect(resolveAppBaseUrl(null)).toBe('https://textileops-cmms.pages.dev')
  })

  it('keeps a genuine custom base url unchanged', () => {
    expect(resolveAppBaseUrl('https://cmms.gemmaknits.com')).toBe('https://cmms.gemmaknits.com')
    expect(resolveAppBaseUrl('https://cmms.gemmaknits.com/')).toBe('https://cmms.gemmaknits.com')
  })

  it('produces a valid repair QR url', () => {
    const url = `${resolveAppBaseUrl('https://textileops-cmms.vercel.app')}/repair/54123`
    expect(url).toBe('https://textileops-cmms.pages.dev/repair/54123')
  })
})
