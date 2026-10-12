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

export const HISTORY_COMPARE_COLUMNS = [
  { key: 'Location', label: 'สถานที่จัดเก็บ (Location)', fieldAliases: ['Location', 'loc'] },
  { key: 'NewMC', label: 'เครื่องปัจจุบัน (Machine)', fieldAliases: ['NewMC', 'mc'] },
  { key: 'Machine_Ref', label: 'สถานะเครื่อง (Machine Ref)', fieldAliases: ['Machine_Ref', 'machineRef'] },
  { key: 'Standard', label: 'มาตรฐานเครื่อง (Standard)', fieldAliases: ['Standard', 'standard'] },
  { key: 'Serial_NOW', label: 'ซีเรียลปัจจุบัน (Serial NOW)', fieldAliases: ['Serial_NOW', 'serial'] },
  { key: 'Serial_OLD', label: 'ซีเรียลเดิม (Serial OLD)', fieldAliases: ['Serial_OLD'] },
  { key: 'Feeder', label: 'ฟีดเดอร์ (Feeder)', fieldAliases: ['Feeder', 'feeder'] },
  { key: 'Type', label: 'ประเภทกระบอก (Type)', fieldAliases: ['Type', 'type'] },
  { key: 'Diameter', label: 'ขนาดเส้นผ่านศูนย์กลาง (Dia)', fieldAliases: ['Diameter', 'dia'], suffix: '"' },
  { key: 'Gauge', label: 'เกจ (Gauge)', fieldAliases: ['Gauge', 'gauge'], suffix: 'G' },
  { key: 'Needle', label: 'จำนวนเข็ม (Needle)', fieldAliases: ['Needle', 'needle'] },
  { key: 'Manufacturer', label: 'ผู้ผลิต (Manufacturer)', fieldAliases: ['Manufacturer', 'mfr'] },
  { key: 'Comment', label: 'หมายเหตุ (Comment)', fieldAliases: ['Comment', 'comment'] },
]

export function extractFieldValue(sourceObj, fallbackSnapshot, aliases = []) {
  if (fallbackSnapshot && typeof fallbackSnapshot === 'object') {
    for (const k of aliases) {
      if (fallbackSnapshot[k] !== undefined && fallbackSnapshot[k] !== null && fallbackSnapshot[k] !== '') {
        return fallbackSnapshot[k]
      }
    }
  }
  if (sourceObj && typeof sourceObj === 'object') {
    for (const k of aliases) {
      if (sourceObj[k] !== undefined && sourceObj[k] !== null && sourceObj[k] !== '') {
        return sourceObj[k]
      }
    }
  }
  return ''
}

/**
 * Builds detailed column comparison rows matching the swap modal (CompareTable).
 */
export function buildSwapCompareTable(item = {}) {
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

  const outCyl = {
    Serial_NOW: outAfter.serial || extractFieldValue(outAfter, snapOutAfter, ['Serial_NOW', 'serial']) || extractFieldValue(outBefore, snapOutBefore, ['Serial_NOW', 'serial']),
    NewMC: outAfter.mc || extractFieldValue(outAfter, snapOutAfter, ['NewMC', 'mc']) || outAfter.standard || '',
  }
  const inCyl = {
    Serial_NOW: inAfter.serial || extractFieldValue(inAfter, snapInAfter, ['Serial_NOW', 'serial']) || extractFieldValue(inBefore, snapInBefore, ['Serial_NOW', 'serial']),
    NewMC: inAfter.mc || extractFieldValue(inAfter, snapInAfter, ['NewMC', 'mc']) || inAfter.standard || '',
  }

  let swapCount = 0

  const rows = HISTORY_COMPARE_COLUMNS.map((col) => {
    const isColSwap = swapCols.some(
      (sc) => sc === col.key || col.fieldAliases.includes(sc)
    )

    let outOld = extractFieldValue(outBefore, snapOutBefore, col.fieldAliases)
    let inOld = extractFieldValue(inBefore, snapInBefore, col.fieldAliases)
    let outNew = extractFieldValue(outAfter, snapOutAfter, col.fieldAliases)
    let inNew = extractFieldValue(inAfter, snapInAfter, col.fieldAliases)

    if (isColSwap) {
      swapCount += 1
      // If after value is not explicitly present in legacy logs, swap from the other cylinder's old value
      if (!outNew && inOld) outNew = inOld
      if (!inNew && outOld) inNew = outOld
    } else {
      // If column is kept, new value matches old
      if (!outNew && outOld) outNew = outOld
      if (!inNew && inOld) inNew = inOld
    }

    // Skip if all values are empty
    if (!outOld && !outNew && !inOld && !inNew) {
      return null
    }

    const outChanged = isColSwap && String(outOld ?? '') !== String(outNew ?? '')
    const inChanged = isColSwap && String(inOld ?? '') !== String(inNew ?? '')

    return {
      key: col.key,
      label: col.label,
      isSwap: isColSwap,
      outOld: outOld ? `${outOld}${col.suffix || ''}` : '',
      outNew: outNew ? `${outNew}${col.suffix || ''}` : '',
      inOld: inOld ? `${inOld}${col.suffix || ''}` : '',
      inNew: inNew ? `${inNew}${col.suffix || ''}` : '',
      outChanged,
      inChanged,
    }
  }).filter(Boolean)

  return { rows, outCyl, inCyl, swapCount }
}

