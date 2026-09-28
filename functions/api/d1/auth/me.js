// functions/api/d1/auth/me.js
// Cloudflare Pages Function: verify Bearer token and return current user info from D1

import { CORS_HEADERS, jsonResponse, verifyAuthToken, getBearerToken } from '../../_auth.js'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) return jsonResponse({ ok: false, error: 'D1 Database binding (DB) not configured' }, 500)

  const payload = await verifyAuthToken(env, getBearerToken(request))
  if (!payload) return jsonResponse({ ok: false, error: 'Invalid or expired token' }, 401)

  try {
    const row = await db
      .prepare('SELECT id, username, full_name, role, status, permissions FROM users WHERE id = ?')
      .bind(payload.uid)
      .first()

    if (!row || row.status === 'inactive') return jsonResponse({ ok: false, error: 'User not found or inactive' }, 401)

    let permissions = {}
    try { permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || {}) } catch {}

    return jsonResponse({
      ok: true,
      user: {
        id: row.id,
        username: row.username,
        full_name: row.full_name || row.username,
        role: row.role,
        permissions,
      },
    })
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500)
  }
}
