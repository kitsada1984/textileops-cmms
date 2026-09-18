export const MC_NOTE_PREFIX = 'MC:'
export const MACHINE_MC_NOTE_PREFIX = 'Machine_MC:'

export function extractMovementMC(note = '') {
  const lines = String(note || '').split('\n')
  const mcLine = lines.find((item) => {
    const trimmed = item.trim()
    return trimmed.startsWith(MC_NOTE_PREFIX) || trimmed.startsWith(MACHINE_MC_NOTE_PREFIX)
  })
  if (!mcLine) return ''
  const trimmed = mcLine.trim()
  if (trimmed.startsWith(MC_NOTE_PREFIX)) {
    return trimmed.slice(MC_NOTE_PREFIX.length).trim()
  }
  return trimmed.slice(MACHINE_MC_NOTE_PREFIX.length).trim()
}

export function stripMCMetaFromNote(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return !trimmed.startsWith(MC_NOTE_PREFIX) && !trimmed.startsWith(MACHINE_MC_NOTE_PREFIX)
    })
    .join('\n')
    .trim()
}

export function appendMCMetaToNote(note = '', mc = '') {
  const cleanNote = stripMCMetaFromNote(note)
  const trimmedMC = String(mc || '').trim()
  if (!trimmedMC) return cleanNote
  return [cleanNote, `${MC_NOTE_PREFIX} ${trimmedMC}`].filter(Boolean).join('\n')
}

export function getMovementMC(row = {}) {
  return String(row.MC || row.Machine_MC || extractMovementMC(row.Note) || '').trim()
}

export function filterTransactionsByMachine(transactions = [], machineCode = '') {
  const target = String(machineCode || '').trim().toLowerCase()
  if (!target) return []
  return transactions.filter((tx) => getMovementMC(tx).toLowerCase() === target)
}

export function summarizeMachineParts(transactions = []) {
  let totalTransactions = 0
  let totalQty = 0
  let totalCost = 0
  const partsMap = new Map()

  transactions.forEach((tx) => {
    totalTransactions += 1
    const qty = Math.abs(Number(tx.Qty_Change || tx.Quantity || 0))
    const unitPrice = Number(tx.Unit_Price || 0)
    const cost = qty * unitPrice

    totalQty += qty
    totalCost += cost

    const partCode = String(tx.Part_Code || '').trim() || 'UNKNOWN'
    const partName = String(tx.Part_Name_EN || tx.Part_Name_TH || partCode).trim()
    const date = tx.created_date || tx.Date || ''

    if (!partsMap.has(partCode)) {
      partsMap.set(partCode, {
        partCode,
        partName,
        totalQty: 0,
        totalCost: 0,
        unit: tx.Unit || '',
        count: 0,
        lastDate: date,
      })
    }

    const current = partsMap.get(partCode)
    current.totalQty += qty
    current.totalCost += cost
    current.count += 1
    if (date && (!current.lastDate || new Date(date) > new Date(current.lastDate))) {
      current.lastDate = date
    }
  })

  const partBreakdown = Array.from(partsMap.values()).sort((a, b) => b.totalQty - a.totalQty)

  return {
    totalTransactions,
    totalQty,
    totalCost,
    uniquePartsCount: partsMap.size,
    partBreakdown,
  }
}
