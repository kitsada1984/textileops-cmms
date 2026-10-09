// src/utils/technicianSync.js
// Synchronizes notification technicians (LINE / Telegram) into the Technician Registry (TechnicianAPI)

import { TechnicianAPI } from '../api/entities'

/**
 * Normalizes text for comparison (trimmed, lowercased)
 */
function normalizeText(val) {
  return String(val || '').trim().toLowerCase()
}

/**
 * Extract next Technician_ID from a list of technicians (e.g. TECH-001, TECH-002, ...)
 */
export function getNextTechnicianId(techList = []) {
  const maxNum = (techList || []).reduce((max, t) => {
    const idStr = String(t?.Technician_ID || t?.id || '')
    const match = idStr.match(/TECH-(\d+)/i)
    return match ? Math.max(max, parseInt(match[1], 10)) : max
  }, 0)
  return `TECH-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Synchronizes technicians from notification settings into Technician Registry.
 *
 * @param {Array<{ name: string, user_id?: string, chat_id?: string }>} notificationTechs
 * @param {'LINE' | 'TELEGRAM'} channelType
 * @returns {Promise<{ updatedCount: number, createdCount: number, createdNames: string[], list: Array }>}
 */
export async function syncNotificationTechsToRegistry(notificationTechs = [], channelType = 'LINE') {
  if (!Array.isArray(notificationTechs) || notificationTechs.length === 0) {
    return { updatedCount: 0, createdCount: 0, createdNames: [], list: [] }
  }

  // 1. Fetch current technician list
  let currentList = []
  try {
    currentList = await TechnicianAPI.list()
  } catch (err) {
    console.warn('Failed to load technician registry, starting with empty list:', err)
    currentList = []
  }
  if (!Array.isArray(currentList)) currentList = []

  // Create a mutable copy of the registry
  const updatedList = [...currentList]
  let createdCount = 0
  let updatedCount = 0
  const createdNames = []

  for (const item of notificationTechs) {
    const rawName = String(item?.name || '').trim()
    const rawId = String(item?.user_id || item?.chat_id || '').trim()

    // If both name and ID are empty, skip
    if (!rawName && !rawId) continue

    const normName = normalizeText(rawName)
    const normId = normalizeText(rawId)

    // 2. Find matching technician in registry
    // Priority a: match by Channel ID (Line_ID or Telegram_ID)
    let matchIndex = -1

    if (rawId) {
      matchIndex = updatedList.findIndex((t) => {
        if (channelType === 'LINE') {
          const tLine = normalizeText(t?.Line_ID || t?.line_id)
          return tLine && tLine === normId
        } else {
          const tTg = normalizeText(t?.Telegram_ID || t?.telegram_id)
          return tTg && tTg === normId
        }
      })
    }

    // Priority b: match by Name if not matched by ID
    if (matchIndex === -1 && normName) {
      matchIndex = updatedList.findIndex((t) => {
        const tName = normalizeText(t?.Name || t?.name)
        return tName && tName === normName
      })
    }

    if (matchIndex >= 0) {
      // Existing technician found -> update channel ID and Name if needed
      const existing = updatedList[matchIndex]
      let changed = false

      if (channelType === 'LINE' && rawId) {
        if ((existing.Line_ID || existing.line_id) !== rawId) {
          existing.Line_ID = rawId
          existing.line_id = rawId
          changed = true
        }
      } else if (channelType === 'TELEGRAM' && rawId) {
        if ((existing.Telegram_ID || existing.telegram_id) !== rawId) {
          existing.Telegram_ID = rawId
          existing.telegram_id = rawId
          changed = true
        }
      }

      // If existing name is a placeholder (or empty) and we have a better name from LINE/TG, update it
      if (rawName && (!existing.Name || existing.Name === 'ช่าง' || existing.Name === 'ช่างเทคนิค')) {
        existing.Name = rawName
        changed = true
      }

      if (changed) {
        updatedList[matchIndex] = { ...existing }
        updatedCount++
      }
    } else {
      // 3. New technician -> create TECH-xxx record
      const nextId = getNextTechnicianId(updatedList)
      const displayName = rawName || (channelType === 'LINE' ? `ช่าง LINE (${rawId.slice(0, 6)})` : `ช่าง Telegram (${rawId})`)

      const newTech = {
        id: nextId,
        Technician_ID: nextId,
        Name: displayName,
        Phone: '',
        SkillLevel: 'Senior',
        Specialization: '',
        Status: 'ACTIVE',
        Line_ID: channelType === 'LINE' ? rawId : '',
        Telegram_ID: channelType === 'TELEGRAM' ? rawId : '',
      }

      updatedList.push(newTech)
      createdCount++
      createdNames.push(displayName)
    }
  }

  // 4. Save to registry if there were additions or updates
  if (createdCount > 0 || updatedCount > 0) {
    try {
      await TechnicianAPI.saveAll(updatedList)
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('txops_tbl_technicians', JSON.stringify(updatedList))
        } catch {}
      }
    } catch (saveErr) {
      console.error('Failed to save updated technician registry:', saveErr)
      throw saveErr
    }
  }

  return {
    updatedCount,
    createdCount,
    createdNames,
    list: updatedList,
  }
}
