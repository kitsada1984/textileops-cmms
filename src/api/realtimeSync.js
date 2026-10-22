// src/api/realtimeSync.js
// Global Real-Time Sync Engine for TextileOps CMMS
// Multiplexes all table subscriptions through a single DB channel with debouncing
// to ensure 100% real-time cross-device updates without multiple connections or UI flashing.

import { useEffect, useRef } from 'react'
import { db } from './dbClient'

const subscribers = new Set()
let globalChannel = null
let channelSubscribed = false

function normalizeTableList(tables) {
  if (!tables) return ['*']
  if (Array.isArray(tables)) {
    return tables.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)
  }
  return [String(tables).trim().toLowerCase()]
}

function ensureGlobalChannel() {
  if (globalChannel) return globalChannel
  if (typeof window === 'undefined' || !db || typeof db.channel !== 'function') return null

  globalChannel = db.channel('txops_global_realtime')
  globalChannel.on('postgres_changes', { event: '*', schema: 'public', table: '*' }, (payload) => {
    const rawTable = String(payload?.table || '').trim().toLowerCase()
    if (!rawTable) return

    for (const sub of subscribers) {
      if (sub.tables.has('*') || sub.tables.has(rawTable)) {
        sub.notify(payload)
      }
    }
  })

  globalChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channelSubscribed = true
    }
  })

  return globalChannel
}

/**
 * Subscribes to real-time changes on one or more database tables.
 *
 * @param {string|string[]} tables - Table name or array of table names (e.g. 'machines' or ['workorders', 'appconfigs'])
 * @param {Function} callback - Function called when an update occurs on the subscribed tables
 * @param {Object} [options]
 * @param {number} [options.debounceMs=250] - Debounce interval to coalesce rapid burst changes
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToTables(tables, callback, { debounceMs = 250 } = {}) {
  if (typeof callback !== 'function') return () => {}

  const tableList = normalizeTableList(tables)
  const tableSet = new Set(tableList)

  let timer = null
  let pendingPayloads = []

  const subscriber = {
    tables: tableSet,
    notify: (payload) => {
      pendingPayloads.push(payload)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const batch = pendingPayloads
        pendingPayloads = []
        try {
          callback(batch)
        } catch (err) {
          console.error('[realtimeSync] Callback error:', err)
        }
      }, debounceMs)
    },
    cleanup: () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      pendingPayloads = []
    },
  }

  subscribers.add(subscriber)
  ensureGlobalChannel()

  return () => {
    subscriber.cleanup()
    subscribers.delete(subscriber)
  }
}

/**
 * Manually broadcasts a table change to local listeners (useful for local optimisations)
 */
export function triggerLocalTableChange(tableName, payload = {}) {
  const rawTable = String(tableName || '').trim().toLowerCase()
  if (!rawTable) return

  const eventPayload = {
    table: rawTable,
    eventType: payload.eventType || 'UPDATE',
    new: payload.new || null,
    old: payload.old || null,
    ...payload,
  }

  for (const sub of subscribers) {
    if (sub.tables.has('*') || sub.tables.has(rawTable)) {
      sub.notify(eventPayload)
    }
  }
}

/**
 * React hook to automatically subscribe a component or page to table changes.
 *
 * @param {string|string[]} tables - Database table(s) to monitor
 * @param {Function} onSync - Callback function to reload data silently
 * @param {Object} [options]
 * @param {number} [options.debounceMs=250] - Debounce period
 * @param {boolean} [options.enabled=true] - Whether subscription is active
 * @param {boolean} [options.syncOnFocus=true] - Also sync when user focuses tab
 */
export function useRealtimeTables(
  tables,
  onSync,
  { debounceMs = 250, enabled = true, syncOnFocus = true } = {}
) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  const tablesKey = Array.isArray(tables) ? tables.join(',') : String(tables || '')

  useEffect(() => {
    if (!enabled || !tablesKey) return

    const tableList = normalizeTableList(tables)
    const unsub = subscribeToTables(
      tableList,
      () => {
        if (typeof onSyncRef.current === 'function') {
          onSyncRef.current()
        }
      },
      { debounceMs }
    )

    let lastFocusSync = Date.now()
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now - lastFocusSync < 4000) return
      lastFocusSync = now
      if (typeof onSyncRef.current === 'function') {
        onSyncRef.current()
      }
    }

    if (syncOnFocus && typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleFocusOrVisible)
      window.addEventListener('focus', handleFocusOrVisible)
    }

    return () => {
      unsub()
      if (syncOnFocus && typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleFocusOrVisible)
        window.removeEventListener('focus', handleFocusOrVisible)
      }
    }
  }, [tablesKey, enabled, debounceMs, syncOnFocus])
}
