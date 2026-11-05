// Pure parsers moved verbatim from parseCylinderAuditLog
// (field-resolution chains only — no I/O, no side effects).

export function buildSwapSideCore(item, snapshot, beforeRef, serialFallback = '') {
  const snap = snapshot || {}
  return {
    id: item.id || beforeRef.id || null,
    serial: item.serial || snap.Serial_NOW || serialFallback || '',
    mc: item.mc || snap.NewMC || '',
    loc: item.loc || snap.Location || '',
    standard: item.standard || snap.Standard || '',
    machineRef: item.machineRef || snap.Machine_Ref || '',
  }
}

export function buildSwapSideSpecs(item, snapshot) {
  const snap = snapshot || {}
  return {
    feeder: item.feeder || snap.Feeder || '',
    type: item.type || snap.Type || '',
    dia: item.dia || snap.Diameter || '',
    gauge: item.gauge || snap.Gauge || '',
    needle: item.needle || snap.Needle || '',
    mfr: item.mfr || snap.Manufacturer || '',
  }
}

export function buildSwapSideView(item, snapshot, beforeRef, serialFallback = '') {
  return {
    ...buildSwapSideCore(item, snapshot, beforeRef, serialFallback),
    ...buildSwapSideSpecs(item, snapshot),
  }
}

export function parseSwapLog(log, date, user, comment, oldVal, newVal) {
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
    in: buildSwapSideView(inItem, snapshotInAfter, oldInItem),
    out: buildSwapSideView(outItem, snapshotOutAfter, oldOutItem),
    inBefore: buildSwapSideView(oldInItem, snapshotInBefore, {}, inItem.serial || ''),
    outBefore: buildSwapSideView(oldOutItem, snapshotOutBefore, {}, outItem.serial || ''),
    snapshotInBefore,
    snapshotOutBefore,
    snapshotInAfter,
    snapshotOutAfter,
  }
}

export function parseUpdateLog(log, action, date, user, comment, oldVal, newVal) {
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
