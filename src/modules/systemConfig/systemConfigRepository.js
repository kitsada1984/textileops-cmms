/**
 * System Configuration Repository & Persistence Seam
 *
 * Provides a unified, resilient storage adapter for system-level configurations and entities
 * (Technicians, Center Checks, Inspection Standards, Notification configs).
 *
 * Architectural Seam:
 * - Primary storage: Dedicated `appconfigs` table (`key`, `value`, `updated_at`)
 * - Legacy fallback & dual-write: `workorders` table (`WO_ID: SYS_*`) for 100% backward compatibility
 * - Local offline cache: `localStorage` (`localCacheKey`)
 *
 * TextileOps Architecture: Deep Module / System Configuration Seam
 */

import { supabase } from '../../supabase'

/**
 * Loads a system configuration item with automated fallbacks:
 * 1. Supabase `appconfigs` table (clean dedicated key-value store)
 * 2. Legacy `workorders` table (`WO_ID = legacyWorkOrderId`) with auto-migration forward
 * 3. Browser `localStorage` cache
 * 4. Default fallback value
 *
 * @param {string} configKey - Dedicated key in `appconfigs` (e.g. 'technicians', 'center_checks')
 * @param {Object} [options]
 * @param {string} [options.legacyWorkOrderId] - Legacy WO_ID (e.g. 'SYS_TECHNICIANS')
 * @param {string} [options.localCacheKey] - LocalStorage key (e.g. 'txops_tbl_technicians')
 * @param {*} [options.defaultValue] - Value returned if not found anywhere
 * @returns {Promise<*>}
 */
export async function getSystemConfig(configKey, options = {}) {
  const { legacyWorkOrderId, localCacheKey, defaultValue = null } = options

  // 1. Primary: Load from dedicated `appconfigs` table
  try {
    const { data, error } = await supabase
      .from('appconfigs')
      .select('value')
      .eq('key', configKey)
      .maybeSingle()

    if (!error && data?.value) {
      let parsed = data.value
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch {
          // Plain string value
        }
      }
      if (parsed !== null && parsed !== undefined) {
        if (localCacheKey && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(localCacheKey, typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
          } catch {}
        }
        return parsed
      }
    }
  } catch (err) {
    console.warn(`[SystemConfig] Failed to fetch from appconfigs (${configKey}):`, err)
  }

  // 2. Legacy Fallback: Load from `workorders.Comment` if available
  if (legacyWorkOrderId) {
    try {
      const { data, error } = await supabase
        .from('workorders')
        .select('Comment')
        .eq('WO_ID', legacyWorkOrderId)
        .maybeSingle()

      if (!error && data?.Comment) {
        let parsed = null
        try {
          parsed = JSON.parse(data.Comment)
        } catch {}

        if (parsed !== null && parsed !== undefined) {
          // Self-healing migration: copy forward to appconfigs in background
          try {
            supabase
              .from('appconfigs')
              .upsert(
                {
                  key: configKey,
                  value: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'key' }
              )
              .then(() => {})
              .catch(() => {})
          } catch {}

          if (localCacheKey && typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(localCacheKey, typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
            } catch {}
          }
          return parsed
        }
      }
    } catch (legacyErr) {
      console.warn(`[SystemConfig] Legacy workorders fallback failed for ${legacyWorkOrderId}:`, legacyErr)
    }
  }

  // 3. Local Cache Fallback
  if (localCacheKey && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(localCacheKey)
      if (raw) {
        try {
          return JSON.parse(raw)
        } catch {
          return raw
        }
      }
    } catch {}
  }

  // 4. Default Fallback
  return defaultValue
}

/**
 * Saves a system configuration item with dual-write to preserve zero regression:
 * 1. Browser `localStorage` (instant & offline)
 * 2. Dedicated `appconfigs` table
 * 3. Legacy `workorders` row (if legacyWorkOrderId provided, kept in sync for older queries)
 *
 * @param {string} configKey
 * @param {*} value
 * @param {Object} [options]
 * @param {string} [options.legacyWorkOrderId]
 * @param {string} [options.localCacheKey]
 * @returns {Promise<*>}
 */
export async function saveSystemConfig(configKey, value, options = {}) {
  const { legacyWorkOrderId, localCacheKey } = options
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)

  // 1. Local Cache Save (Immediate)
  if (localCacheKey && typeof localStorage !== 'undefined') {
    try {
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        localStorage.removeItem(localCacheKey)
      } else {
        localStorage.setItem(localCacheKey, serialized)
      }
    } catch {}
  }

  // 2. Primary Cloud Save: `appconfigs` table
  try {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      await supabase.from('appconfigs').delete().eq('key', configKey)
    } else {
      await supabase.from('appconfigs').upsert(
        {
          key: configKey,
          value: serialized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    }
  } catch (err) {
    console.warn(`[SystemConfig] Error saving to appconfigs (${configKey}):`, err)
  }

  // 3. Dual-Write to Legacy `workorders` row for zero-regression safety
  if (legacyWorkOrderId) {
    try {
      if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        await supabase.from('workorders').delete().eq('WO_ID', legacyWorkOrderId)
      } else {
        const { data: existing } = await supabase
          .from('workorders')
          .select('id')
          .eq('WO_ID', legacyWorkOrderId)
          .limit(1)

        if (existing && existing.length > 0) {
          await supabase
            .from('workorders')
            .update({
              Comment: serialized,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing[0].id)
        } else {
          await supabase.from('workorders').insert({
            MC: '__SYSTEM__',
            Problem: '__SYS_CONFIG__',
            WO_ID: legacyWorkOrderId,
            Comment: serialized,
            Status: 'COMPLETED',
          })
        }
      }
    } catch (legacyErr) {
      console.warn(`[SystemConfig] Legacy sync warning for ${legacyWorkOrderId}:`, legacyErr)
    }
  }

  return value
}

/**
 * Deletes a system configuration from appconfigs, legacy workorders, and local cache
 * @param {string} configKey
 * @param {Object} [options]
 */
export async function deleteSystemConfig(configKey, options = {}) {
  const { legacyWorkOrderId, localCacheKey } = options

  if (localCacheKey && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(localCacheKey)
    } catch {}
  }

  try {
    await supabase.from('appconfigs').delete().eq('key', configKey)
  } catch (err) {
    console.warn(`[SystemConfig] Error deleting from appconfigs (${configKey}):`, err)
  }

  if (legacyWorkOrderId) {
    try {
      await supabase.from('workorders').delete().eq('WO_ID', legacyWorkOrderId)
    } catch (legacyErr) {
      console.warn(`[SystemConfig] Error deleting legacy ${legacyWorkOrderId}:`, legacyErr)
    }
  }
}
