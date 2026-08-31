import { describe, expect, it } from 'vitest'
import {
  generateCenterCheckDocNo,
  DEFAULT_SINGLE_CHECKLIST_ITEMS,
  DEFAULT_DOUBLE_CHECKLIST_ITEMS,
} from './entities'

describe('CenterCheck Entities & Helpers', () => {
  it('has default checklist items for Single (10) and Double (12) Jersey', () => {
    expect(DEFAULT_SINGLE_CHECKLIST_ITEMS.length).toBe(10)
    expect(DEFAULT_DOUBLE_CHECKLIST_ITEMS.length).toBe(12)
    expect(DEFAULT_SINGLE_CHECKLIST_ITEMS[0].item).toBe('กลม cylinder')
    expect(DEFAULT_DOUBLE_CHECKLIST_ITEMS[0].item).toBe('กลม Cylinder')
  })

  it('generates valid doc numbers for Single and Double Jersey', () => {
    const singleDoc = generateCenterCheckDocNo('Single', [])
    expect(singleDoc).toMatch(/^CS-S-\d{8}-001$/)

    const doubleDoc = generateCenterCheckDocNo('Double', [])
    expect(doubleDoc).toMatch(/^CS-D-\d{8}-001$/)
  })

  it('increments doc number sequence when existing records exist for today', () => {
    const existing = [
      { doc_no: generateCenterCheckDocNo('Single', []) },
    ]
    const nextDoc = generateCenterCheckDocNo('Single', existing)
    expect(nextDoc).toMatch(/^CS-S-\d{8}-002$/)
  })
})
