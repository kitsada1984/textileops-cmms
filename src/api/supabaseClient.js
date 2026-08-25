import { supabase } from '../supabase'

const TEMPORAL_FIELD_RE = /(date|time|updated|created|completed|approved)/i
const MISSING_SCHEMA_COLUMN_RE = /Could not find the '([^']+)' column/i
const TIMESTAMP_SYNTAX_ERROR_RE = /invalid input syntax for type timestamp.*?[:"]([^"]+)["\s]?/i

function getMissingSchemaColumn(error) {
  const message = String(error?.message || '')
  return message.match(MISSING_SCHEMA_COLUMN_RE)?.[1] || null
}

function getBadFieldFromError(error, payload) {
  const msg = String(error?.message || '')
  
  // Timestamp / date syntax error
  if (msg.toLowerCase().includes('invalid input syntax for type timestamp') || msg.toLowerCase().includes('invalid input syntax for type date')) {
    const quotedMatch = msg.match(/"([^"]+)"/)
    const badVal = quotedMatch ? quotedMatch[1].trim() : ''
    if (badVal) {
      for (const [k, v] of Object.entries(payload)) {
        if (String(v).trim() === badVal) return k
      }
    }
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim())) return k
    }
    for (const k of ['StartTime', 'EndTime', 'DateStart', 'DateEnd', 'time', 'start_time', 'end_time']) {
      if (Object.hasOwn(payload, k)) return k
    }
  }

  // Numeric / float / integer syntax error
  if (msg.toLowerCase().includes('invalid input syntax for type numeric') || msg.toLowerCase().includes('invalid input syntax for type double precision') || msg.toLowerCase().includes('invalid input syntax for type integer') || msg.toLowerCase().includes('invalid input syntax for type bigint')) {
    const quotedMatch = msg.match(/"([^"]+)"/)
    const badVal = quotedMatch ? quotedMatch[1].trim() : ''
    if (badVal) {
      for (const [k, v] of Object.entries(payload)) {
        if (String(v).trim() === badVal) return k
      }
    }
    for (const k of ['Duration', 'WorkingHoursDecimal']) {
      if (Object.hasOwn(payload, k)) return k
    }
  }

  return null
}

export function sanitizeForSupabase(item) {
  const today = new Date().toISOString().slice(0, 10)
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => {
      if (typeof value === 'string' && value.trim() === '' && TEMPORAL_FIELD_RE.test(key)) {
        return [key, null]
      }
      if (typeof value === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value.trim()) && TEMPORAL_FIELD_RE.test(key)) {
        const datePart = item.StartDate || item.EndDate || item.DateStart || item.DateEnd || today
        try {
          const d = new Date(`${datePart}T${value.trim()}`)
          if (!isNaN(d.getTime())) {
            return [key, d.toISOString()]
          }
        } catch {
          // ignore
        }
      }
      if (key === 'Duration' && typeof value === 'string') {
        const parsed = parseFloat(value)
        return [key, isNaN(parsed) ? 0 : parsed]
      }
      return [key, value]
    })
  )
}

function omitColumn(payload, column) {
  const next = { ...payload }
  delete next[column]
  return next
}

async function runWithMissingColumnRetry(payload, request) {
  let nextPayload = payload
  const omittedColumns = new Set()

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const { data, error } = await request(nextPayload)
    if (!error) return { data, error: null }

    const missingColumn = getMissingSchemaColumn(error)
    const badField = getBadFieldFromError(error, nextPayload)
    const badCol = missingColumn || badField

    if (!badCol || !Object.hasOwn(nextPayload, badCol) || omittedColumns.has(badCol)) {
      return { data, error }
    }

    omittedColumns.add(badCol)
    nextPayload = omitColumn(nextPayload, badCol)
  }

  return request(nextPayload)
}

const MISSING_TABLE_RE = /Could not find the table|schema cache|relation.*does not exist/i

function isMissingTableError(error) {
  const msg = String(error?.message || error || '')
  return MISSING_TABLE_RE.test(msg)
}

