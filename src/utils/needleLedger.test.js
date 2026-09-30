import { describe, expect, it } from 'vitest'
import {
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
