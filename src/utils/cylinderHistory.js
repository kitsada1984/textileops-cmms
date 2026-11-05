/**
 * Cylinder History Domain & Parsing Utilities
 *
 * Provides pure parsing, filtering, and summarization of cylinder swap and
 * update history from audit_logs. Enables viewing how many times a machine or
 * cylinder has been replaced/swapped, what changed, and when.
 */

import { format } from 'date-fns'
import { parseSwapLog, parseUpdateLog } from './swapAuditParse'
import {
  HISTORY_COMPARE_COLUMNS,
  extractFieldValue,
  resolveCompareSerial,
  buildCompareSide,
  buildCompareRow,
  matchSwapHistoryEntry,
  matchUpdateHistoryEntry,
} from './swapCompare'

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
 * Finds a cylinder in a list by Serial_NOW, Serial_OLD, or id/_id.
 * Case-insensitive and trimmed.
 *
 * @param {string} serial
 * @param {Array} cylinders
 * @returns {Object|null}
 */
export function findCylinderBySerial(serial, cylinders = []) {
  if (!serial || !Array.isArray(cylinders) || !cylinders.length) return null
  const s = String(serial).trim().toLowerCase()
  if (!s) return null

  // 1. Direct match on Serial_NOW
  let found = cylinders.find((c) => String(c?.Serial_NOW || '').trim().toLowerCase() === s)
  if (found) return found

  // 2. Direct match on Serial_OLD
  found = cylinders.find((c) => String(c?.Serial_OLD || '').trim().toLowerCase() === s)
  if (found) return found

  // 3. Match on id or _id
  found = cylinders.find((c) => String(c?.id || c?._id || '').trim().toLowerCase() === s)
  if (found) return found

  // 4. Match on ITEM
  found = cylinders.find((c) => String(c?.ITEM || '').trim().toLowerCase() === s)
  if (found) return found

  return null
}


/**
 * Builds detailed column comparison rows matching the swap modal (CompareTable).
 */
export function buildSwapCompareTable(item = {}, cylinders = []) {
  const isSwap = item.type === 'SWAP'
  if (!isSwap) return { rows: [], outCyl: null, inCyl: null, swapCount: 0 }

  const swapCols = Array.isArray(item.swapCols) ? item.swapCols : ['Location', 'Machine_Ref', 'Feeder']
  const outBefore = item.outBefore || {}
  const inBefore = item.inBefore || {}
  const outAfter = item.out || {}
  const inAfter = item.in || {}
  const snapOutBefore = item.snapshotOutBefore || null
  const snapInBefore = item.snapshotInBefore || null
  const snapOutAfter = item.snapshotOutAfter || null
  const snapInAfter = item.snapshotInAfter || null

  const masterOut = findCylinderBySerial(resolveCompareSerial(outAfter, snapOutAfter, outBefore, snapOutBefore), cylinders) || findCylinderBySerial(outBefore.Serial_OLD, cylinders)
  const masterIn = findCylinderBySerial(resolveCompareSerial(inAfter, snapInAfter, inBefore, snapInBefore), cylinders) || findCylinderBySerial(inBefore.Serial_OLD, cylinders)
  const outSide = buildCompareSide(outAfter, outBefore, snapOutAfter, snapOutBefore, masterOut)
  const inSide = buildCompareSide(inAfter, inBefore, snapInAfter, snapInBefore, masterIn)
  const outSerial = outSide.serial
  const inSerial = inSide.serial
  const outCyl = outSide.cyl
  const inCyl = inSide.cyl

  let swapCount = 0

  const rows = HISTORY_COMPARE_COLUMNS.map((col) => {
    const built = buildCompareRow(col, {
      swapCols, outBefore, snapOutBefore, inBefore, snapInBefore,
      outAfter, snapOutAfter, inAfter, snapInAfter, masterOut, masterIn,
    })
    if (built.isSwap) swapCount += 1
    return built.row
  }).filter(Boolean)

  return { rows, outCyl, inCyl, swapCount }
}

/**
 * Builds detailed comparison rows for UPDATE action (single cylinder change/machine update).
 */
export function buildUpdateCompareTable(item = {}, masterCyl = null) {
  const oldData = item.oldData || {}
  const newData = item.newData || {}

  const rows = HISTORY_COMPARE_COLUMNS.map((col) => {
    let oldVal = extractFieldValue(oldData, null, col.fieldAliases)
    let newVal = extractFieldValue(newData, null, col.fieldAliases)
    const masterVal = masterCyl ? extractFieldValue(masterCyl, null, col.fieldAliases) : ''

    if (!oldVal && !newVal && masterVal) {
      oldVal = masterVal
      newVal = masterVal
    } else {
      if (!oldVal && masterVal) oldVal = masterVal
      if (!newVal && masterVal) newVal = masterVal
    }

    if (!oldVal && !newVal) return null

    const changed = String(oldVal ?? '') !== String(newVal ?? '')
    return {
      key: col.key,
      label: col.label,
      oldVal: oldVal ? `${oldVal}${col.suffix || ''}` : '',
      newVal: newVal ? `${newVal}${col.suffix || ''}` : '',
      changed,
    }
  }).filter(Boolean)

  // Prioritize changed rows first
  rows.sort((a, b) => (b.changed ? 1 : 0) - (a.changed ? 1 : 0))

  return { rows }
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
    return parseSwapLog(log, date, user, comment, oldVal, newVal)
  }

  return parseUpdateLog(log, action, date, user, comment, oldVal, newVal)
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
  const targets = { targetSerial, targetMc, targetId }

  const cylinderLogs = logs.filter((l) => {
    const mod = String((l || {}).Module || '').toUpperCase()
    return mod === 'CYLINDERS' || mod === 'CYLINDER' || mod === 'MACHINE'
  })

  const matched = []

  for (const raw of cylinderLogs) {
    const parsed = parseCylinderAuditLog(raw)
    const rawRecordId = (raw || {}).RecordID || ''
    let isMatch = false

    if (parsed.type === 'SWAP') {
      isMatch = matchSwapHistoryEntry(parsed, rawRecordId, targets)
    } else {
      // UPDATE or CREATE
      isMatch = matchUpdateHistoryEntry(parsed, rawRecordId, targets)
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