/**
 * Builds detailed comparison rows for UPDATE action (single cylinder change/machine update).
 */
export function buildUpdateCompareTable(item = {}) {
  const oldData = item.oldData || {}
  const newData = item.newData || {}

  const rows = HISTORY_COMPARE_COLUMNS.map((col) => {
    const oldVal = extractFieldValue(oldData, null, col.fieldAliases)
    const newVal = extractFieldValue(newData, null, col.fieldAliases)

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
    const inItem = newVal.in || {}
    const outItem = newVal.out || {}
    const oldInItem = oldVal.in || {}
    const oldOutItem = oldVal.out || {}
    const swapCols = Array.isArray(newVal.swapCols) ? newVal.swapCols : ['Location', 'Machine_Ref', 'Feeder']

    const snapshotInBefore = oldVal.snapshotIn || null
    const snapshotOutBefore = oldVal.snapshotOut || null
    const snapshotInAfter = newVal.snapshotIn || null
    const snapshotOutAfter = newVal.snapshotOut || null

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
        id: inItem.id || oldInItem.id || null,
        serial: inItem.serial || snapshotInAfter?.Serial_NOW || '',
        mc: inItem.mc || snapshotInAfter?.NewMC || '',
        loc: inItem.loc || snapshotInAfter?.Location || '',
        standard: inItem.standard || snapshotInAfter?.Standard || '',
        machineRef: inItem.machineRef || snapshotInAfter?.Machine_Ref || '',
        feeder: inItem.feeder || snapshotInAfter?.Feeder || '',
        type: inItem.type || snapshotInAfter?.Type || '',
        dia: inItem.dia || snapshotInAfter?.Diameter || '',
        gauge: inItem.gauge || snapshotInAfter?.Gauge || '',
        needle: inItem.needle || snapshotInAfter?.Needle || '',
        mfr: inItem.mfr || snapshotInAfter?.Manufacturer || '',
      },
      out: {
        id: outItem.id || oldOutItem.id || null,
        serial: outItem.serial || snapshotOutAfter?.Serial_NOW || '',
        mc: outItem.mc || snapshotOutAfter?.NewMC || '',
        loc: outItem.loc || snapshotOutAfter?.Location || '',
        standard: outItem.standard || snapshotOutAfter?.Standard || '',
        machineRef: outItem.machineRef || snapshotOutAfter?.Machine_Ref || '',
        feeder: outItem.feeder || snapshotOutAfter?.Feeder || '',
        type: outItem.type || snapshotOutAfter?.Type || '',
        dia: outItem.dia || snapshotOutAfter?.Diameter || '',
        gauge: outItem.gauge || snapshotOutAfter?.Gauge || '',
        needle: outItem.needle || snapshotOutAfter?.Needle || '',
        mfr: outItem.mfr || snapshotOutAfter?.Manufacturer || '',
      },
      inBefore: {
        id: oldInItem.id || null,
        serial: oldInItem.serial || snapshotInBefore?.Serial_NOW || inItem.serial || '',
        mc: oldInItem.mc || snapshotInBefore?.NewMC || '',
        loc: oldInItem.loc || snapshotInBefore?.Location || '',
        standard: oldInItem.standard || snapshotInBefore?.Standard || '',
        machineRef: oldInItem.machineRef || snapshotInBefore?.Machine_Ref || '',
        feeder: oldInItem.feeder || snapshotInBefore?.Feeder || '',
        type: oldInItem.type || snapshotInBefore?.Type || '',
        dia: oldInItem.dia || snapshotInBefore?.Diameter || '',
        gauge: oldInItem.gauge || snapshotInBefore?.Gauge || '',
        needle: oldInItem.needle || snapshotInBefore?.Needle || '',
        mfr: oldInItem.mfr || snapshotInBefore?.Manufacturer || '',
      },
      outBefore: {
        id: oldOutItem.id || null,
        serial: oldOutItem.serial || snapshotOutBefore?.Serial_NOW || outItem.serial || '',
        mc: oldOutItem.mc || snapshotOutBefore?.NewMC || '',
        loc: oldOutItem.loc || snapshotOutBefore?.Location || '',
        standard: oldOutItem.standard || snapshotOutBefore?.Standard || '',
        machineRef: oldOutItem.machineRef || snapshotOutBefore?.Machine_Ref || '',
        feeder: oldOutItem.feeder || snapshotOutBefore?.Feeder || '',
        type: oldOutItem.type || snapshotOutBefore?.Type || '',
        dia: oldOutItem.dia || snapshotOutBefore?.Diameter || '',
        gauge: oldOutItem.gauge || snapshotOutBefore?.Gauge || '',
        needle: oldOutItem.needle || snapshotOutBefore?.Needle || '',
        mfr: oldOutItem.mfr || snapshotOutBefore?.Manufacturer || '',
      },
      snapshotInBefore,
      snapshotOutBefore,
      snapshotInAfter,
      snapshotOutAfter,
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
    mcFrom: oldVal.mc || oldVal.NewMC || '',
    mcTo: newVal.mc || newVal.NewMC || '',
    locFrom: oldVal.loc || oldVal.Location || '',
    locTo: newVal.loc || newVal.Location || '',
    serial: newVal.serial || newVal.Serial_NOW || oldVal.serial || oldVal.Serial_NOW || log.RecordID || '',
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
