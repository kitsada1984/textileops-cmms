// api/line-notify.js
// Vercel Serverless Function: LINE Notification Relay Proxy (Zero CORS, Secure Server-to-Server)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'textileops-line-notify-proxy',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString()
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    let body = req.body || {}
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    const {
      token,         // LINE Channel Access Token (Long-lived)
      targetId,      // Group ID, Room ID, or User ID (e.g. Cxxxx, Uxxxx)
      messages,      // Array of LINE Message Objects (Flex / Text)
      type = 'flex', // 'flex' | 'text' | 'notify'
      notifyToken,   // For legacy LINE Notify fallback
      textMessage,   // Text string for LINE Notify or simple message
    } = body

    const activeToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN

    // ── Mode 1: LINE Messaging API (Flex Message & Text to Group/User) ──
    if (type === 'flex' || type === 'messaging' || type === 'text') {
      if (!activeToken) {
        return res.status(400).json({ ok: false, error: 'ยังไม่ได้ระบุ LINE Channel Access Token' })
      }
      if (!targetId) {
        return res.status(400).json({ ok: false, error: 'ยังไม่ได้ระบุ LINE Target ID (Group ID หรือ User ID)' })
      }

      let payloadMessages = []
      if (Array.isArray(messages) && messages.length > 0) {
        payloadMessages = messages
      } else if (messages && typeof messages === 'object') {
        payloadMessages = [messages]
      } else if (textMessage) {
        payloadMessages = [{ type: 'text', text: textMessage }]
      } else {
        return res.status(400).json({ ok: false, error: 'ไม่มีเนื้อหาข้อความสำหรับส่ง (Empty message)' })
      }

      const payload = {
        to: targetId,
        messages: payloadMessages,
      }

      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken.trim()}`,
        },
        body: JSON.stringify(payload),
      })

      const responseText = await lineRes.text()
      let lineJson = {}
      try { lineJson = JSON.parse(responseText) } catch {}

      if (!lineRes.ok) {
        const errorMsg = lineJson.message || lineJson.details?.[0]?.message || responseText || 'LINE Push API Failed'
        return res.status(lineRes.status).json({
          ok: false,
          error: errorMsg,
          details: lineJson,
        })
      }

      return res.status(200).json({
        ok: true,
        provider: 'line_messaging_api',
        sentAt: new Date().toISOString(),
        details: lineJson,
      })
    }

    // ── Mode 2: LINE Notify (Fallback) ──
    if (type === 'notify') {
      const activeNotifyToken = notifyToken || process.env.LINE_NOTIFY_TOKEN
      if (!activeNotifyToken) {
        return res.status(400).json({ ok: false, error: 'ยังไม่ได้ระบุ LINE Notify Token' })
      }

      const params = new URLSearchParams()
      params.append('message', textMessage || '🔔 แจ้งเตือนจาก TextileOps CMMS')

      const notifyRes = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${activeNotifyToken.trim()}`,
        },
        body: params.toString(),
      })

      const nJson = await notifyRes.json().catch(() => ({}))
      if (!notifyRes.ok) {
        return res.status(notifyRes.status).json({
          ok: false,
          error: nJson.message || 'LINE Notify API Failed',
          details: nJson,
        })
      }

      return res.status(200).json({
        ok: true,
        provider: 'line_notify',
        sentAt: new Date().toISOString(),
        details: nJson,
      })
    }

    return res.status(400).json({ ok: false, error: 'ประเภทการแจ้งเตือนไม่ถูกต้อง (Invalid notification type)' })

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Internal Serverless Proxy Error' })
  }
}
