import { describe, expect, it } from 'vitest'
import {
  VOID_ACTION_LABEL,
  MANUAL_MOVEMENT_ACTIONS,
  isReversibleLedgerAction,
  findVoidEntry,
  buildVoidLedgerEntry,
  needleStatusForQuantity,
  formatSignedQty,
  classifyNeedleAction,
  isInSystemMovement,
  needleActionLabel,
  needleActionBadgeClass,
  sumNeedleLedger,
} from './needleLedger'

describe('classifyNeedleAction', () => {
  it('classifies the Thai labels written by the stock screen', () => {
    expect(classifyNeedleAction('รับเข้า (Stock In)')).toBe('in')
    expect(classifyNeedleAction('เบิกออก (Stock Out)')).toBe('out')
    expect(classifyNeedleAction('ตัดยอด (Adjustment)')).toBe('adjust')
    expect(classifyNeedleAction('ตัดทิ้ง (Scrap)')).toBe('scrap')
  })

  it('classifies the machine codes written by the spare-needle flow', () => {
    expect(classifyNeedleAction('ISSUE_SPARE')).toBe('out')
    expect(classifyNeedleAction('ISSUE_SPARE_OFF_SYSTEM')).toBe('out')
    expect(classifyNeedleAction('RETURN_SPARE')).toBe('in')
  })

  it('treats grade inspection as an adjustment', () => {
    expect(classifyNeedleAction('คัดแยก/เปลี่ยนเกรดเข็ม')).toBe('adjust')
  })

  it('falls back to other for unknown or empty values', () => {
    expect(classifyNeedleAction('')).toBe('other')
    expect(classifyNeedleAction(undefined)).toBe('other')
    expect(classifyNeedleAction('อะไรสักอย่าง')).toBe('other')
  })
})

describe('isInSystemMovement', () => {
  it('flags off-system spare issues as not moving store stock', () => {
    expect(isInSystemMovement('ISSUE_SPARE_OFF_SYSTEM')).toBe(false)
    expect(isInSystemMovement('ISSUE_SPARE')).toBe(true)
    expect(isInSystemMovement('เบิกออก (Stock Out)')).toBe(true)
  })
})

describe('needleActionLabel / badge', () => {
  it('translates the machine codes for display', () => {
    expect(needleActionLabel('ISSUE_SPARE')).toBe('เบิกจ่าย Spare (ตัดสต็อก)')
    expect(needleActionLabel('ISSUE_SPARE_OFF_SYSTEM')).toBe('เบิกจ่าย Spare (นอกระบบ)')
    expect(needleActionLabel('RETURN_SPARE')).toBe('รับคืนจากใบเบิก (คืนคลัง)')
    expect(needleActionLabel('รับเข้า (Stock In)')).toBe('รับเข้า (Stock In)')
  })

  it('gives spare issues the same blue badge as a manual stock-out', () => {
    expect(needleActionBadgeClass('ISSUE_SPARE')).toBe(needleActionBadgeClass('เบิกออก (Stock Out)'))
    expect(needleActionBadgeClass('RETURN_SPARE')).toBe(needleActionBadgeClass('รับเข้า (Stock In)'))
    expect(needleActionBadgeClass('อะไรก็ไม่รู้')).toContain('bg-slate-100')
  })
})

describe('sumNeedleLedger', () => {
  const logs = [
    { actionType: 'รับเข้า (Stock In)', qtyChange: 500 },
    { actionType: 'เบิกออก (Stock Out)', qtyChange: '-120' },
    { actionType: 'ISSUE_SPARE', qtyChange: '-50' },
    { actionType: 'ISSUE_SPARE', qtyChange: '-200' },
    { actionType: 'RETURN_SPARE', qtyChange: '+30' },
    { actionType: 'ISSUE_SPARE_OFF_SYSTEM', qtyChange: '-80' },
    { actionType: 'ตัดทิ้ง (Scrap)', qtyChange: '-15' },
    { actionType: 'คัดแยก/เปลี่ยนเกรดเข็ม', qtyChange: 0 },
  ]

  it('counts spare issues as issued stock', () => {
    const out = sumNeedleLedger(logs)
    expect(out.issued).toBe(370) // 120 manual + 50 + 200 spare
  })

  it('counts spare returns as received stock', () => {
    const out = sumNeedleLedger(logs)
    expect(out.received).toBe(530) // 500 stock-in + 30 returned
    expect(out.returned).toBe(30)
  })

  it('excludes off-system needles and grade changes from the totals', () => {
    const out = sumNeedleLedger(logs)
    expect(out.issued).toBe(370) // the 80 off-system needles are not in here
    expect(out.scrapped).toBe(15)
  })

  it('handles empty or malformed input', () => {
    expect(sumNeedleLedger()).toEqual({ received: 0, issued: 0, scrapped: 0, returned: 0 })
    expect(sumNeedleLedger([{ actionType: 'ISSUE_SPARE' }])).toEqual({ received: 0, issued: 0, scrapped: 0, returned: 0 })
  })
})