function getLocalTable(tableName) {
  try {
    const raw = localStorage.getItem(`textileops_tbl_${tableName}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalTable(tableName, rows) {
  try {
    localStorage.setItem(`textileops_tbl_${tableName}`, JSON.stringify(rows))
  } catch {}
}

function matchLocalRecord(r, targetId) {
  if (!r || !targetId) return false
  const tid = String(targetId).trim()
  return (
    String(r.id || '').trim() === tid ||
    String(r._id || '').trim() === tid ||
    String(r.Technician_ID || '').trim() === tid ||
    String(r.doc_no || '').trim() === tid ||
    String(r.Key || '').trim() === tid
  )
}

export function createEntityClient(tableName) {
  return {
    list: async () => {
      try {
        const { data, error } = await supabase.from(tableName).select('*')
        if (error) {
          if (isMissingTableError(error)) {
            return getLocalTable(tableName)
          }
          throw new Error(error.message)
        }
        if (Array.isArray(data) && data.length > 0) {
          setLocalTable(tableName, data)
        } else {
          const local = getLocalTable(tableName)
          if (local.length > 0) return local
        }
        return data || []
      } catch (err) {
        if (isMissingTableError(err)) {
          return getLocalTable(tableName)
        }
        throw err
      }
    },

    get: async (id) => {
      try {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
        if (error) {
          if (isMissingTableError(error)) {
            const list = getLocalTable(tableName)
            return list.find((r) => matchLocalRecord(r, id)) || null
          }
          throw new Error(error.message)
        }
        return data
      } catch (err) {
        if (isMissingTableError(err)) {
          const list = getLocalTable(tableName)
          return list.find((r) => matchLocalRecord(r, id)) || null
        }
        throw err
      }
    },

    create: async (item) => {
      const { id, _id, ...clean } = item
      const payload = sanitizeForSupabase(clean)
      try {
        const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
          supabase.from(tableName).insert(nextPayload).select().single()
        )
        if (error) {
          if (isMissingTableError(error)) {
            const newItem = {
              ...payload,
              id: id || payload.Technician_ID || `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            const list = getLocalTable(tableName)
            setLocalTable(tableName, [newItem, ...list])
            return newItem
          }
          throw new Error(error.message)
        }
        return data
      } catch (err) {
        if (isMissingTableError(err)) {
          const newItem = {
            ...payload,
            id: id || payload.Technician_ID || `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const list = getLocalTable(tableName)
          setLocalTable(tableName, [newItem, ...list])
          return newItem
        }
        throw err
      }
    },

    update: async (id, item) => {
      const { _id, ...clean } = item
      const payload = sanitizeForSupabase({ ...clean, updated_at: new Date().toISOString() })
      try {
        const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
          supabase
            .from(tableName)
            .update(nextPayload)
            .eq('id', id)
            .select()
            .single())
        if (error) {
          if (isMissingTableError(error)) {
            const list = getLocalTable(tableName)
            const exists = list.some((r) => matchLocalRecord(r, id))
            const updatedList = exists
              ? list.map((r) => (matchLocalRecord(r, id) ? { ...r, ...payload, id } : r))
              : [{ ...payload, id }, ...list]
            setLocalTable(tableName, updatedList)
            return { ...payload, id }
          }
          throw new Error(error.message)
        }
        return data
      } catch (err) {
        if (isMissingTableError(err)) {
          const list = getLocalTable(tableName)
          const exists = list.some((r) => matchLocalRecord(r, id))
          const updatedList = exists
            ? list.map((r) => (matchLocalRecord(r, id) ? { ...r, ...payload, id } : r))
            : [{ ...payload, id }, ...list]
          setLocalTable(tableName, updatedList)
          return { ...payload, id }
        }
        throw err
      }
    },

    delete: async (id) => {
      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id)
        if (error) {
          if (isMissingTableError(error)) {
            const list = getLocalTable(tableName)
            setLocalTable(tableName, list.filter((r) => !matchLocalRecord(r, id)))
            return
          }
          throw new Error(error.message)
        }
        const list = getLocalTable(tableName)
        setLocalTable(tableName, list.filter((r) => !matchLocalRecord(r, id)))
      } catch (err) {
        if (isMissingTableError(err)) {
          const list = getLocalTable(tableName)
          setLocalTable(tableName, list.filter((r) => !matchLocalRecord(r, id)))
          return
        }
        throw err
      }
    },

    upsertBy: async (conflictCol, item) => {
      const { id, _id, ...clean } = item
      const payload = sanitizeForSupabase({ ...clean, updated_at: new Date().toISOString() })
      try {
        const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
          supabase
            .from(tableName)
            .upsert(nextPayload, { onConflict: conflictCol })
            .select()
            .single())
        if (error) {
          if (isMissingTableError(error)) {
            const list = getLocalTable(tableName)
            const existingIdx = list.findIndex((r) => r[conflictCol] === payload[conflictCol])
            if (existingIdx >= 0) {
              list[existingIdx] = { ...list[existingIdx], ...payload }
            } else {
              list.unshift({ ...payload, id: id || `local_${Date.now()}` })
            }
            setLocalTable(tableName, list)
            return payload
          }
          throw new Error(error.message)
        }
        return data
      } catch (err) {
        if (isMissingTableError(err)) {
          const list = getLocalTable(tableName)
          const existingIdx = list.findIndex((r) => r[conflictCol] === payload[conflictCol])
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...payload }
          } else {
            list.unshift({ ...payload, id: id || `local_${Date.now()}` })
          }
          setLocalTable(tableName, list)
          return payload
        }
        throw err
      }
    },
  }
}
