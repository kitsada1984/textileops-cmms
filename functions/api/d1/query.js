// functions/api/d1/query.js
// Cloudflare Pages Function: Universal Query API for D1 with Realtime Change Logging

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  })
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) {
    return jsonResponse({ data: null, error: 'D1 Database binding (DB) not configured' }, 500)
  }

  let body
  try {
    body = await request.json()
  } catch (err) {
    return jsonResponse({ data: null, error: 'Invalid JSON body: ' + err.message }, 400)
  }

  const { table, action = 'select', select = '*', filters = [], order, limit, offset, data, onConflict, sql, params = [] } = body

  try {
    // 1. Raw SQL execution (if specified)
    if (sql) {
      const stmt = db.prepare(sql).bind(...params)
      const res = await stmt.all()
      return jsonResponse({ data: res.results || [], error: null })
    }

    if (!table) {
      return jsonResponse({ data: null, error: 'Table name is required' }, 400)
    }

    // 2. Build WHERE clause from filters
    const whereClauses = []
    const whereParams = []

    if (Array.isArray(filters) && filters.length > 0) {
      for (const f of filters) {
        const col = `"${f.column}"`
        const op = (f.op || 'eq').toLowerCase()
        const val = f.value

        if (op === 'eq') {
          whereClauses.push(`${col} = ?`)
          whereParams.push(val)
        } else if (op === 'neq') {
          whereClauses.push(`${col} != ?`)
          whereParams.push(val)
        } else if (op === 'gt') {
          whereClauses.push(`${col} > ?`)
          whereParams.push(val)
        } else if (op === 'gte') {
          whereClauses.push(`${col} >= ?`)
          whereParams.push(val)
        } else if (op === 'lt') {
          whereClauses.push(`${col} < ?`)
          whereParams.push(val)
        } else if (op === 'lte') {
          whereClauses.push(`${col} <= ?`)
          whereParams.push(val)
        } else if (op === 'like' || op === 'ilike') {
          whereClauses.push(`${col} LIKE ?`)
          whereParams.push(val)
        } else if (op === 'in') {
          if (Array.isArray(val) && val.length > 0) {
            const placeholders = val.map(() => '?').join(', ')
            whereClauses.push(`${col} IN (${placeholders})`)
            whereParams.push(...val)
          }
        } else if (op === 'is') {
          if (val === null) {
            whereClauses.push(`${col} IS NULL`)
          } else {
            whereClauses.push(`${col} IS ?`)
            whereParams.push(val)
          }
        }
      }
    }

    const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : ''

    // 3. Handle Actions
    // A) SELECT
    if (action === 'select') {
      let query = `SELECT ${select || '*'} FROM "${table}"${whereSql}`
      if (order && order.column) {
        query += ` ORDER BY "${order.column}" ${order.ascending === false ? 'DESC' : 'ASC'}`
      }
      if (typeof limit === 'number') {
        query += ` LIMIT ${limit}`
      }
      if (typeof offset === 'number') {
        query += ` OFFSET ${offset}`
      }

      const stmt = db.prepare(query).bind(...whereParams)
      const res = await stmt.all()
      return jsonResponse({ data: res.results || [], error: null })
    }

    // Helper: Log mutation to _d1_change_log for Realtime SSE streaming
    async function logRealtimeEvent(act, recId, recordData) {
      try {
        const payloadStr = typeof recordData === 'object' ? JSON.stringify(recordData) : String(recordData || '')
        await db.prepare(
          'INSERT INTO _d1_change_log (table_name, action, record_id, data, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
        ).bind(table, act.toUpperCase(), String(recId || ''), payloadStr).run()
      } catch (logErr) {
        console.warn('Change log write failed:', logErr.message)
      }
    }

    // B) INSERT
    if (action === 'insert') {
      const records = Array.isArray(data) ? data : [data]
      const inserted = []

      for (const rec of records) {
        const keys = Object.keys(rec).filter(k => k !== '_id')
        const cols = keys.map(k => `"${k}"`).join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map(k => {
          const v = rec[k]
          return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
        })

        const insertSql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`
        const res = await db.prepare(insertSql).bind(...values).first()
        const saved = res || rec
        inserted.push(saved)

        const recId = saved.id || saved.Technician_ID || saved.WO_ID || ''
        await logRealtimeEvent('INSERT', recId, saved)
      }

      return jsonResponse({ data: Array.isArray(data) ? inserted : inserted[0], error: null })
    }

    // C) UPDATE
    if (action === 'update') {
      const updateData = { ...data }
      delete updateData._id
      const keys = Object.keys(updateData)
      if (keys.length === 0) {
        return jsonResponse({ data: null, error: 'No data to update' }, 400)
      }

      const setClauses = keys.map(k => `"${k}" = ?`).join(', ')
      const setValues = keys.map(k => {
        const v = updateData[k]
        return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
      })

      const updateSql = `UPDATE "${table}" SET ${setClauses}${whereSql} RETURNING *`
      const stmt = db.prepare(updateSql).bind(...setValues, ...whereParams)
      const res = await stmt.all()
      const updatedRows = res.results || []

      for (const row of updatedRows) {
        const recId = row.id || row.Technician_ID || row.WO_ID || ''
        await logRealtimeEvent('UPDATE', recId, row)
      }

      return jsonResponse({ data: updatedRows.length === 1 ? updatedRows[0] : updatedRows, error: null })
    }

    // D) DELETE
    if (action === 'delete') {
      // First select records to know what's deleted for event bus
      let deletedRecs = []
      try {
        const findSql = `SELECT id FROM "${table}"${whereSql}`
        const findRes = await db.prepare(findSql).bind(...whereParams).all()
        deletedRecs = findRes.results || []
      } catch {}

      const deleteSql = `DELETE FROM "${table}"${whereSql}`
      await db.prepare(deleteSql).bind(...whereParams).run()

      for (const r of deletedRecs) {
        await logRealtimeEvent('DELETE', r.id, { id: r.id })
      }

      return jsonResponse({ data: null, error: null })
    }

    // E) UPSERT
    if (action === 'upsert') {
      const conflictCol = onConflict || 'id'
      const rec = { ...data }
      delete rec._id

      const keys = Object.keys(rec)
      const cols = keys.map(k => `"${k}"`).join(', ')
      const placeholders = keys.map(() => '?').join(', ')
      const updateSets = keys.filter(k => k !== conflictCol).map(k => `"${k}" = excluded."${k}"`).join(', ')

      const values = keys.map(k => {
        const v = rec[k]
        return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v
      })

      const upsertSql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSets} RETURNING *`
      const res = await db.prepare(upsertSql).bind(...values).first()
      const saved = res || rec

      const recId = saved.id || saved[conflictCol] || ''
      await logRealtimeEvent('UPSERT', recId, saved)

      return jsonResponse({ data: saved, error: null })
    }

    return jsonResponse({ data: null, error: `Unsupported action: ${action}` }, 400)
  } catch (err) {
    console.error('D1 Query Error:', err)
    return jsonResponse({ data: null, error: err.message }, 500)
  }
}
