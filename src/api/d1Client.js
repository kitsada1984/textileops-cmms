// src/api/d1Client.js
// Supabase-compatible client adapter for Cloudflare D1 + Realtime SSE

const AUTH_TOKEN_KEY = 'textileops_auth_token'

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
    else localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {}
}

function authHeaders(extra = {}) {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra }
}

class D1QueryBuilder {
  constructor(table, client) {
    this.table = table
    this.client = client
    this.action = 'select'
    this.selectColumns = '*'
    this.selectOptions = {}
    this.filters = []
    this.orderClause = null
    this.limitCount = null
    this.offsetCount = null
    this.mutationData = null
    this.onConflictCol = null
    this.isSingle = false
    this.emptyResult = false
  }

  select(columns = '*', options = {}) {
    // .select() after a mutation keeps the mutation action (server uses RETURNING *)
    if (this.action === 'select') {
      this.selectColumns = columns
      this.selectOptions = options || {}
    }
    return this
  }

  insert(data) {
    this.action = 'insert'
    this.mutationData = data
    return this
  }

  update(data) {
    this.action = 'update'
    this.mutationData = data
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  upsert(data, options = {}) {
    this.action = 'upsert'
    this.mutationData = data
    this.onConflictCol = options.onConflict || 'id'
    return this
  }

  eq(column, value) {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  neq(column, value) {
    this.filters.push({ column, op: 'neq', value })
    return this
  }

  gt(column, value) {
    this.filters.push({ column, op: 'gt', value })
    return this
  }

  gte(column, value) {
    this.filters.push({ column, op: 'gte', value })
    return this
  }

  lt(column, value) {
    this.filters.push({ column, op: 'lt', value })
    return this
  }

  lte(column, value) {
    this.filters.push({ column, op: 'lte', value })
    return this
  }

  like(column, value) {
    this.filters.push({ column, op: 'like', value })
    return this
  }

  ilike(column, value) {
    this.filters.push({ column, op: 'ilike', value })
    return this
  }

  in(column, values) {
    if (Array.isArray(values) && values.length === 0) {
      // Empty IN() matches nothing
      this.emptyResult = true
    }
    this.filters.push({ column, op: 'in', value: values })
    return this
  }

  is(column, value) {
    this.filters.push({ column, op: 'is', value })
    return this
  }

  match(obj = {}) {
    for (const [k, v] of Object.entries(obj)) {
      this.filters.push({ column: k, op: 'eq', value: v })
    }
    return this
  }

  order(column, { ascending = true } = {}) {
    this.orderClause = { column, ascending }
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  range(from, to) {
    this.offsetCount = from
    this.limitCount = to - from + 1
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isSingle = true
    return this
  }

  async execute() {
    if (this.emptyResult && this.action === 'select') {
      return { data: this.selectOptions?.count ? null : [], count: this.selectOptions?.count === 'exact' ? 0 : null, error: null }
    }

    try {
      const payload = {
        table: this.table,
        action: this.action,
        select: this.selectColumns,
        filters: this.filters,
        order: this.orderClause,
        limit: this.limitCount,
        offset: this.offsetCount,
        data: this.mutationData,
        onConflict: this.onConflictCol
      }

      // Supabase-style head count: only the number of rows is needed
      if (this.action === 'select' && this.selectOptions?.count === 'exact') {
        payload.action = 'count'
        const res = await fetch(this.client.apiUrl, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
        const result = await res.json()
        if (!res.ok || result.error) {
          return { data: null, count: null, error: { message: result.error || `${res.status} ${res.statusText}` } }
        }
        return { data: null, count: result.count ?? 0, error: null }
      }

      const res = await fetch(this.client.apiUrl, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        let errMsg = `${res.status} ${res.statusText}`
        try {
          const errJson = await res.json()
          if (errJson?.error) errMsg = errJson.error
        } catch {}
        return { data: null, error: { message: errMsg } }
      }

      const result = await res.json()
      if (result.error) {
        return { data: null, error: { message: result.error } }
      }

      let data = result.data
      if (this.isSingle) {
        if (Array.isArray(data)) {
          data = data.length > 0 ? data[0] : null
        }
        // Non-array mutation result (object) passes through unchanged
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: { message: err.message } }
    }
  }

  // Makes query builder awaitable like Supabase
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected)
  }
}

class D1RealtimeChannel {
  constructor(name, client) {
    this.name = name
    this.client = client
    this.eventSource = null
    this.listeners = []
    this.pollInterval = null
    this.lastEventId = 0
  }

  on(type, filter, callback) {
    // Mimics: .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, callback)
    const table = filter?.table || '*'
    const event = filter?.event || '*'
    this.listeners.push({ type, table, event, callback })
    return this
  }

  subscribe(statusCallback) {
    const isBrowser = typeof window !== 'undefined'
    if (!isBrowser) return this

    const token = getAuthToken()
    const streamUrl = `${this.client.realtimeUrl}?stream=true&since_id=${this.lastEventId}${token ? `&token=${encodeURIComponent(token)}` : ''}`

    if (typeof EventSource !== 'undefined') {
      try {
        this.eventSource = new EventSource(streamUrl)

        this.eventSource.addEventListener('connected', (e) => {
          // Stop any polling fallback once SSE is (re)established
          this._stopPolling()
          // Start from the server's current max_id on a fresh connection
          try {
            const info = JSON.parse(e.data)
            if (info?.max_id && this.lastEventId <= 0) {
              this.lastEventId = info.max_id
            }
          } catch {}
          if (statusCallback) statusCallback('SUBSCRIBED')
        })

        this.eventSource.addEventListener('change', (e) => {
          try {
            const payload = JSON.parse(e.data)
            this.lastEventId = Math.max(this.lastEventId, payload.id || 0)
            this._notifyListeners(payload)
          } catch (err) {
            console.error('Failed parsing realtime event:', err)
          }
        })

        this.eventSource.onerror = () => {
          // EventSource auto-reconnects; only fall back to polling when it gives up
          if (this.eventSource && this.eventSource.readyState === EventSource.CLOSED) {
            this.eventSource = null
            this._startPolling()
          }
        }
      } catch {
        this._startPolling()
      }
    } else {
      this._startPolling()
    }

    return this
  }

  _startPolling() {
    if (this.pollInterval) return
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.client.realtimeUrl}?since_id=${this.lastEventId}`, {
          headers: authHeaders()
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.events) && json.events.length > 0) {
            for (const ev of json.events) {
              this.lastEventId = Math.max(this.lastEventId, ev.id || 0)
              this._notifyListeners(ev)
            }
          }
        }
      } catch {}
    }, 2000)
  }

  _stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  _notifyListeners(payload) {
    for (const listener of this.listeners) {
      if (listener.table === '*' || listener.table === payload.table) {
        if (listener.event === '*' || listener.event.toUpperCase() === payload.eventType.toUpperCase()) {
          listener.callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old || null,
            table: payload.table
          })
        }
      }
    }
  }

  unsubscribe() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this._stopPolling()
  }
}

export class D1Client {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || '/api/d1/query'
    this.realtimeUrl = options.realtimeUrl || '/api/d1/realtime'
    this.channels = new Map()
  }

  from(table) {
    return new D1QueryBuilder(table, this)
  }

  channel(name) {
    if (!this.channels.has(name)) {
      this.channels.set(name, new D1RealtimeChannel(name, this))
    }
    return this.channels.get(name)
  }

  removeChannel(channel) {
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channel.name)
    }
  }
}

export const createD1Client = (options) => new D1Client(options)
export const d1 = new D1Client()
export default d1
