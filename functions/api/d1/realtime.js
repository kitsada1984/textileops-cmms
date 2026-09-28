// functions/api/d1/realtime.js
// Cloudflare Pages Function: Realtime Event Stream via Server-Sent Events (SSE) & Event Polling
// SECURITY: requires token (Bearer header or ?token= for EventSource)

import { CORS_HEADERS, verifyAuthToken, getBearerToken } from '../_auth.js'

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) {
    return new Response(JSON.stringify({ error: 'DB binding not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }

  const auth = await verifyAuthToken(env, getBearerToken(request))
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing or invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }

  const url = new URL(request.url)
  const isSSE = request.headers.get('accept')?.includes('text/event-stream') || url.searchParams.get('stream') === 'true'
  const filterTable = url.searchParams.get('table')
  const lastEventId = parseInt(request.headers.get('Last-Event-ID') || url.searchParams.get('since_id') || '0', 10)

  // Mode 1: Server-Sent Events (Streaming)
  if (isSSE) {
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    let currentSinceId = lastEventId

    // If client connects fresh (since_id=0), start from the current max id
    // so it only receives NEW events instead of replaying the whole log.
    if (currentSinceId <= 0) {
      try {
        const maxRow = await db
          .prepare(filterTable ? 'SELECT MAX(id) AS max_id FROM _d1_change_log WHERE table_name = ?' : 'SELECT MAX(id) AS max_id FROM _d1_change_log')
          .bind(...(filterTable ? [filterTable] : []))
          .first()
        currentSinceId = maxRow?.max_id || 0
      } catch {}
    }

    // Write initial connected event with current max_id
    writer.write(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', max_id: currentSinceId, time: new Date().toISOString() })}\n\n`))

    // Stream loop using setInterval
    const interval = setInterval(async () => {
      try {
        let sql = 'SELECT * FROM _d1_change_log WHERE id > ?'
        const params = [currentSinceId]

        if (filterTable) {
          sql += ' AND table_name = ?'
          params.push(filterTable)
        }
        sql += ' ORDER BY id ASC LIMIT 25'

        const res = await db.prepare(sql).bind(...params).all()
        const rows = res.results || []

        if (rows.length > 0) {
          for (const row of rows) {
            currentSinceId = Math.max(currentSinceId, row.id)
            let parsedData = null
            try {
              parsedData = row.data ? JSON.parse(row.data) : null
            } catch {
              parsedData = row.data
            }

            const payload = {
              id: row.id,
              table: row.table_name,
              eventType: row.action,
              recordId: row.record_id,
              new: parsedData,
              created_at: row.created_at
            }

            writer.write(encoder.encode(`id: ${row.id}\nevent: change\ndata: ${JSON.stringify(payload)}\n\n`))
          }
        } else {
          // Heartbeat ping every cycle
          writer.write(encoder.encode(': heartbeat\n\n'))
        }
      } catch (err) {
        console.error('SSE Stream Loop Error:', err.message)
      }
    }, 1500)

    // Handle client disconnect
    request.signal.addEventListener('abort', () => {
      clearInterval(interval)
      try { writer.close() } catch {}
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...CORS_HEADERS
      }
    })
  }

  // Mode 2: Standard JSON Poll (since_id)
  try {
    let sql = 'SELECT * FROM _d1_change_log WHERE id > ?'
    const params = [lastEventId]

    if (filterTable) {
      sql += ' AND table_name = ?'
      params.push(filterTable)
    }
    sql += ' ORDER BY id ASC LIMIT 50'

    const res = await db.prepare(sql).bind(...params).all()
    const rows = (res.results || []).map(r => {
      let parsed = null
      try { parsed = r.data ? JSON.parse(r.data) : null } catch { parsed = r.data }
      return {
        id: r.id,
        table: r.table_name,
        eventType: r.action,
        recordId: r.record_id,
        new: parsed,
        created_at: r.created_at
      }
    })

    return new Response(JSON.stringify({ events: rows, last_id: rows.length > 0 ? rows[rows.length - 1].id : lastEventId }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
}
