/**
 * src/utils/needleLedger.js
 * Classification helpers for the needle-stock ledger (needle_history_logs).
 *
 * The ledger mixes Thai action labels written by the stock screen
 * ("รับเข้า (Stock In)", "เบิกออก (Stock Out)", "ตัดยอด (Adjustment)",
 * "ตัดทิ้ง (Scrap)", "คัดแยก/เปลี่ยนเกรดเข็ม") with machine codes written by
 * the spare-needle flow ("ISSUE_SPARE", "ISSUE_SPARE_OFF_SYSTEM",
 * "RETURN_SPARE"). English codes used to be ignored by the KPI cards and the
 * type filters, so spare issues never showed up as "เบิกออก".
 */

export const NEEDLE_LEDGER_TYPES = ['all', 'in', 'out', 'adjust', 'scrap', 'other']

/** @returns {'in'|'out'|'adjust'|'scrap'|'other'} */
export function classifyNeedleAction(actionType) {
  const act = String(actionType || '')
  if (!act) return 'other'

  if (act.includes('รับเข้า') || act.includes('Stock In') || act.includes('RETURN_SPARE')) return 'in'
  if (act.includes('เบิกออก') || act.includes('Stock Out') || act.startsWith('ISSUE_SPARE')) return 'out'
  if (act.includes('ตัดยอด') || act.includes('Adjustment') || act.includes('เปลี่ยนเกรด') || act.includes('คัดแยก') || act.includes('ยกเลิกรายการ')) return 'adjust'
  if (act.includes('ตัดทิ้ง') || act.includes('Scrap') || act.includes('ปลดระวาง')) return 'scrap'
  return 'other'
}

/** True when the entry actually moved stock inside the store (off-system loans did not). */
export function isInSystemMovement(actionType) {
  return String(actionType || '').indexOf('OFF_SYSTEM') === -1
}

const TYPE_LABELS = {
  in: 'รับเข้า',
  out: 'เบิกออก',
  adjust: 'ปรับปรุง/คัดแยก',
  scrap: 'ตัดทิ้ง',
  other: 'อื่น ๆ',
}

/** Thai display label for the ledger badge. */
export function needleActionLabel(actionType) {
  const act = String(actionType || '')
  if (act === 'ISSUE_SPARE') return 'เบิกจ่าย Spare (ตัดสต็อก)'
  if (act === 'ISSUE_SPARE_OFF_SYSTEM') return 'เบิกจ่าย Spare (นอกระบบ)'
  if (act === 'RETURN_SPARE') return 'รับคืนจากใบเบิก (คืนคลัง)'
  return act || TYPE_LABELS.other
}

/** Tailwind classes for the ledger badge, matching the movement type. */
export function needleActionBadgeClass(actionType) {
  switch (classifyNeedleAction(actionType)) {
    case 'in':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
    case 'out':
      return 'bg-blue-100 text-blue-800 border-blue-200 font-bold'
    case 'adjust':
      return 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
    case 'scrap':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

/**
 * Ledger KPI totals. Only real stock movements are counted:
 * - received: stock-in entries + spare returns (คืนคลัง)
 * - issued:   manual stock-out + in-system spare issues (off-system needles
 *             never left this store, so they are excluded)
 * - scrapped: scrap entries
 */
export function sumNeedleLedger(logs = []) {
  let received = 0
  let issued = 0
  let scrapped = 0
  let returned = 0

  for (const log of Array.isArray(logs) ? logs : []) {
    const act = log?.actionType
    const change = Math.abs(parseInt(log?.qtyChange, 10) || 0)
    if (!change) continue

    if (act === 'RETURN_SPARE') {
      returned += change
      received += change
      continue
    }
    if (act === 'ISSUE_SPARE_OFF_SYSTEM') continue

    switch (classifyNeedleAction(act)) {
      case 'in':
        received += change
        break
      case 'out':
        issued += change
        break
      case 'scrap':
        scrapped += change
        break
      default:
        break
    }
  }

  return { received, issued, scrapped, returned }
}

/* ── Reversal (ยกเลิกรายการ + คืนยอด) ────────────────────────────────────── */

export const VOID_ACTION_LABEL = 'ยกเลิกรายการ (Void)'

// Only the four manual movements written by the stock screen can be reversed
// from the ledger; spare-needle entries are reversed by deleting the request
// (which restores stock through its own verified path).
/** The four manual movements written by the stock screen (exact labels). */
export const MANUAL_MOVEMENT_ACTIONS = [
  'รับเข้า (Stock In)',
  'เบิกออก (Stock Out)',
  'ตัดยอด (Adjustment)',
  'ตัดทิ้ง (Scrap)',
]

export function isReversibleLedgerAction(actionType) {
  return MANUAL_MOVEMENT_ACTIONS.includes(String(actionType || '').trim())
}

export function formatSignedQty(n) {
  const v = parseInt(n, 10) || 0
  return v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString()
}

/** Has this ledger entry already been reversed? */
export function findVoidEntry(logs = [], logId) {
  if (!logId) return null
  const needle = String(logId)
  return (Array.isArray(logs) ? logs : []).find(
    (l) => l?.actionType === VOID_ACTION_LABEL && String(l?.remarks || '').includes(needle)
  ) || null
}

/**
 * Builds the reversal entry for a manual movement: it applies the opposite
 * quantity to the set and documents the original entry (audit trail is kept —
 * the original row is never deleted).
 */
export function buildVoidLedgerEntry({ log = {}, set = {}, technician = '', reason = '', now = new Date() } = {}) {
  const original = parseInt(log.qtyChange, 10) || 0
  const currentBal = parseInt(set.quantity, 10) || 0
  const reverseQty = -original
  const balanceAfter = Math.max(0, currentBal + reverseQty)
  const originalId = log.logId || log.id || ''
  const stamp = now.getTime()

  return {
    id: `LOG-VOID-${stamp}-${Math.floor(Math.random() * 1000)}`,
    logId: `LOG-VOID-${stamp}-${Math.floor(Math.random() * 1000)}`,
    setId: log.setId,
    actionType: VOID_ACTION_LABEL,
    movementType: 'VOID',
    oldGrade: set.grade || log.oldGrade || '',
    newGrade: set.grade || log.newGrade || '',
    conditionDetail: set.conditionDetail || log.conditionDetail || '',
    quantity: Math.abs(reverseQty),
    qtyChange: reverseQty,
    balanceAfter,
    dateAction: now.toISOString().slice(0, 10),
    technician,
    remarks: `ยกเลิกรายการ "${log.actionType}" (${formatSignedQty(original)}) เหตุผล: ${reason || '-'} [อ้างอิง ${originalId}]`,
    images: [],
    stockDetail: log.stockDetail || 'PM',
    targetMachine: log.targetMachine || '',
    sourceFrom: '',
    scrapReason: '',
    createdAt: now.toISOString(),
    _void: { originalId, originalAction: log.actionType, originalQty: original, balanceAfter },
  }
}

/** Stock-status label for a balance (same thresholds as the rest of the module). */
export function needleStatusForQuantity(qty) {
  const n = parseInt(qty, 10) || 0
  if (n <= 0) return 'หมดสต็อก'
  if (n <= 100) return 'สต็อกเหลือน้อย'
  return 'พร้อมใช้งาน'
}
