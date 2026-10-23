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

    // Ensure index on _d1_change_log(id) exists to protect against table scans and quota drain
    try {
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_d1_change_log_id ON _d1_change_log (id)').run()
    } catch {}

    // Stream loop using adaptive backoff (2000ms active, 4000ms moderate idle, 7000ms prolonged idle)
    let idleCycles = 0
    let timer = null
    let isAborted = false

    const pollNext = async () => {
      if (isAborted) return
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
          idleCycles = 0
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
          idleCycles++
          // Heartbeat ping
          writer.write(encoder.encode(': heartbeat\n\n'))
        }
      } catch (err) {
        console.error('SSE Stream Loop Error:', err.message)
      }

      if (isAborted) return

      // Adaptive delay: 2000ms active, 4000ms moderate idle, 7000ms prolonged idle
      let delay = 2000
      if (idleCycles > 45) {
        delay = 7000
      } else if (idleCycles > 15) {
        delay = 4000
      }

      timer = setTimeout(pollNext, delay)
    }

    timer = setTimeout(pollNext, 1000)

    // Handle client disconnect
    request.signal.addEventListener('abort', () => {
      isAborted = true
      if (timer) clearTimeout(timer)
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
    // If client polls fresh without a prior lastEventId (since_id <= 0),
    // initialize to current MAX(id) so it doesn't replay the entire history log
    if (lastEventId <= 0) {
      let maxSql = 'SELECT MAX(id) AS max_id FROM _d1_change_log'
      const maxParams = []
      if (filterTable) {
        maxSql += ' WHERE table_name = ?'
        maxParams.push(filterTable)
      }
      const maxRow = await db.prepare(maxSql).bind(...maxParams).first()
      const currentMaxId = maxRow?.max_id || 0
      return new Response(JSON.stringify({ events: [], last_id: currentMaxId }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

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