describe('ledger reversal helpers', () => {
  it('allows only the four manual movements to be reversed from the ledger', () => {
    for (const act of MANUAL_MOVEMENT_ACTIONS) {
      expect(isReversibleLedgerAction(act)).toBe(true)
    }
    // spare-needle entries are reversed by deleting the request instead
    expect(isReversibleLedgerAction('ISSUE_SPARE')).toBe(false)
    expect(isReversibleLedgerAction('RETURN_SPARE')).toBe(false)
    expect(isReversibleLedgerAction(VOID_ACTION_LABEL)).toBe(false)
    expect(isReversibleLedgerAction('')).toBe(false)
  })

  it('classifies a void entry as an adjustment so KPIs are not inflated', () => {
    expect(classifyNeedleAction(VOID_ACTION_LABEL)).toBe('adjust')
    const out = sumNeedleLedger([
      { actionType: 'เบิกออก (Stock Out)', qtyChange: '-10' },
      { actionType: VOID_ACTION_LABEL, qtyChange: '+10' },
    ])
    expect(out.issued).toBe(10) // the reversal must not add another 10
  })

  it('builds a reversal entry that restores the balance and references the original', () => {
    const log = { id: 'LOG-1', logId: 'LOG-1', setId: 'NS-9', actionType: 'เบิกออก (Stock Out)', qtyChange: '-10', stockDetail: 'PM', targetMachine: 'LA341M' }
    const set = { id: 'NS-9', quantity: 90, grade: 'เกรด B', conditionDetail: 'สภาพดี' }
    const entry = buildVoidLedgerEntry({ log, set, technician: 'tuk', reason: 'บันทึกผิด' })

    expect(entry.actionType).toBe(VOID_ACTION_LABEL)
    expect(entry.qtyChange).toBe(10)          // opposite of the original
    expect(entry.quantity).toBe(10)
    expect(entry.balanceAfter).toBe(100)
    expect(entry.remarks).toContain('LOG-1')
    expect(entry.remarks).toContain('บันทึกผิด')
    expect(entry._void).toMatchObject({ originalId: 'LOG-1', originalQty: -10 })
  })

  it('reverses a stock-in by subtracting, and never goes below zero', () => {
    const inLog = { id: 'LOG-2', setId: 'NS-9', actionType: 'รับเข้า (Stock In)', qtyChange: 500 }
    const entry = buildVoidLedgerEntry({ log: inLog, set: { id: 'NS-9', quantity: 600 } })
    expect(entry.qtyChange).toBe(-500)
    expect(entry.balanceAfter).toBe(100)

    const overdraw = buildVoidLedgerEntry({ log: { id: 'LOG-3', setId: 'NS-9', actionType: 'รับเข้า (Stock In)', qtyChange: 500 }, set: { id: 'NS-9', quantity: 100 } })
    expect(overdraw.balanceAfter).toBe(0)
  })

  it('detects an existing reversal so the same entry cannot be voided twice', () => {
    const original = { id: 'LOG-7', logId: 'LOG-7', actionType: 'เบิกออก (Stock Out)', qtyChange: '-10' }
    const voidEntry = buildVoidLedgerEntry({ log: original, set: { quantity: 50 } })
    expect(findVoidEntry([original], 'LOG-7')).toBeFalsy()
    expect(findVoidEntry([voidEntry, original], 'LOG-7')).toBe(voidEntry)
    expect(findVoidEntry([], 'LOG-7')).toBeFalsy()
    expect(findVoidEntry([voidEntry], '')).toBeFalsy()
  })

  it('keeps the stock status thresholds consistent after a reversal', () => {
    expect(needleStatusForQuantity(0)).toBe('หมดสต็อก')
    expect(needleStatusForQuantity(100)).toBe('สต็อกเหลือน้อย')
    expect(needleStatusForQuantity(101)).toBe('พร้อมใช้งาน')
  })

  it('formats signed quantities for the audit remark', () => {
    expect(formatSignedQty(-10)).toBe('-10')
    expect(formatSignedQty(1500)).toBe('+1,500')
  })
})
