// functions/api/line-notify.js
// Cloudflare Pages Function: LINE Notification Relay Proxy (Zero CORS, Edge Execution)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'textileops-line-notify-proxy',
      version: '1.0.0',
      platform: 'cloudflare-pages',
      status: 'active',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  )
}

export async function onRequestPost({ request, env }) {
  const jsonHeaders = {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  }

  try {
    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const {
      token,         // LINE Channel Access Token
      targetId,      // Group ID, Room ID, or User ID
      messages,      // Array of LINE Message Objects (Flex / Text)
      type = 'flex', // 'flex' | 'text' | 'notify'
      notifyToken,   // For legacy LINE Notify fallback
      textMessage,   // Text string for LINE Notify or simple message
    } = body

    const activeToken = token || env.LINE_CHANNEL_ACCESS_TOKEN

    // ── Mode 1: LINE Messaging API (Flex Message & Text to Group/User) ──
    if (type === 'flex' || type === 'messaging' || type === 'text') {
      if (!activeToken) {
        return new Response(
          JSON.stringify({ ok: false, error: 'ยังไม่ได้ระบุ LINE Channel Access Token' }),
          { status: 400, headers: jsonHeaders }
        )
      }
      if (!targetId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'ยังไม่ได้ระบุ LINE Target ID (Group ID หรือ User ID)' }),
          { status: 400, headers: jsonHeaders }
        )
      }

      let payloadMessages = []
      if (Array.isArray(messages) && messages.length > 0) {
        payloadMessages = messages
      } else if (messages && typeof messages === 'object') {
        payloadMessages = [messages]
      } else if (textMessage) {
        payloadMessages = [{ type: 'text', text: textMessage }]
      } else {
        return new Response(
          JSON.stringify({ ok: false, error: 'ไม่มีเนื้อหาข้อความสำหรับส่ง (Empty message)' }),
          { status: 400, headers: jsonHeaders }
        )
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
      try {
        lineJson = JSON.parse(responseText)
      } catch {}

      if (!lineRes.ok) {
        const errorMsg =
          lineJson.message ||
          lineJson.details?.[0]?.message ||
          responseText ||
          'LINE Push API Failed'
        return new Response(
          JSON.stringify({
            ok: false,
            error: errorMsg,
            details: lineJson,
          }),
          { status: lineRes.status, headers: jsonHeaders }
        )
      }

      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'line_messaging_api',
          sentAt: new Date().toISOString(),
          details: lineJson,
        }),
        { status: 200, headers: jsonHeaders }
      )
    }

    // ── Mode 2: LINE Notify (Fallback) ──
    if (type === 'notify') {
      const activeNotifyToken = notifyToken || env.LINE_NOTIFY_TOKEN
      if (!activeNotifyToken) {
        return new Response(
          JSON.stringify({ ok: false, error: 'ยังไม่ได้ระบุ LINE Notify Token' }),
          { status: 400, headers: jsonHeaders }
        )
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
        return new Response(
          JSON.stringify({
            ok: false,
            error: nJson.message || 'LINE Notify API Failed',
            details: nJson,
          }),
          { status: notifyRes.status, headers: jsonHeaders }
        )
      }

      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'line_notify',
          sentAt: new Date().toISOString(),
          details: nJson,
        }),
        { status: 200, headers: jsonHeaders }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'ประเภทการแจ้งเตือนไม่ถูกต้อง (Invalid notification type)' }),
      { status: 400, headers: jsonHeaders }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal Cloudflare Pages Function Error' }),
      { status: 500, headers: jsonHeaders }
    )
  }
}
