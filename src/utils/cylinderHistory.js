/**
 * Cylinder History Domain & Parsing Utilities
 *
 * Provides pure parsing, filtering, and summarization of cylinder swap and
 * update history from audit_logs. Enables viewing how many times a machine or
 * cylinder has been replaced/swapped, what changed, and when.
 */

import { format } from 'date-fns'

/**
 * Safely parses JSON string or returns fallback.
 */
export function parseJsonSafe(val, fallback = {}) {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}

/**
 * Safely formats timestamp for history displays.
 */
export function formatHistoryDate(dateVal, fmt = 'dd/MM/yyyy HH:mm') {
  if (!dateVal) return '—'
  try {
    const d = new Date(dateVal)
    return isNaN(d.getTime()) ? '—' : format(d, fmt)
  } catch {
    return '—'
  }
}

/**
 * Parses a raw AuditLog into a structured cylinder history item.
 *
 * @param {Object} log - AuditLog row
 * @returns {Object} Structured history entry
 */
export function parseCylinderAuditLog(log = {}) {
  const action = String(log.ActionType || '').toUpperCase()
  const oldVal = parseJsonSafe(log.OldValue, {})
  const newVal = parseJsonSafe(log.NewValue, {})
  const date = log.created_at || log.created_date || null
  const user = log.User || 'ระบบ'
  const comment = log.Comment || ''

  if (action === 'SWAP') {
    const inItem = newVal.in || {}
    const outItem = newVal.out || {}
    const swapCols = Array.isArray(newVal.swapCols) ? newVal.swapCols : ['Location', 'Machine_Ref', 'Feeder']

    return {
      id: log.id || log._id || `${date}-${log.RecordID}`,
      raw: log,
      date,
      type: 'SWAP',
      title: 'สลับกระบอกเข็ม (Swap Cylinder)',
      user,
      comment,
      swapCols,
      in: {
        id: inItem.id || oldVal.in || null,
        serial: inItem.serial || '',
        mc: inItem.mc || '',
        loc: inItem.loc || '',
        standard: inItem.standard || '',
      },
      out: {
        id: outItem.id || oldVal.out || null,
        serial: outItem.serial || '',
        mc: outItem.mc || '',
        loc: outItem.loc || '',
        standard: outItem.standard || '',
      },
    }
  }

  // Action: UPDATE
  return {
    id: log.id || log._id || `${date}-${log.RecordID}`,
    raw: log,
    date,
    type: action === 'CREATE' ? 'CREATE' : 'UPDATE',
    title: action === 'CREATE' ? 'เพิ่มกระบอกใหม่ (New Cylinder)' : 'แก้ไข/ย้ายเครื่องกระบอก (Cylinder Update)',
    user,
    comment,
    oldData: oldVal,
    newData: newVal,
    mcFrom: oldVal.mc || '',
    mcTo: newVal.mc || '',
    locFrom: oldVal.loc || '',
    locTo: newVal.loc || '',
    serial: newVal.serial || oldVal.serial || log.RecordID || '',
  }
}

/**
 * Filters audit logs relevant to a given cylinder serial or machine code.
 *
 * @param {Array} logs - Raw audit logs list
 * @param {Object} criteria - { serial, mc, cylinderId }
 * @returns {Array} Parsed history entries sorted descending by date
 */
export function filterCylinderHistory(logs = [], { serial = '', mc = '', cylinderId = '' } = {}) {
  if (!Array.isArray(logs) || !logs.length) return []

  const targetSerial = String(serial || '').trim().toLowerCase()
  const targetMc = String(mc || '').trim().toLowerCase()
  const targetId = String(cylinderId || '').trim()

  const cylinderLogs = logs.filter((l) => {
    const mod = String(l?.Module || '').toUpperCase()
    return mod === 'CYLINDERS' || mod === 'CYLINDER' || mod === 'MACHINE'
  })

  const matched = []

  for (const raw of cylinderLogs) {
    const parsed = parseCylinderAuditLog(raw)
    let isMatch = false

    if (parsed.type === 'SWAP') {
      const inSerial = String(parsed.in.serial || '').toLowerCase()
      const outSerial = String(parsed.out.serial || '').toLowerCase()
      const inMc = String(parsed.in.mc || '').toLowerCase()
      const outMc = String(parsed.out.mc || '').toLowerCase()
      const inId = String(parsed.in.id || '')
      const outId = String(parsed.out.id || '')
      const commentLower = String(parsed.comment || '').toLowerCase()
      const recordIdLower = String(raw.RecordID || '').toLowerCase()

      if (targetSerial && (inSerial.includes(targetSerial) || outSerial.includes(targetSerial) || recordIdLower.includes(targetSerial) || commentLower.includes(targetSerial))) {
        isMatch = true
      }
      if (targetMc && (inMc.includes(targetMc) || outMc.includes(targetMc) || commentLower.includes(targetMc))) {
        isMatch = true
      }
      if (targetId && (inId === targetId || outId === targetId)) {
        isMatch = true
      }
    } else {
      // UPDATE or CREATE
      const entrySerial = String(parsed.serial || raw.RecordID || '').toLowerCase()
      const mcFrom = String(parsed.mcFrom || '').toLowerCase()
      const mcTo = String(parsed.mcTo || '').toLowerCase()
      const commentLower = String(parsed.comment || '').toLowerCase()

      if (targetSerial && (entrySerial.includes(targetSerial) || commentLower.includes(targetSerial))) {
        isMatch = true
      }
      if (targetMc && (mcFrom.includes(targetMc) || mcTo.includes(targetMc) || commentLower.includes(targetMc))) {
        isMatch = true
      }
      if (targetId && String(raw.RecordID || '').includes(targetId)) {
        isMatch = true
      }
    }

    if (isMatch) {
      matched.push(parsed)
    }
  }

  // Sort newest first
  return matched.sort((a, b) => {
    const tA = new Date(a.date || 0).getTime()
    const tB = new Date(b.date || 0).getTime()
    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA)
  })
}

/**
 * Summarizes history stats for a cylinder or machine.
 *
 * @param {Array} historyList - Parsed history list
 * @returns {Object} Summary stats
 */
export function summarizeCylinderHistory(historyList = []) {
  const total = historyList.length
  let swapCount = 0
  let updateCount = 0
  const machines = new Set()
  const cylinders = new Set()

  for (const item of historyList) {
    if (item.type === 'SWAP') {
      swapCount += 1
      if (item.in.mc) machines.add(item.in.mc)
      if (item.out.mc) machines.add(item.out.mc)
      if (item.in.serial) cylinders.add(item.in.serial)
      if (item.out.serial) cylinders.add(item.out.serial)
    } else {
      updateCount += 1
      if (item.mcFrom) machines.add(item.mcFrom)
      if (item.mcTo) machines.add(item.mcTo)
      if (item.serial) cylinders.add(item.serial)
    }
  }

  return {
    total,
    swapCount,
    updateCount,
    lastDate: historyList[0]?.date ? formatHistoryDate(historyList[0].date) : '—',
    machines: Array.from(machines),
    cylinders: Array.from(cylinders),
  }
}
