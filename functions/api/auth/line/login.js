// functions/api/auth/line/login.js
// Cloudflare Pages Function: Initiate LINE Login (OAuth 2.1)
// Generates authorization URL for either direct redirect or QR Code display

import { CORS_HEADERS, jsonResponse, createAuthToken } from '../../_auth.js'

function getDb(env) {
  return env?.DB || env?.textileops_db
}

async function getConfigValue(db, key) {
  if (!db) return null
  try {
    const row = await db.prepare('SELECT value FROM appconfigs WHERE key = ? LIMIT 1').bind(key).first()
    if (!row?.value) return null
    try { return JSON.parse(row.value) } catch { return row.value }
  } catch {
    return null
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const db = getDb(env)
  const urlObj = new URL(request.url)

  // Retrieve LINE configuration from D1 appconfigs or Cloudflare Env
  const lineSettings = (await getConfigValue(db, 'line_settings')) || {}
  const channelId =
    lineSettings.login_channel_id ||
    lineSettings.channel_id ||
    env?.LINE_LOGIN_CHANNEL_ID ||
    env?.LINE_CHANNEL_ID ||
    ''

  if (!channelId) {
    const errorMsg = 'ยังไม่ได้ตั้งค่า LINE Login Channel ID ในระบบ (กรุณาตั้งค่าที่หน้า Settings)'
    if (urlObj.searchParams.get('format') === 'json') {
      return jsonResponse({ ok: false, error: errorMsg }, 400)
    }
    return new Response(errorMsg, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS_HEADERS },
    })
  }

  // Derive callback URL
  const configuredCallback = lineSettings.login_callback_url?.trim()
  const redirectUri = configuredCallback || `${urlObj.origin}/api/auth/line/callback`

  // Return destination after login
  const returnTo = urlObj.searchParams.get('return_to') || '/'

  // Create HMAC-signed state to prevent CSRF
  const nonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const state = await createAuthToken(env, {
    purpose: 'line_login_state',
    nonce,
    returnTo,
  })

  // Build LINE OAuth 2.1 authorization URL
  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
  lineAuthUrl.searchParams.set('response_type', 'code')
  lineAuthUrl.searchParams.set('client_id', channelId)
  lineAuthUrl.searchParams.set('redirect_uri', redirectUri)
  lineAuthUrl.searchParams.set('state', state)
  lineAuthUrl.searchParams.set('scope', 'profile openid')
  lineAuthUrl.searchParams.set('bot_prompt', 'normal')

  // If caller requests JSON (e.g. for frontend to render QR code), return the URL directly
  if (urlObj.searchParams.get('format') === 'json') {
    return jsonResponse({
      ok: true,
      url: lineAuthUrl.toString(),
      state,
      redirect_uri: redirectUri,
      channel_id: channelId,
    })
  }

  // Otherwise, 302 redirect user to LINE Login
  return Response.redirect(lineAuthUrl.toString(), 302)
}
