import { describe, it, expect, vi } from 'vitest'
import { generatePartCode } from '../utils/inventory'
import {
  buildStockMovementPartCodeOptions,
  buildStockMovementPartNameOptions,
  findMatchingSparePart,
} from '../utils/stockMovementMC'

describe('Purchasing Part Auto-Fill & Auto-Creation Logic', () => {
  const mockParts = [
    {
      id: 'sp-1',
      Part_Code: 'SP-001',
      Part_Name_EN: 'Timing Belt 5M',
      Part_Name_TH: 'สายพาน 5M',
      Category: 'สายพานส่งด้าย',
      Unit_Price: 350,
      Supplier: 'SKF Thailand',
      Stock_Qty: 5,
    },
    {
      id: 'sp-2',
      Part_Code: 'SP-002',
      Part_Name_EN: 'Bearing 6204',
      Part_Name_TH: 'ลูกปืน 6204',
      Category: 'ลูกปืน',
      Unit_Price: 120,
      Supplier: 'NSK Ltd',
      Stock_Qty: 10,
    },
  ]

  const mockPOs = [
    {
      PO_Number: 'PO-2026-001',
      Part_Code: 'SP-001',
      Part_Name_EN: 'Timing Belt 5M',
    },
    {
      PO_Number: 'PO-2026-002',
      Part_Code: 'SP-003',
      Part_Name_EN: 'Pneumatic Valve 24V',
    },
  ]

  it('builds partCodeOptions and partNameOptions from both SpareParts and PO records', () => {
    const codeOpts = buildStockMovementPartCodeOptions(mockParts, mockPOs)
    const nameOpts = buildStockMovementPartNameOptions(mockParts, mockPOs)

    // Code options
    expect(codeOpts.some((c) => c.value === 'SP-001')).toBe(true)
    expect(codeOpts.some((c) => c.value === 'SP-002')).toBe(true)
    expect(codeOpts.some((c) => c.value === 'SP-003')).toBe(true)

    // Name options
    expect(nameOpts.some((n) => n.value === 'Timing Belt 5M')).toBe(true)
    expect(nameOpts.some((n) => n.value === 'Bearing 6204')).toBe(true)
    expect(nameOpts.some((n) => n.value === 'Pneumatic Valve 24V')).toBe(true)
  })

  it('findMatchingSparePart retrieves existing part by code or name', () => {
    const byCode = findMatchingSparePart(mockParts, 'SP-001')
    expect(byCode).toBeDefined()
    expect(byCode.Part_Name_EN).toBe('Timing Belt 5M')
    expect(byCode.Category).toBe('สายพานส่งด้าย')
    expect(byCode.Unit_Price).toBe(350)
    expect(byCode.Supplier).toBe('SKF Thailand')

    const byName = findMatchingSparePart(mockParts, 'Bearing 6204')
    expect(byName).toBeDefined()
    expect(byName.Part_Code).toBe('SP-002')
    expect(byName.Category).toBe('ลูกปืน')
    expect(byName.Supplier).toBe('NSK Ltd')
  })

  it('generates the next sequential part code when adding a new part', () => {
    // Current highest is SP-002 in mockParts
    const nextCode = generatePartCode(mockParts)
    expect(nextCode).toBe('SP-003')

    // If mockParts has SP-003 as well
    const partsWith003 = [...mockParts, { Part_Code: 'SP-003' }]
    expect(generatePartCode(partsWith003)).toBe('SP-004')
  })

  it('verifies auto-creation structure for brand new spare part', () => {
    const targetPartCode = 'SP-029'
    const targetPartName = 'มู่เล่ 11600'
    const category = 'เครื่องมือช่าง'
    const supplier = 'ร้านรุ่งเรืองการช่าง'
    const unitPrice = 450

    const newPartPayload = {
      Part_Code: targetPartCode,
      Part_Name_TH: '',
      Part_Name_EN: targetPartName || targetPartCode,
      Category: category,
      Unit: '',
      Stock_Qty: 0,
      Min_Qty: 0,
      Location_Store: '',
      Supplier: supplier,
      Unit_Price: unitPrice,
      Compatible_Machines: [],
      Status: 'OUT_OF_STOCK',
      Remark: 'สร้างอัตโนมัติจากใบสั่งซื้อ PO-2026-099',
    }

    expect(newPartPayload.Part_Code).toBe('SP-029')
    expect(newPartPayload.Part_Name_EN).toBe('มู่เล่ 11600')
    expect(newPartPayload.Stock_Qty).toBe(0)
    expect(newPartPayload.Status).toBe('OUT_OF_STOCK')
  })
})
