// api/line-webhook.js
// Vercel Serverless Function: LINE Webhook to automatically capture Users/Contacts and Group IDs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fyulqejkzuhwppstezko.supabase.co"
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-line-signature')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // GET: Healthcheck or fetch saved contacts
  if (req.method === 'GET') {
    try {
      const { data } = await supabase.from('appconfigs').select('value').eq('key', 'line_contacts').maybeSingle()
      const contacts = data?.value ? JSON.parse(data.value) : []
      return res.status(200).json({ ok: true, contacts })
    } catch (e) {
      return res.status(200).json({ ok: true, contacts: [] })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    let body = req.body || {}
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    const events = body.events || []
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ ok: true, message: 'No events to process' })
    }

    // Load active token from line_settings
    let channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    try {
      const { data: settingData } = await supabase.from('appconfigs').select('value').eq('key', 'line_settings').maybeSingle()
      if (settingData?.value) {
        const parsed = JSON.parse(settingData.value)
        if (parsed.channel_access_token) channelToken = parsed.channel_access_token
      }
    } catch {}

    // Load existing contacts
    let contacts = []
    try {
      const { data: contactData } = await supabase.from('appconfigs').select('value').eq('key', 'line_contacts').maybeSingle()
      if (contactData?.value) contacts = JSON.parse(contactData.value)
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

        // Fetch LINE user profile if token available
        if (channelToken) {
          try {
            const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
              headers: { 'Authorization': `Bearer ${channelToken.trim()}` }
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

        const existingIdx = contacts.findIndex(c => c.user_id === userId)
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

        // Auto reply greeting message on first contact or follow
        if (replyToken && channelToken && (event.type === 'follow' || event.type === 'message')) {
          try {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelToken.trim()}`,
              },
              body: JSON.stringify({
                replyToken,
                messages: [
                  {
                    type: 'text',
                    text: `สวัสดีครับคุณ ${displayName} 👋\nระบบ TextileOps CMMS ได้บันทึกบัญชี LINE ของท่านเข้าสู่ระบบเรียบร้อยแล้วครับ!\n\n(User ID: ${userId})`
                  }
                ]
              })
            })
          } catch {}
        }
      }

      if (groupId) {
        const existingGroupIdx = contacts.findIndex(c => c.user_id === groupId)
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
      await supabase.from('appconfigs').upsert({
        key: 'line_contacts',
        value: JSON.stringify(contacts),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
    }

    return res.status(200).json({ ok: true, processed: events.length })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}
