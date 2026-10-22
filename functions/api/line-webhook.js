// functions/api/line-webhook.js
// Cloudflare Pages Function: LINE Webhook for Instant QR/LINE Login, Auto User Provisioning, and Contact Sync
// Storage: Cloudflare D1 (users & appconfigs tables)

import { createAuthToken } from './_auth.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-line-signature',
}

function getDb(env) {
  return env?.DB || env?.textileops_db
}

async function getConfigValue(db, key) {
  try {
    const row = await db.prepare('SELECT value FROM appconfigs WHERE key = ? LIMIT 1').bind(key).first()
    if (!row?.value) return null
    try { return JSON.parse(row.value) } catch { return row.value }
  } catch {
    return null
  }
}

async function saveConfigValue(db, key, value) {
  await db
    .prepare(
      'INSERT INTO appconfigs (id, key, value, updated_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
    .bind(`cfg_${key}`, key, JSON.stringify(value), new Date().toISOString())
    .run()
}

function generateMagicCode(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

const VIEWER_DEFAULT_PERMISSIONS = {
  dashboard: ['view'],
  machines: ['view'],
  cylinders: ['view'],
  workorders: ['view'],
  pm: ['view'],
  designbom: ['view'],
  needlestock: ['view'],
  spareparts: ['view'],
  purchasing: ['view'],
  stock: ['view'],
  reports: ['view'],
  logs: ['view'],
}

async function upsertLineUserInDb(db, lineProfile, lineSettings = {}) {
  const userId = lineProfile.userId
  const displayName = lineProfile.displayName || 'ผู้ใช้ LINE'
  const pictureUrl = lineProfile.pictureUrl || null

  const existing = await db
    .prepare(
      'SELECT id, username, full_name, role, status, permissions, line_user_id, line_display_name, line_picture_url FROM users WHERE line_user_id = ?'
    )
    .bind(userId)
    .first()

  if (existing) {
    await db
      .prepare(
        "UPDATE users SET line_display_name = ?, line_picture_url = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(
        displayName || existing.line_display_name,
        pictureUrl || existing.line_picture_url,
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

    return {
      id: existing.id,
      username: existing.username,
      full_name: existing.full_name || displayName || existing.username,
      role: existing.role || 'user',
      status: existing.status || 'active',
      permissions,
      line_user_id: userId,
      line_display_name: displayName || existing.line_display_name,
      line_picture_url: pictureUrl || existing.line_picture_url,
    }
  }

  // Check if user is a configured supervisor/admin
  const supervisors = Array.isArray(lineSettings.supervisors) ? lineSettings.supervisors : []
  const isSupervisorId =
    userId === 'U66f2b207af94e739c10a3cf937af2965' ||
    supervisors.some((s) => s.user_id === userId)

  const defaultRole = isSupervisorId ? 'admin' : lineSettings.login_default_role || 'viewer'
  const defaultPerms =
    defaultRole === 'admin'
      ? {}
      : defaultRole === 'technician'
      ? {
          machines: ['view', 'add', 'edit'],
          cylinders: ['view', 'add', 'edit'],
          workorders: ['view', 'add', 'edit'],
          pm: ['view', 'add', 'edit'],
          needlestock: ['view', 'add', 'edit'],
          spareparts: ['view', 'add', 'edit'],
          stock: ['view', 'add', 'edit'],
        }
      : defaultRole === 'supervisor'
      ? {
          dashboard: ['view', 'add', 'edit', 'delete'],
          machines: ['view', 'add', 'edit', 'delete'],
          cylinders: ['view', 'add', 'edit', 'delete'],
          workorders: ['view', 'add', 'edit', 'delete'],
          pm: ['view', 'add', 'edit', 'delete'],
          designbom: ['view', 'add', 'edit', 'delete'],
          needlestock: ['view', 'add', 'edit', 'delete'],
          spareparts: ['view', 'add', 'edit', 'delete'],
          purchasing: ['view', 'add', 'edit', 'delete'],
          stock: ['view', 'add', 'edit', 'delete'],
          reports: ['view', 'add', 'edit', 'delete'],
          logs: ['view', 'add', 'edit', 'delete'],
        }
      : VIEWER_DEFAULT_PERMISSIONS

  const newId = `usr_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 16) : Math.random().toString(36).slice(2, 18)}`
  let baseUsername = `line_${userId.slice(-6).toLowerCase()}`
  const dup = await db.prepare('SELECT id FROM users WHERE username = ?').bind(baseUsername).first()
  if (dup) {
    baseUsername = `line_${userId.slice(-10).toLowerCase()}`
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
      displayName || baseUsername,
      defaultRole,
      JSON.stringify(defaultPerms),
      userId,
      displayName,
      pictureUrl
    )
    .run()

  return {
    id: newId,
    username: baseUsername,
    full_name: displayName || baseUsername,
    role: defaultRole,
    status: 'active',
    permissions: defaultPerms,
    line_user_id: userId,
    line_display_name: displayName,
    line_picture_url: pictureUrl,
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function onRequestGet({ env }) {
  const db = getDb(env)
  if (!db) {
    return new Response(JSON.stringify({ ok: true, contacts: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const contacts = (await getConfigValue(db, 'line_contacts')) || []
    const contactMap = new Map()
    for (const c of contacts) {
      if (c && c.user_id) contactMap.set(c.user_id, c)
    }

    try {
      const { results } = await db
        .prepare(
          "SELECT id, username, full_name, line_user_id, line_display_name, line_picture_url, updated_at FROM users WHERE line_user_id IS NOT NULL AND line_user_id != ''"
        )
        .all()
      if (Array.isArray(results)) {
        for (const u of results) {
          if (!contactMap.has(u.line_user_id)) {
            contactMap.set(u.line_user_id, {
              user_id: u.line_user_id,
              name: u.line_display_name || u.full_name || u.username,
              picture_url: u.line_picture_url || '',
              type: 'user',
              last_active: u.updated_at || new Date().toISOString(),
            })
          }
        }
      }
    } catch (err) {
      console.warn('Failed to query users table for LINE contacts:', err)
    }

    const mergedContacts = Array.from(contactMap.values())
    return new Response(JSON.stringify({ ok: true, contacts: mergedContacts }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: true, contacts: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPost({ request, env }) {
  const jsonHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  const db = getDb(env)
  const urlObj = new URL(request.url)

  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: 'D1 Database binding not configured' }), {
      status: 500,
      headers: jsonHeaders,
    })
  }

  try {
    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const events = body.events || []
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No events to process' }), {
        status: 200,
        headers: jsonHeaders,
      })
    }

    const settings = (await getConfigValue(db, 'line_settings')) || {}
    let channelToken = settings.channel_access_token || env?.LINE_CHANNEL_ACCESS_TOKEN || ''

    let contacts = []
    try {
      contacts = (await getConfigValue(db, 'line_contacts')) || []
    } catch {}

    let contactsUpdated = false

    for (const event of events) {
      const source = event.source || {}
      const userId = source.userId
      const groupId = source.groupId || source.roomId
      const replyToken = event.replyToken
      const msgText = (event.message?.text || '').trim()

      if (userId) {
        let displayName = 'ผู้ใช้ LINE'
        let pictureUrl = ''

        if (channelToken) {
          try {
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
              headers: { Authorization: `Bearer ${channelToken.trim()}` },
            })
            if (profileRes.ok) {
              const p = await profileRes.json()
              if (p.displayName) displayName = p.displayName
              if (p.pictureUrl) pictureUrl = p.pictureUrl
            }
          } catch (err) {
            console.warn('Fetch LINE profile error:', err)
          }
        }

        const existingIdx = contacts.findIndex((c) => c.user_id === userId)
        const contactObj = {
          user_id: userId,
          name: displayName,
          picture_url: pictureUrl,
          type: 'user',
          last_active: new Date().toISOString(),
        }

        if (existingIdx >= 0) {
          contacts[existingIdx] = { ...contacts[existingIdx], ...contactObj }
        } else {
          contacts.push(contactObj)
        }
        contactsUpdated = true

        // Upsert user in D1 `users` table so they immediately appear in Users management page
        let appUser = null
        try {
          appUser = await upsertLineUserInDb(
            db,
            { userId, displayName, pictureUrl },
            settings
          )
        } catch (err) {
          console.error('Upsert LINE user error:', err)
        }

        if (appUser && appUser.status !== 'inactive') {
          const authToken = await createAuthToken(env, {
            uid: appUser.id,
            username: appUser.username,
            role: appUser.role,
            line_user_id: appUser.line_user_id,
          })

          // Check if message contains a specific QR session code (e.g. #A8K2M9)
          const codeMatch = msgText.match(/#([A-Z0-9]{4,8})/i)
          const matchedCode = codeMatch ? codeMatch[1].toUpperCase() : null

          if (matchedCode) {
            const existingSession = await getConfigValue(db, `line_login_session_${matchedCode}`)
            await saveConfigValue(db, `line_login_session_${matchedCode}`, {
              ...(existingSession || {}),
              code: matchedCode,
              status: 'authenticated',
              token: authToken,
              user: appUser,
              created_at: existingSession?.created_at || Date.now(),
              updated_at: Date.now(),
            })
          }

          // Also resolve the latest pending QR session if created within the last 5 minutes
          const latestPending = await getConfigValue(db, 'line_latest_pending_session')
          if (
            latestPending?.code &&
            latestPending.status === 'pending' &&
            Date.now() - (latestPending.created_at || 0) < 5 * 60 * 1000
          ) {
            await saveConfigValue(db, `line_login_session_${latestPending.code}`, {
              ...latestPending,
              status: 'authenticated',
              token: authToken,
              user: appUser,
              updated_at: Date.now(),
            })
            await saveConfigValue(db, 'line_latest_pending_session', {
              ...latestPending,
              status: 'authenticated',
            })
          }

          // Create a 1-click Magic Link token for mobile direct login
          const magicCode = generateMagicCode(10)
          await saveConfigValue(db, `line_magic_${magicCode}`, {
            token: authToken,
            user: appUser,
            returnTo: '/',
            created_at: Date.now(),
          })

          // Record login event in auditlogs
          try {
            const auditId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now())
            await db.prepare(`
              INSERT INTO auditlogs (id, Module, ActionType, RecordID, FieldName, OldValue, NewValue, User, Comment, created_at)
              VALUES (?, 'AUTH', 'LOGIN', ?, 'login_method', NULL, 'line_bot', ?, 'เข้าสู่ระบบด้วย LINE QR สำเร็จ', datetime('now'))
            `).bind(auditId, appUser.id, appUser.full_name || appUser.line_display_name || appUser.username).run()
          } catch (auditErr) {
            console.warn('Webhook login audit log failed:', auditErr?.message)
          }

          const baseOrigin = settings.app_base_url || urlObj.origin || 'https://textileops-cmms.pages.dev'
          const magicUrl = `${baseOrigin.replace(/\/$/, '')}/api/auth/line/login?magic_token=${magicCode}&openExternalBrowser=1`

          if (replyToken && channelToken && (event.type === 'follow' || event.type === 'message')) {
            const roleLabel =
              appUser.role === 'admin'
                ? 'ผู้ดูแลระบบ (Admin)'
                : appUser.role === 'supervisor'
                ? 'หัวหน้างาน (Supervisor)'
                : appUser.role === 'viewer'
                ? 'ผู้ชม (Viewer)'
                : 'ผู้ใช้งาน (User)'

            try {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${channelToken.trim()}`,
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [
                    {
                      type: 'flex',
                      altText: `ยืนยันตัวตนสำเร็จ - เข้าสู่ระบบ TextileOps (${displayName})`,
                      contents: {
                        type: 'bubble',
                        size: 'mega',
                        header: {
                          type: 'box',
                          layout: 'vertical',
                          backgroundColor: '#06C755',
                          paddingAll: '16px',
                          contents: [
                            {
                              type: 'text',
                              text: '✅ ยืนยันตัวตน LINE สำเร็จ',
                              color: '#ffffff',
                              weight: 'bold',
                              size: 'md',
                            },
                            {
                              type: 'text',
                              text: 'Gemma Knits - TextileOps CMMS',
                              color: '#e2fbe8',
                              size: 'xs',
                              margin: 'xs',
                            },
                          ],
                        },
                        body: {
                          type: 'box',
                          layout: 'vertical',
                          spacing: 'sm',
                          paddingAll: '16px',
                          contents: [
                            {
                              type: 'text',
                              text: `สวัสดีคุณ ${displayName}`,
                              weight: 'bold',
                              size: 'md',
                              color: '#0f172a',
                            },
                            {
                              type: 'text',
                              text: `สิทธิ์การใช้งาน: ${roleLabel}`,
                              size: 'xs',
                              color: '#059669',
                              weight: 'bold',
                            },
                            {
                              type: 'separator',
                              margin: 'md',
                            },
                            {
                              type: 'text',
                              text: '• หากสแกนจากคอมพิวเตอร์ หน้าจอได้เข้าสู่ระบบให้อัตโนมัติแล้ว\n• หากใช้งานบนมือถือ กดปุ่มสีเขียวด้านล่างเพื่อเข้าสู่ระบบทันที',
                              size: 'xs',
                              color: '#475569',
                              wrap: true,
                              margin: 'md',
                            },
                          ],
                        },
                        footer: {
                          type: 'box',
                          layout: 'vertical',
                          paddingAll: '12px',
                          contents: [
                            {
                              type: 'button',
                              style: 'primary',
                              color: '#06C755',
                              height: 'sm',
                              action: {
                                type: 'uri',
                                label: '🚀 เข้าสู่ระบบบนมือถือทันที',
                                uri: magicUrl,
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                }),
              })
            } catch (err) {
              console.warn('Reply flex error:', err)
            }
          }
        }
      }

      if (groupId) {
        const existingGroupIdx = contacts.findIndex((c) => c.user_id === groupId)
        const groupObj = {
          user_id: groupId,
          name: `กลุ่ม LINE (${groupId.slice(0, 8)}...)`,
          type: 'group',
          last_active: new Date().toISOString(),
        }
        if (existingGroupIdx >= 0) {
          contacts[existingGroupIdx] = { ...contacts[existingGroupIdx], ...groupObj }
        } else {
          contacts.push(groupObj)
        }
        contactsUpdated = true
      }
    }

    if (contactsUpdated) {
      await saveConfigValue(db, 'line_contacts', contacts)
    }

    return new Response(JSON.stringify({ ok: true, processed: events.length }), {
      status: 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: jsonHeaders,
    })
  }
}
