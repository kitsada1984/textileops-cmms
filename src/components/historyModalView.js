// Pure view helpers moved verbatim from CylinderHistoryModal
// (criteria, refs, and search matching only — no state, no side effects).

export function resolveEffectiveRefs(cylinder, machineCode, cylinders, internalCylinders) {
  const cyl = cylinder || {}
  return {
    list: (Array.isArray(cylinders) && cylinders.length > 0)
      ? cylinders
      : internalCylinders,
    serial: cyl.Serial_NOW || cyl.Serial_OLD || '',
    mc: machineCode || cyl.NewMC || cyl.OLDMC || '',
    id: cyl.id || cyl._id,
  }
}

export function resolveHistoryCriteria(activeTab, effectiveSerial, effectiveMc, cylinderId) {
  if (activeTab === 'cylinder') {
    return { serial: effectiveSerial, cylinderId }
  }
  if (activeTab === 'machine') {
    return { mc: effectiveMc }
  }
  return {
    serial: effectiveSerial,
    mc: effectiveMc,
    cylinderId,
  }
}

export function matchHistoryItem(item, q) {
  const it = item || {}
  const inn = it.in || {}
  const out = it.out || {}
  const comment = String(it.comment || '').toLowerCase()
  const user = String(it.user || '').toLowerCase()
  const serials = [inn.serial, out.serial, it.serial].filter(Boolean).join(' ').toLowerCase()
  const mcs = [inn.mc, out.mc, it.mcFrom, it.mcTo].filter(Boolean).join(' ').toLowerCase()
  return comment.includes(q) || user.includes(q) || serials.includes(q) || mcs.includes(q)
}

export function filterHistoryItems(historyList, search) {
  if (!search.trim()) return historyList
  const q = search.trim().toLowerCase()
  return historyList.filter((item) => matchHistoryItem(item, q))
}
