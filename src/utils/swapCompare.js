// Compare-table + entry-matching helpers moved verbatim from cylinderHistory
// (pure field resolution and predicates only — no I/O, no side effects).

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

export function resolveCompareSerial(afterSide, snapAfter, beforeSide, snapBefore) {
  const after = afterSide || {}
  const before = beforeSide || {}
  return after.serial || extractFieldValue(after, snapAfter, ['Serial_NOW', 'serial']) || extractFieldValue(before, snapBefore, ['Serial_NOW', 'serial']) || ''
}

export function buildCompareSide(afterSide, beforeSide, snapAfter, snapBefore, master) {
  const after = afterSide || {}
  const mst = master || {}
  const serial = resolveCompareSerial(afterSide, snapAfter, beforeSide, snapBefore)
  return {
    serial,
    cyl: {
      Serial_NOW: serial || mst.Serial_NOW || '',
      NewMC: after.mc || extractFieldValue(after, snapAfter, ['NewMC', 'mc']) || after.standard || mst.NewMC || mst.Standard || '',
    },
  }
}

export function inferSwappedValues(isColSwap, values) {
  let { outOld, inOld, outNew, inNew } = values
  if (isColSwap) {
    // If after value is not explicitly present in legacy logs, swap from the other cylinder's old value
    if (!outNew && inOld) outNew = inOld
    if (!inNew && outOld) inNew = outOld
    // If before value was not stored (legacy log), infer from opposite after value
    if (!outOld && inNew) outOld = inNew
    if (!inOld && outNew) inOld = outNew
  } else {
    // If column is kept, new value matches old
    if (!outNew && outOld) outNew = outOld
    if (!inNew && inOld) inNew = inOld
    if (!outOld && outNew) outOld = outNew
    if (!inOld && inNew) inOld = inNew
  }
  return { outOld, inOld, outNew, inNew }
}

export function buildCompareRow(col, ctx) {
  const { swapCols, outBefore, snapOutBefore, inBefore, snapInBefore, outAfter, snapOutAfter, inAfter, snapInAfter, masterOut, masterIn } = ctx
  const isColSwap = swapCols.some(
    (sc) => sc === col.key || col.fieldAliases.includes(sc)
  )

  let outOld = extractFieldValue(outBefore, snapOutBefore, col.fieldAliases) || (masterOut ? extractFieldValue(masterOut, null, col.fieldAliases) : '')
  let inOld = extractFieldValue(inBefore, snapInBefore, col.fieldAliases) || (masterIn ? extractFieldValue(masterIn, null, col.fieldAliases) : '')
  let outNew = extractFieldValue(outAfter, snapOutAfter, col.fieldAliases)
  let inNew = extractFieldValue(inAfter, snapInAfter, col.fieldAliases)

  const inferred = inferSwappedValues(isColSwap, { outOld, inOld, outNew, inNew })
  outOld = inferred.outOld
  inOld = inferred.inOld
  outNew = inferred.outNew
  inNew = inferred.inNew

  // Skip if all values are empty
  if (!outOld && !outNew && !inOld && !inNew) {
    return { row: null, isSwap: isColSwap }
  }

  const outChanged = isColSwap && String(outOld ?? '') !== String(outNew ?? '')
  const inChanged = isColSwap && String(inOld ?? '') !== String(inNew ?? '')

  return {
    isSwap: isColSwap,
    row: {
      key: col.key,
      label: col.label,
      isSwap: isColSwap,
      outOld: outOld ? `${outOld}${col.suffix || ''}` : '',
      outNew: outNew ? `${outNew}${col.suffix || ''}` : '',
      inOld: inOld ? `${inOld}${col.suffix || ''}` : '',
      inNew: inNew ? `${inNew}${col.suffix || ''}` : '',
      outChanged,
      inChanged,
    },
  }
}

export function matchSwapHistoryEntry(parsed, rawRecordId, { targetSerial, targetMc, targetId }) {
  const p = parsed || {}
  const inn = p.in || {}
  const out = p.out || {}
  const inSerial = String(inn.serial || '').toLowerCase()
  const outSerial = String(out.serial || '').toLowerCase()
  const inMc = String(inn.mc || '').toLowerCase()
  const outMc = String(out.mc || '').toLowerCase()
  const inId = String(inn.id || '')
  const outId = String(out.id || '')
  const commentLower = String(p.comment || '').toLowerCase()
  const recordIdLower = String(rawRecordId || '').toLowerCase()

  if (targetSerial && (inSerial.includes(targetSerial) || outSerial.includes(targetSerial) || recordIdLower.includes(targetSerial) || commentLower.includes(targetSerial))) {
    return true
  }
  if (targetMc && (inMc.includes(targetMc) || outMc.includes(targetMc) || commentLower.includes(targetMc))) {
    return true
  }
  if (targetId && (inId === targetId || outId === targetId)) {
    return true
  }
  return false
}

export function matchUpdateHistoryEntry(parsed, rawRecordId, { targetSerial, targetMc, targetId }) {
  const p = parsed || {}
  // UPDATE or CREATE
  const entrySerial = String(p.serial || rawRecordId || '').toLowerCase()
  const mcFrom = String(p.mcFrom || '').toLowerCase()
  const mcTo = String(p.mcTo || '').toLowerCase()
  const commentLower = String(p.comment || '').toLowerCase()

  if (targetSerial && (entrySerial.includes(targetSerial) || commentLower.includes(targetSerial))) {
    return true
  }
  if (targetMc && (mcFrom.includes(targetMc) || mcTo.includes(targetMc) || commentLower.includes(targetMc))) {
    return true
  }
  if (targetId && String(rawRecordId || '').includes(targetId)) {
    return true
  }
  return false
}
