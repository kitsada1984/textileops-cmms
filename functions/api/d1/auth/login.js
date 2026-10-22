// functions/api/d1/auth/login.js
// Cloudflare Pages Function: D1-native login (username + SHA-256 password hash stored in users table)

import { CORS_HEADERS, jsonResponse, sha256Hex, createAuthToken } from '../../_auth.js'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) return jsonResponse({ ok: false, error: 'D1 Database binding (DB) not configured' }, 500)

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!username || !password) {
    return jsonResponse({ ok: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, 400)
  }

  try {
    const hash = await sha256Hex(password)
    const row = await db
      .prepare('SELECT id, username, full_name, role, status, permissions, line_user_id, line_display_name, line_picture_url FROM users WHERE username = ? AND password_hash = ?')
      .bind(username, hash)
      .first()

    if (!row) return jsonResponse({ ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401)
    if (row.status === 'inactive') return jsonResponse({ ok: false, error: 'บัญชีนี้ถูกปิดใช้งาน' }, 403)

    let permissions = {}
    try { permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || {}) } catch {}

    const user = {
      id: row.id,
      username: row.username,
      full_name: row.full_name || row.line_display_name || row.username,
      role: row.role,
      permissions,
      line_user_id: row.line_user_id || null,
      line_display_name: row.line_display_name || null,
      line_picture_url: row.line_picture_url || null,
    }

    const token = await createAuthToken(env, { uid: row.id, username: row.username, role: row.role })

    // Auto-record login event in auditlogs
    try {
      const auditId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now())
      await db.prepare(`
        INSERT INTO auditlogs (id, Module, ActionType, RecordID, FieldName, OldValue, NewValue, User, Comment, created_at)
        VALUES (?, 'AUTH', 'LOGIN', ?, 'login_method', NULL, 'password', ?, 'เข้าสู่ระบบด้วยชื่อผู้ใช้/รหัสผ่าน สำเร็จ', datetime('now'))
      `).bind(auditId, row.id, row.full_name || row.line_display_name || row.username).run()
    } catch (auditErr) {
      console.warn('Login audit log failed:', auditErr?.message)
    }

    return jsonResponse({ ok: true, token, user })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500)
  }
}
