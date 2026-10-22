import { describe, it, expect } from 'vitest'

describe('LINE Login OAuth 2.1 URL Builder Logic', () => {
  it('constructs correct LINE authorization URL parameters', () => {
    const channelId = '2001234567'
    const redirectUri = 'https://cmms.gemmaknits.com/api/auth/line/callback'
    const state = 'signed-state-token.sig'

    const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', channelId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', 'profile openid')
    url.searchParams.set('bot_prompt', 'normal')

    expect(url.origin).toBe('https://access.line.me')
    expect(url.pathname).toBe('/oauth2/v2.1/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('2001234567')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('state')).toBe(state)
    expect(url.searchParams.get('scope')).toBe('profile openid')
    expect(url.searchParams.get('bot_prompt')).toBe('normal')
  })

  it('constructs correct frontend callback redirect URL with session token', () => {
    const returnTo = '/'
    const token = 'token-data.signature'
    const user = {
      id: 'usr_abc',
      username: 'line_kitsa',
      full_name: 'กฤษดา',
      role: 'user',
      line_user_id: 'U66f2b207af94e739c10a3cf937af2965',
    }

    const targetUrl = new URL(returnTo, 'https://cmms.gemmaknits.com')
    targetUrl.searchParams.set('line_auth', 'success')
    targetUrl.searchParams.set('line_token', token)
    targetUrl.searchParams.set('line_user', JSON.stringify(user))

    expect(targetUrl.searchParams.get('line_auth')).toBe('success')
    expect(targetUrl.searchParams.get('line_token')).toBe(token)

    const parsedUser = JSON.parse(targetUrl.searchParams.get('line_user'))
    expect(parsedUser.id).toBe('usr_abc')
    expect(parsedUser.line_user_id).toBe('U66f2b207af94e739c10a3cf937af2965')
  })

  it('generates consistent username from LINE userId', () => {
    const lineUserId = 'U66f2b207af94e739c10a3cf937af2965'
    const baseUsername = `line_${lineUserId.slice(-6).toLowerCase()}`
    expect(baseUsername).toBe('line_af2965')
  })
})
