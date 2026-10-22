// functions/api/auth/line/login.js
// Cloudflare Pages Function: Initiate LINE Login (QR Bot Session + OAuth 2.1 + Magic Link Exchange)

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

async function saveConfigValue(db, key, value) {
  if (!db) return
  await db
    .prepare(
      'INSERT INTO appconfigs (id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
    .bind(`cfg_${key}`, key, JSON.stringify(value), new Date().toISOString())
    .run()
}

function generateShortCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const db = getDb(env)
  const urlObj = new URL(request.url)

  // 1. Poll session status for QR Code auto-login on PC / Browser
  const checkSession = urlObj.searchParams.get('check_session')?.trim()?.toUpperCase()
  if (checkSession) {
    const sessionData = await getConfigValue(db, `line_login_session_${checkSession}`)
    if (!sessionData) {
      return jsonResponse({ ok: false, status: 'expired' }, 404)
    }
    // Expire after 10 minutes
    if (Date.now() - (sessionData.created_at || 0) > 10 * 60 * 1000) {
      return jsonResponse({ ok: false, status: 'expired' }, 410)
    }
    if (sessionData.status === 'authenticated' && sessionData.token && sessionData.user) {
      return jsonResponse({
        ok: true,
        status: 'authenticated',
        token: sessionData.token,
        user: sessionData.user,
        returnTo: sessionData.returnTo || '/',
      })
    }
    return jsonResponse({ ok: true, status: 'pending' })
  }

  // 2. Magic Link exchange (when user taps "เข้าสู่ระบบทันที" button inside LINE chat on mobile)
  const magicToken = urlObj.searchParams.get('magic_token')?.trim()
  if (magicToken) {
    const magicData = await getConfigValue(db, `line_magic_${magicToken}`)
    if (!magicData || !magicData.token || !magicData.user) {
      const errUrl = new URL('/', urlObj.origin)
      errUrl.searchParams.set('line_error', 'ลิงก์เข้าสู่ระบบหมดอายุ กรุณาสแกน QR Code หรือกดเข้าสู่ระบบใหม่อีกครั้ง')
      return Response.redirect(errUrl.toString(), 302)
    }
    const targetUrl = new URL(magicData.returnTo || '/', urlObj.origin)
    targetUrl.searchParams.set('line_auth', 'success')
    targetUrl.searchParams.set('line_token', magicData.token)
    targetUrl.searchParams.set('line_user', JSON.stringify(magicData.user))
    return Response.redirect(targetUrl.toString(), 302)
  }

  // 3. Retrieve LINE configuration from D1 appconfigs or Cloudflare Env
  const lineSettings = (await getConfigValue(db, 'line_settings')) || {}
  const channelId =
    lineSettings.login_channel_id ||
    lineSettings.channel_id ||
    env?.LINE_LOGIN_CHANNEL_ID ||
    env?.LINE_CHANNEL_ID ||
    ''

  const returnTo = urlObj.searchParams.get('return_to') || '/'

  // Create a 6-digit session code for Webhook / QR Login via LINE Official Account (@418mmtcs)
  const sessionCode = generateShortCode(6)
  const sessionPayload = {
    code: sessionCode,
    status: 'pending',
    returnTo,
    created_at: Date.now(),
  }
  await saveConfigValue(db, `line_login_session_${sessionCode}`, sessionPayload)
  await saveConfigValue(db, 'line_latest_pending_session', sessionPayload)

  // Determine if we should use LINE OA Bot QR/Deep-link login (works immediately with Messaging API Channel 2010027205 / @418mmtcs)
  const botBasicId = lineSettings.bot_basic_id || '@418mmtcs'
  const useBotLogin =
    lineSettings.login_mode !== 'oauth_only' &&
    (channelId === '2010027205' || Boolean(lineSettings.channel_access_token) || !channelId)

  if (useBotLogin) {
    const loginText = `เข้าสู่ระบบ TextileOps #${sessionCode}`
    const botDeepLink = `https://line.me/R/oaMessage/${encodeURIComponent(botBasicId)}/?${encodeURIComponent(loginText)}`

    if (urlObj.searchParams.get('format') === 'json') {
      return jsonResponse({
        ok: true,
        mode: 'bot_qr',
        session_code: sessionCode,
        bot_basic_id: botBasicId,
        url: botDeepLink,
        channel_id: channelId || '2010027205',
      })
    }

    return Response.redirect(botDeepLink, 302)
  }

  // Fallback: Standard OAuth 2.1 flow if a separate OAuth-only channel is explicitly configured
  const configuredCallback = lineSettings.login_callback_url?.trim()
  const redirectUri = configuredCallback || `${urlObj.origin}/api/auth/line/callback`

  const nonce = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const state = await createAuthToken(env, {
    purpose: 'line_login_state',
    nonce,
    returnTo,
  })

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
  lineAuthUrl.searchParams.set('response_type', 'code')
  lineAuthUrl.searchParams.set('client_id', channelId)
  lineAuthUrl.searchParams.set('redirect_uri', redirectUri)
  lineAuthUrl.searchParams.set('state', state)
  lineAuthUrl.searchParams.set('scope', 'profile openid')
  lineAuthUrl.searchParams.set('bot_prompt', 'normal')

  if (urlObj.searchParams.get('format') === 'json') {
    return jsonResponse({
      ok: true,
      mode: 'oauth',
      session_code: sessionCode,
      url: lineAuthUrl.toString(),
      state,
      redirect_uri: redirectUri,
      channel_id: channelId,
    })
  }

  return Response.redirect(lineAuthUrl.toString(), 302)
}
