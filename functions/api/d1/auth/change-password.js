// functions/api/d1/auth/change-password.js
// Cloudflare Pages Function: change own password (requires valid Bearer token)

import { CORS_HEADERS, jsonResponse, verifyPasswordHash, hashPassword, verifyAuthToken, getBearerToken } from '../../_auth.js'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) return jsonResponse({ ok: false, error: 'D1 Database binding (DB) not configured' }, 500)

  const payload = await verifyAuthToken(env, getBearerToken(request))
  if (!payload) return jsonResponse({ ok: false, error: 'Invalid or expired token' }, 401)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')
  if (newPassword.length < 6) return jsonResponse({ ok: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, 400)

  try {
    const row = await db
      .prepare('SELECT id, password_hash, password_salt FROM users WHERE id = ?')
      .bind(payload.uid)
      .first()

    const currentValid = row && await verifyPasswordHash(currentPassword, row.password_hash, row.password_salt)
    if (!currentValid) return jsonResponse({ ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, 401)

    const upgraded = await hashPassword(newPassword)
    await db
      .prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
      .bind(upgraded.hash, upgraded.salt, new Date().toISOString(), payload.uid)
      .run()

    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500)
  }
}
