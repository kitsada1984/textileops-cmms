// functions/api/d1/query.js
// Cloudflare Pages Function: Universal Query API for D1 with Realtime Change Logging
// SECURITY: requires Bearer token (see functions/api/_auth.js), no raw SQL,
// identifier sanitization, mandatory filters for update/delete.

import { CORS_HEADERS, jsonResponse, verifyAuthToken, getBearerToken } from '../_auth.js'

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const BLOCKED_TABLES = new Set(['_d1_change_log'])

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

function assertIdent(name, label = 'identifier') {
  if (!IDENT_RE.test(String(name))) {
    throw new Error(`Invalid ${label}: ${name}`)
  }
  return String(name)
}

function quoteIdent(name, label) {
  return `"${assertIdent(name, label)}"`
}

function buildSelectColumns(select) {
  const raw = String(select || '*').trim()
  if (raw === '*') return '*'
  return raw
    .split(',')
    .map((c) => c.trim())
    .map((c) => (c === '*' ? '*' : quoteIdent(c, 'column name')))
    .join(', ')
}

function buildWhere(filters) {
  const whereClauses = []
  const whereParams = []

  if (Array.isArray(filters) && filters.length > 0) {
    for (const f of filters) {
      const col = quoteIdent(f.column, 'filter column')
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
        } else {
          // Empty IN() matches nothing (same as Supabase)
          whereClauses.push('1 = 0')
        }
      } else if (op === 'is') {
        if (val === null) {
          whereClauses.push(`${col} IS NULL`)
        } else {
          whereClauses.push(`${col} = ?`)
          whereParams.push(val)
        }
      } else {
        throw new Error(`Unsupported filter operator: ${op}`)
      }
    }
  }

  return { whereSql: whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '', whereParams }
}

