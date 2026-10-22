// functions/api/auth/line/callback.js
// Cloudflare Pages Function: LINE OAuth Callback Handler
// Exchanges code for profile, upserts user in D1, issues session token, and redirects back

import { CORS_HEADERS, createAuthToken, verifyAuthToken } from '../../_auth.js'

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

  const error = urlObj.searchParams.get('error')
  const errorDescription = urlObj.searchParams.get('error_description')
  const code = urlObj.searchParams.get('code')
  const state = urlObj.searchParams.get('state')

  // Handle LINE user cancellation or authorization errors
  if (error) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', errorDescription || error || 'การยืนยันตัวตนผ่าน LINE ถูกยกเลิก')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  if (!code || !state) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', 'ไม่พบข้อมูลยืนยันตัวตน (Authorization Code หรือ State) จาก LINE')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Verify HMAC-signed CSRF state
  const stateData = await verifyAuthToken(env, state)
  if (!stateData || stateData.purpose !== 'line_login_state') {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', 'เซสชันการยืนยันตัวตนหมดอายุหรือไม่ถูกต้อง (CSRF Failed) กรุณาลองใหม่อีกครั้ง')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Load LINE configuration
  const lineSettings = (await getConfigValue(db, 'line_settings')) || {}
  const channelId =
    lineSettings.login_channel_id ||
    lineSettings.channel_id ||
    env?.LINE_LOGIN_CHANNEL_ID ||
    env?.LINE_CHANNEL_ID ||
    ''
  const channelSecret =
    lineSettings.login_channel_secret ||
    lineSettings.channel_secret ||
    env?.LINE_LOGIN_CHANNEL_SECRET ||
    env?.LINE_CHANNEL_SECRET ||
    ''
  const configuredCallback = lineSettings.login_callback_url?.trim()
  const redirectUri = configuredCallback || `${urlObj.origin}/api/auth/line/callback`

  if (!channelId || !channelSecret) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', 'ระบบยังไม่ได้ตั้งค่า LINE Login Channel ID หรือ Channel Secret')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Exchange authorization code for access token
  const tokenParams = new URLSearchParams()
  tokenParams.set('grant_type', 'authorization_code')
  tokenParams.set('code', code)
  tokenParams.set('redirect_uri', redirectUri)
  tokenParams.set('client_id', channelId)
  tokenParams.set('client_secret', channelSecret)

  let accessToken = ''
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json().catch(() => ({}))
    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'แลกเปลี่ยน Token กับ LINE ไม่สำเร็จ'
      const redirectUrl = new URL('/', urlObj.origin)
      redirectUrl.searchParams.set('line_error', `LINE Login ล้มเหลว: ${errMsg}`)
      return Response.redirect(redirectUrl.toString(), 302)
    }
    accessToken = tokenData.access_token
  } catch (err) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', `เชื่อมต่อกับ LINE Server ไม่สำเร็จ: ${err.message}`)
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Fetch LINE user profile
  let lineProfile = null
  try {
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!profileRes.ok) {
      const redirectUrl = new URL('/', urlObj.origin)
      redirectUrl.searchParams.set('line_error', 'ไม่สามารถอ่านโปรไฟล์ผู้ใช้จาก LINE ได้')
      return Response.redirect(redirectUrl.toString(), 302)
    }
    lineProfile = await profileRes.json()
  } catch (err) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', `เกิดข้อผิดพลาดในการดึงโปรไฟล์ LINE: ${err.message}`)
    return Response.redirect(redirectUrl.toString(), 302)
  }

  if (!lineProfile?.userId) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', 'ไม่พบ LINE User ID ในโปรไฟล์')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  if (!db) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', 'ไม่พบการเชื่อมต่อฐานข้อมูล D1')
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Database operations: find or create user
  let appUser = null
  try {
    // 1. Look up user by line_user_id
    const existing = await db
      .prepare(
        'SELECT id, username, full_name, role, status, permissions, line_user_id, line_display_name, line_picture_url FROM users WHERE line_user_id = ?'
      )
      .bind(lineProfile.userId)
      .first()

    if (existing) {
      if (existing.status === 'inactive') {
        const redirectUrl = new URL('/', urlObj.origin)
        redirectUrl.searchParams.set('line_error', 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
        return Response.redirect(redirectUrl.toString(), 302)
      }

      // Update latest LINE display name and avatar
      await db
        .prepare(
          'UPDATE users SET line_display_name = ?, line_picture_url = ?, updated_at = datetime(\'now\') WHERE id = ?'
        )
        .bind(
          lineProfile.displayName || existing.line_display_name,
          lineProfile.pictureUrl || existing.line_picture_url,
          existing.id
        )
        .run()

      let permissions = {}
      try {
        permissions =
          typeof existing.permissions === 'string'
            ? JSON.parse(existing.permissions)
            : existing.permissions || {}
      } catch {}

      appUser = {
        id: existing.id,
        username: existing.username,
        full_name: existing.full_name || lineProfile.displayName || existing.username,
        role: existing.role || 'user',
        status: existing.status || 'active',
        permissions,
        line_user_id: lineProfile.userId,
        line_display_name: lineProfile.displayName || existing.line_display_name,
        line_picture_url: lineProfile.pictureUrl || existing.line_picture_url,
      }
    } else {
      // 2. New LINE User - Auto-provision account
      const defaultRole = lineSettings.login_default_role || 'user'
      const defaultPerms =
        defaultRole === 'admin'
          ? {}
          : {
              dashboard: ['view'],
              machines: ['view'],
              cylinders: ['view'],
              workorders: ['view'],
              pm: ['view'],
            }

      const newId = `usr_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18)}`
      let baseUsername = `line_${lineProfile.userId.slice(-6).toLowerCase()}`

      // Ensure unique username
      const dup = await db.prepare('SELECT id FROM users WHERE username = ?').bind(baseUsername).first()
      if (dup) {
        baseUsername = `line_${lineProfile.userId.slice(-10).toLowerCase()}`
      }

      await db
        .prepare(
          `INSERT INTO users (
            id, username, full_name, role, status, permissions,
            line_user_id, line_display_name, line_picture_url,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(
          newId,
          baseUsername,
          lineProfile.displayName || baseUsername,
          defaultRole,
          JSON.stringify(defaultPerms),
          lineProfile.userId,
          lineProfile.displayName || null,
          lineProfile.pictureUrl || null
        )
        .run()

      appUser = {
        id: newId,
        username: baseUsername,
        full_name: lineProfile.displayName || baseUsername,
        role: defaultRole,
        status: 'active',
        permissions: defaultPerms,
        line_user_id: lineProfile.userId,
        line_display_name: lineProfile.displayName || null,
        line_picture_url: lineProfile.pictureUrl || null,
      }
    }
  } catch (err) {
    const redirectUrl = new URL('/', urlObj.origin)
    redirectUrl.searchParams.set('line_error', `บันทึกข้อมูลผู้ใช้งานไม่สำเร็จ: ${err.message}`)
    return Response.redirect(redirectUrl.toString(), 302)
  }

  // Issue session token
  const token = await createAuthToken(env, {
    uid: appUser.id,
    username: appUser.username,
    role: appUser.role,
    line_user_id: appUser.line_user_id,
  })

  // Record login event in auditlogs
  try {
    const auditId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now())
    await db.prepare(`
      INSERT INTO auditlogs (id, Module, ActionType, RecordID, FieldName, OldValue, NewValue, User, Comment, created_at)
      VALUES (?, 'AUTH', 'LOGIN', ?, 'login_method', NULL, 'line_oauth', ?, 'เข้าสู่ระบบด้วย LINE OAuth สำเร็จ', datetime('now'))
    `).bind(auditId, appUser.id, appUser.full_name || appUser.line_display_name || appUser.username).run()
  } catch (auditErr) {
    console.warn('OAuth login audit log failed:', auditErr?.message)
  }

  // Redirect back to frontend
  const returnTo = stateData.returnTo || '/'
  const targetUrl = new URL(returnTo, urlObj.origin)
  targetUrl.searchParams.set('line_auth', 'success')
  targetUrl.searchParams.set('line_token', token)
  targetUrl.searchParams.set('line_user', JSON.stringify(appUser))

  return Response.redirect(targetUrl.toString(), 302)
}
