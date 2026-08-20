import { supabase } from '../supabase'

const TEMPORAL_FIELD_RE = /(date|time|updated|created|completed|approved)/i
const MISSING_SCHEMA_COLUMN_RE = /Could not find the '([^']+)' column/i
const TIMESTAMP_SYNTAX_ERROR_RE = /invalid input syntax for type timestamp.*?[:"]([^"]+)["\s]?/i

function getMissingSchemaColumn(error) {
  const message = String(error?.message || '')
  return message.match(MISSING_SCHEMA_COLUMN_RE)?.[1] || null
}

function getTimestampErrorField(error, payload) {
  const msg = String(error?.message || '')
  if (!TIMESTAMP_SYNTAX_ERROR_RE.test(msg)) return null
  const match = msg.match(TIMESTAMP_SYNTAX_ERROR_RE)
  const badVal = match ? match[1].trim() : ''
  for (const [k, v] of Object.entries(payload)) {
    if (String(v).trim() === badVal || (typeof v === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim()) && badVal.includes(v.trim()))) {
      return k
    }
  }
  for (const k of ['StartTime', 'EndTime', 'time', 'start_time', 'end_time']) {
    if (Object.hasOwn(payload, k)) return k
  }
  return null
}

export function sanitizeForSupabase(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => {
      if (typeof value === 'string' && value.trim() === '' && TEMPORAL_FIELD_RE.test(key)) {
        return [key, null]
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

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await request(nextPayload)
    if (!error) return { data, error: null }

    const missingColumn = getMissingSchemaColumn(error)
    const timestampField = getTimestampErrorField(error, nextPayload)
    const badCol = missingColumn || timestampField

    if (!badCol || !Object.hasOwn(nextPayload, badCol) || omittedColumns.has(badCol)) {
      return { data, error }
    }

    omittedColumns.add(badCol)
    nextPayload = omitColumn(nextPayload, badCol)
  }

  return request(nextPayload)
}

export function createEntityClient(tableName) {
  return {
    list: async () => {
      const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data || []
    },

    get: async (id) => {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw new Error(error.message)
      return data
    },

    create: async (item) => {
      const { id, _id, ...clean } = item
      const payload = sanitizeForSupabase(clean)
      const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
        supabase.from(tableName).insert(nextPayload).select().single()
      )
      if (error) throw new Error(error.message)
      return data
    },

    update: async (id, item) => {
      const { _id, ...clean } = item
      const payload = sanitizeForSupabase({ ...clean, updated_at: new Date().toISOString() })
      const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
        supabase
          .from(tableName)
          .update(nextPayload)
          .eq('id', id)
          .select()
          .single())
      if (error) throw new Error(error.message)
      return data
    },

    delete: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },

    upsertBy: async (conflictCol, item) => {
      const { id, _id, ...clean } = item
      const payload = sanitizeForSupabase({ ...clean, updated_at: new Date().toISOString() })
      const { data, error } = await runWithMissingColumnRetry(payload, (nextPayload) =>
        supabase
          .from(tableName)
          .upsert(nextPayload, { onConflict: conflictCol })
          .select()
          .single())
      if (error) throw new Error(error.message)
      return data
    },
  }
}