export async function onRequestPost(context) {
  const { request, env } = context
  const db = env.DB || env.textileops_db

  if (!db) {
    return jsonResponse({ data: null, error: 'D1 Database binding (DB) not configured' }, 500)
  }

  // Auth: every request must carry a valid token
  const auth = await verifyAuthToken(env, getBearerToken(request))
  if (!auth) {
    return jsonResponse({ data: null, error: 'Unauthorized: missing or invalid token' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch (err) {
    return jsonResponse({ data: null, error: 'Invalid JSON body: ' + err.message }, 400)
  }

  const { table, action = 'select', select = '*', filters = [], order, limit, offset, data, onConflict } = body

  try {
    if (!table) {
      return jsonResponse({ data: null, error: 'Table name is required' }, 400)
    }
    assertIdent(table, 'table name')
    if (BLOCKED_TABLES.has(table)) {
      return jsonResponse({ data: null, error: 'Table not accessible' }, 403)
    }

    const { whereSql, whereParams } = buildWhere(filters)

    // Helper: Log mutation to _d1_change_log for Realtime SSE streaming
    async function logRealtimeEvent(act, recId, recordData) {
      try {
        const payloadStr = typeof recordData === 'object' ? JSON.stringify(recordData) : String(recordData || '')
        await db.prepare(
          'INSERT INTO _d1_change_log (table_name, action, record_id, data, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
        ).bind(table, act.toUpperCase(), String(recId || ''), payloadStr).run()

        // Probabilistic prune: keep change log at ~7 days
        if (Math.random() < 0.02) {
          await db.prepare("DELETE FROM _d1_change_log WHERE created_at < datetime('now', '-7 days')").run()
        }
      } catch (logErr) {
        console.warn('Change log write failed:', logErr.message)
      }
    }

    // A) SELECT
    if (action === 'select') {
      const cols = buildSelectColumns(select)
      let query = `SELECT ${cols} FROM "${table}"${whereSql}`
      if (order && order.column) {
        query += ` ORDER BY ${quoteIdent(order.column, 'order column')} ${order.ascending === false ? 'DESC' : 'ASC'}`
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

    // A2) COUNT (for SettingsPage record counts)
    if (action === 'count') {
      const query = `SELECT COUNT(*) AS count FROM "${table}"${whereSql}`
      const res = await db.prepare(query).bind(...whereParams).first()
      return jsonResponse({ data: null, count: res?.count ?? 0, error: null })
    }

    // Helper: value serialization (objects/arrays -> JSON string)
    const serialize = (v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v)

    // B) INSERT
    if (action === 'insert') {
      const records = Array.isArray(data) ? data : [data]
      const inserted = []

      // D1 Batch optimization: execute all statements atomically in a single round-trip
      if (records.length > 1 && typeof db.batch === 'function') {
        const insertStmts = []
        const preparedRecords = []

        for (const source of records) {
          if (!source || typeof source !== 'object') {
            return jsonResponse({ data: null, error: 'Insert requires a record object' }, 400)
          }
          const rec = { ...source }
          const sourceKeys = Object.keys(rec).filter((k) => k !== '_id' && k !== 'id')
          if (sourceKeys.length === 0) {
            return jsonResponse({ data: null, error: 'Insert requires at least one column value' }, 400)
          }
          if (!rec.id) rec.id = crypto.randomUUID()
          const keys = Object.keys(rec).filter((k) => k !== '_id')
          keys.forEach((k) => assertIdent(k, 'column name'))
          const cols = keys.map((k) => `"${k}"`).join(', ')
          const placeholders = keys.map(() => '?').join(', ')
          const values = keys.map((k) => serialize(rec[k]))

          const insertSql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`
          insertStmts.push(db.prepare(insertSql).bind(...values))
          preparedRecords.push(rec)
        }

        const batchResults = await db.batch(insertStmts)
        for (let i = 0; i < batchResults.length; i++) {
          const resRow = batchResults[i]?.results?.[0] || preparedRecords[i]
          inserted.push(resRow)
          const recId = resRow.id || resRow.Technician_ID || resRow.WO_ID || ''
          await logRealtimeEvent('INSERT', recId, resRow)
        }

        return jsonResponse({ data: inserted, error: null })
      }

      for (const source of records) {
        if (!source || typeof source !== 'object') {
          return jsonResponse({ data: null, error: 'Insert requires a record object' }, 400)
        }
        const rec = { ...source }
        // A record with no real columns would silently insert an all-NULL row
        // (the id below is generated, so it must not count as a column value).
        const sourceKeys = Object.keys(rec).filter((k) => k !== '_id' && k !== 'id')
        if (sourceKeys.length === 0) {
          return jsonResponse({ data: null, error: 'Insert requires at least one column value' }, 400)
        }
        // TEXT PRIMARY KEY accepts NULL in SQLite — always provide an id so
        // later update/delete by id can find the row.
        if (!rec.id) rec.id = crypto.randomUUID()
        const keys = Object.keys(rec).filter((k) => k !== '_id')
        keys.forEach((k) => assertIdent(k, 'column name'))
        const cols = keys.map((k) => `"${k}"`).join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((k) => serialize(rec[k]))

        const insertSql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`
        const res = await db.prepare(insertSql).bind(...values).first()
        const saved = res || rec
        inserted.push(saved)

        const recId = saved.id || saved.Technician_ID || saved.WO_ID || ''
        await logRealtimeEvent('INSERT', recId, saved)
      }

      return jsonResponse({ data: Array.isArray(data) ? inserted : inserted[0], error: null })
    }

    // C) UPDATE — filters are mandatory to prevent mass overwrite
    if (action === 'update') {
      if (!Array.isArray(filters) || filters.length === 0) {
        return jsonResponse({ data: null, error: 'Update requires at least one filter' }, 400)
      }
      const updateData = { ...data }
      delete updateData._id
      const keys = Object.keys(updateData)
      if (keys.length === 0) {
        return jsonResponse({ data: null, error: 'No data to update' }, 400)
      }
      keys.forEach((k) => assertIdent(k, 'column name'))

      const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
      const setValues = keys.map((k) => serialize(updateData[k]))

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

    // D) DELETE — filters are mandatory
    if (action === 'delete') {
      if (!Array.isArray(filters) || filters.length === 0) {
        return jsonResponse({ data: null, error: 'Delete requires at least one filter' }, 400)
      }

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

    // E) UPSERT — supports single record or array
    if (action === 'upsert') {
      const conflictCol = assertIdent(onConflict || 'id', 'conflict column')
      const records = Array.isArray(data) ? data : [data]
      const savedRows = []

      // D1 Batch optimization: execute all upserts atomically in a single round-trip
      if (records.length > 1 && typeof db.batch === 'function') {
        const upsertStmts = []
        const preparedRecords = []

        for (const source of records) {
          const rec = { ...source }
          delete rec._id
          const keys = Object.keys(rec)
          keys.forEach((k) => assertIdent(k, 'column name'))
          const cols = keys.map((k) => `"${k}"`).join(', ')
          const placeholders = keys.map(() => '?').join(', ')
          const updateSets = keys.filter((k) => k !== conflictCol).map((k) => `"${k}" = excluded."${k}"`).join(', ')
          const values = keys.map((k) => serialize(rec[k]))

          const upsertSql = updateSets
            ? `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSets} RETURNING *`
            : `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO NOTHING RETURNING *`
          upsertStmts.push(db.prepare(upsertSql).bind(...values))
          preparedRecords.push(rec)
        }

        const batchResults = await db.batch(upsertStmts)
        for (let i = 0; i < batchResults.length; i++) {
          const resRow = batchResults[i]?.results?.[0] || preparedRecords[i]
          savedRows.push(resRow)
          const recId = resRow.id || resRow[conflictCol] || ''
          await logRealtimeEvent('UPSERT', recId, resRow)
        }

        return jsonResponse({ data: savedRows, error: null })
      }

      for (const source of records) {
        const rec = { ...source }
        delete rec._id
        const keys = Object.keys(rec)
        keys.forEach((k) => assertIdent(k, 'column name'))
        const cols = keys.map((k) => `"${k}"`).join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const updateSets = keys.filter((k) => k !== conflictCol).map((k) => `"${k}" = excluded."${k}"`).join(', ')
        const values = keys.map((k) => serialize(rec[k]))

        const upsertSql = updateSets
          ? `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateSets} RETURNING *`
          : `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) ON CONFLICT ("${conflictCol}") DO NOTHING RETURNING *`
        const res = await db.prepare(upsertSql).bind(...values).first()
        const saved = res || rec
        savedRows.push(saved)

        const recId = saved.id || saved[conflictCol] || ''
        await logRealtimeEvent('UPSERT', recId, saved)
      }

      return jsonResponse({ data: Array.isArray(data) ? savedRows : savedRows[0], error: null })
    }

    return jsonResponse({ data: null, error: `Unsupported action: ${action}` }, 400)
  } catch (err) {
    console.error('D1 Query Error:', err)
    return jsonResponse({ data: null, error: err.message }, 500)
  }
}
