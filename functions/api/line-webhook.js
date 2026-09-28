// functions/api/line-webhook.js
// Cloudflare Pages Function: LINE Webhook to automatically capture Users/Contacts and Group IDs
// Storage: Cloudflare D1 (appconfigs table)

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
    return new Response(JSON.stringify({ ok: true, contacts }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: true, contacts: [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestPost({ request, env }) {
  const jsonHeaders = { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  const db = getDb(env)

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

    // Load active token from line_settings
    let channelToken = env?.LINE_CHANNEL_ACCESS_TOKEN || ''
    try {
      const settings = await getConfigValue(db, 'line_settings')
      if (settings?.channel_access_token) channelToken = settings.channel_access_token
    } catch {}

    // Load existing contacts
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

        if (replyToken && channelToken && (event.type === 'follow' || event.type === 'message')) {
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
                    type: 'text',
                    text: `สวัสดีครับคุณ ${displayName} 👋\nระบบ TextileOps CMMS ได้บันทึกบัญชี LINE ของท่านเข้าสู่ระบบเรียบร้อยแล้วครับ!\n\n(User ID: ${userId})`,
                  },
                ],
              }),
            })
          } catch {}
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
