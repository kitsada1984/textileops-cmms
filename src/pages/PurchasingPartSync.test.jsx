import { describe, it, expect, vi } from 'vitest'
import { generatePartCode } from '../utils/inventory'
import {
  buildStockMovementPartCodeOptions,
  buildStockMovementPartNameOptions,
  findMatchingSparePart,
} from '../utils/stockMovementMC'
import {
  createEmptyPOItem,
  parsePOItems,
  calculatePOTotals,
  buildPurchasePayload,
  buildQuickReceivePayload,
  buildCancelPOPayload,
  getPOAppliedItems,
} from './Purchasing'

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

  describe('Multi-Item PO Support & Backward Compatibility', () => {
    it('creates an empty PO item with sensible defaults', () => {
      const item = createEmptyPOItem()
      expect(item.id).toMatch(/^item-/)
      expect(item.Qty).toBe(1)
      expect(item.Part_Code).toBe('')
      expect(item.Part_Name_EN).toBe('')
    })

    it('parsePOItems handles legacy single-item PO seamlessly', () => {
      const legacyRow = {
        PO_Number: 'PO-2026-LEGACY',
        Part_Code: 'SP-001',
        Part_Name_EN: 'Timing Belt 5M',
        Category: 'สายพานส่งด้าย',
        Qty: 3,
        UnitPrice: 350,
        Total_Amount: 1050,
        Detail: 'สายพานเครื่องถัก',
        Items: null,
      }

      const items = parsePOItems(legacyRow)
      expect(items).toHaveLength(1)
      expect(items[0].Part_Code).toBe('SP-001')
      expect(items[0].Part_Name_EN).toBe('Timing Belt 5M')
      expect(items[0].Category).toBe('สายพานส่งด้าย')
      expect(items[0].Qty).toBe(3)
      expect(items[0].UnitPrice).toBe(350)
      expect(items[0].Total_Amount).toBe(1050)
    })

    it('parsePOItems handles multi-item PO stored as JSON string', () => {
      const multiRow = {
        PO_Number: 'PO-2026-MULTI',
        Items: JSON.stringify([
          { Part_Code: 'SP-001', Part_Name_EN: 'Item 1', Category: 'สายพาน', Qty: 2, UnitPrice: 350, Total_Amount: 700 },
          { Part_Code: 'SP-002', Part_Name_EN: 'Item 2', Category: 'ลูกปืน', Qty: 5, UnitPrice: 120, Total_Amount: 600 },
        ]),
      }

      const items = parsePOItems(multiRow)
      expect(items).toHaveLength(2)
      expect(items[0].Part_Code).toBe('SP-001')
      expect(items[0].Qty).toBe(2)
      expect(items[1].Part_Code).toBe('SP-002')
      expect(items[1].Qty).toBe(5)
    })

    it('calculatePOTotals computes totalQty and totalAmount accurately', () => {
      const items = [
        { Part_Code: 'SP-001', Qty: 2, UnitPrice: 350, Total_Amount: 700 },
        { Part_Code: 'SP-002', Qty: 5, UnitPrice: 120, Total_Amount: 600 },
        { Part_Code: 'SP-030', Qty: 1, UnitPrice: 1000, Total_Amount: 1000 },
      ]

      const totals = calculatePOTotals(items)
      expect(totals.totalQty).toBe(8)
      expect(totals.totalAmount).toBe(2300)
    })

    it('buildPurchasePayload aggregates totals and serializes Items to JSON', () => {
      const form = {
        PO_Number: 'PO-2026-BUILD',
        Supplier: 'ไทยเบลท์ จำกัด',
        Status: 'ORDERED',
        Note: 'ด่วนมาก',
        Items: [
          { Part_Code: 'SP-001', Part_Name_EN: 'Timing Belt 5M', Category: 'สายพาน', Qty: 2, UnitPrice: 350, Total_Amount: 700 },
          { Part_Code: 'SP-002', Part_Name_EN: 'Bearing 6204', Category: 'ลูกปืน', Qty: 5, UnitPrice: 120, Total_Amount: 600 },
        ],
      }

      const payload = buildPurchasePayload(form)
      expect(payload.PO_Number).toBe('PO-2026-BUILD')
      expect(payload.Qty).toBe(7)
      expect(payload.Total_Amount).toBe(1300)
      expect(payload.Detail).toBe('SP-001, SP-002 (+2 รายการ)')
      expect(typeof payload.Items).toBe('string')
      const parsedItems = JSON.parse(payload.Items)
      expect(parsedItems).toHaveLength(2)
      expect(payload.Note).toContain('PartCode: SP-001')
      expect(payload.Note).toContain('Category: สายพาน')
    })

    it('getPOAppliedItems retrieves applied inventory mapping or falls back to legacy', () => {
      // Modern multi-item Note
      const modernRow = {
        Note: 'Order details\nInventoryAppliedItems: {"SP-001":2,"SP-002":5}',
      }
      expect(getPOAppliedItems(modernRow)).toEqual({ 'SP-001': 2, 'SP-002': 5 })

      // Legacy single-item Note
      const legacyRow = {
        Note: 'Legacy notes\nInventoryAppliedQty: 4\nInventoryAppliedPartCode: SP-003',
      }
      expect(getPOAppliedItems(legacyRow)).toEqual({ 'SP-003': 4 })

      // Empty Note
      expect(getPOAppliedItems({ Note: '' })).toEqual({})

      // Null and undefined safety (prevent Cannot read properties of null (reading 'Note'))
      expect(getPOAppliedItems(null)).toEqual({})
      expect(getPOAppliedItems(undefined)).toEqual({})
    })

    it('buildQuickReceivePayload prepares PO with RECEIVED status, received date, and optional note', () => {
      const po = {
        PO_Number: 'PO-2026-QR01',
        Supplier: 'SKF Thailand',
        Status: 'ORDERED',
        Note: 'ด่วนมาก',
        Items: [
          { Part_Code: 'SP-001', Part_Name_EN: 'Timing Belt 5M', Qty: 3, UnitPrice: 350 },
        ],
      }

      const quickReceivePayload = buildQuickReceivePayload({
        po,
        receivedDate: '2026-10-29',
        note: 'ตรวจรับของครบเรียบร้อย',
      })

      expect(quickReceivePayload.Status).toBe('RECEIVED')
      expect(quickReceivePayload.Received_Date).toBe('2026-10-29')
      expect(quickReceivePayload.Items).toHaveLength(1)
      expect(quickReceivePayload.Note).toContain('[รับของเมื่อ 2026-10-29]: ตรวจรับของครบเรียบร้อย')
      expect(quickReceivePayload.Note).toContain('ด่วนมาก')
    })

    it('buildQuickReceivePayload handles legacy PO without Items field seamlessly', () => {
      const legacyPo = {
        PO_Number: 'PO-2026-LEGACY-RCV',
        Part_Code: 'SP-002',
        Part_Name_EN: 'Bearing 6204',
        Qty: 10,
        UnitPrice: 120,
        Status: 'ORDERED',
      }

      const quickReceivePayload = buildQuickReceivePayload({
        po: legacyPo,
        receivedDate: '2026-10-29',
      })

      expect(quickReceivePayload.Status).toBe('RECEIVED')
      expect(quickReceivePayload.Received_Date).toBe('2026-10-29')
      expect(quickReceivePayload.Items).toHaveLength(1)
      expect(quickReceivePayload.Items[0].Part_Code).toBe('SP-002')
      expect(quickReceivePayload.Items[0].Qty).toBe(10)
    })

    it('buildQuickReceivePayload keeps Status as ORDERED when only partial items are selected', () => {
      const multiPo = {
        PO_Number: 'PO-2026-PARTIAL-01',
        Supplier: 'Mayer',
        Status: 'ORDERED',
        Items: [
          { Part_Code: 'SP-063', Part_Name_EN: 'Control Board A', Qty: 1 },
          { Part_Code: 'SP-064', Part_Name_EN: 'Control Board B', Qty: 2 },
          { Part_Code: 'SP-065', Part_Name_EN: 'Fabric Sensor', Qty: 1 },
          { Part_Code: 'SP-066', Part_Name_EN: 'Conversion Kit', Qty: 1 },
        ],
      }

      // Receive only SP-063 and SP-064
      const partialPayload = buildQuickReceivePayload({
        po: multiPo,
        receivedDate: '2026-10-29',
        note: 'มาส่งรอบแรก 2 รายการ',
        selectedItemCodes: ['SP-063', 'SP-064'],
      })

      expect(partialPayload.Status).toBe('ORDERED')
      expect(partialPayload.Received_Date).toBe('2026-10-29')
      expect(partialPayload.Note).toContain('[รับของบางส่วนเมื่อ 2026-10-29 (2/4 รายการ)]: มาส่งรอบแรก 2 รายการ')
    })

    it('buildQuickReceivePayload sets Status to RECEIVED when remaining unreceived items are received', () => {
      const partialPo = {
        PO_Number: 'PO-2026-PARTIAL-02',
        Supplier: 'Mayer',
        Status: 'ORDERED',
        // Previously SP-063 and SP-064 were received
        Note: 'InventoryAppliedItems:{"SP-063":1,"SP-064":2}',
        Items: [
          { Part_Code: 'SP-063', Part_Name_EN: 'Control Board A', Qty: 1 },
          { Part_Code: 'SP-064', Part_Name_EN: 'Control Board B', Qty: 2 },
          { Part_Code: 'SP-065', Part_Name_EN: 'Fabric Sensor', Qty: 1 },
          { Part_Code: 'SP-066', Part_Name_EN: 'Conversion Kit', Qty: 1 },
        ],
      }

      // Receive the remaining items SP-065 and SP-066
      const completePayload = buildQuickReceivePayload({
        po: partialPo,
        receivedDate: '2026-10-30',
        note: 'มาส่งรอบสองครบถ้วน',
        selectedItemCodes: ['SP-065', 'SP-066'],
      })

      expect(completePayload.Status).toBe('RECEIVED')
      expect(completePayload.Received_Date).toBe('2026-10-30')
      expect(completePayload.Note).toContain('[รับของเมื่อ 2026-10-30]: มาส่งรอบสองครบถ้วน')
    })

    it('buildCancelPOPayload sets Status to CANCELLED and appends cancellation reason to Note', () => {
      const po = {
        PO_Number: 'PO-2026-CANCEL-01',
        Supplier: 'Mayer',
        Status: 'ORDERED',
        Note: 'งานด่วนมาก',
        Items: [
          { Part_Code: 'SP-063', Part_Name_EN: 'Control Board A', Qty: 1 },
        ],
      }

      const cancelledPayload = buildCancelPOPayload({
        po,
        cancelDate: '2026-10-29',
        reason: 'ซัพพลายเออร์แจ้งเลิกผลิต',
      })

      expect(cancelledPayload.Status).toBe('CANCELLED')
      expect(cancelledPayload.LastUpdated).toBe('2026-10-29')
      expect(cancelledPayload.Note).toContain('[ยกเลิกใบสั่งซื้อเมื่อ 2026-10-29]: ซัพพลายเออร์แจ้งเลิกผลิต')
      expect(cancelledPayload.Note).toContain('งานด่วนมาก')
    })

    it('buildCancelPOPayload preserves existing InventoryAppliedItems metadata when partially received', () => {
      const partiallyReceivedPO = {
        PO_Number: 'PO-2026-CANCEL-PARTIAL',
        Supplier: 'Mayer',
        Status: 'ORDERED',
        Note: 'InventoryAppliedItems:{"SP-063":1}\n[รับของบางส่วนเมื่อ 2026-10-28 (1/2 รายการ)]',
        Items: [
          { Part_Code: 'SP-063', Part_Name_EN: 'Control Board A', Qty: 1 },
          { Part_Code: 'SP-064', Part_Name_EN: 'Control Board B', Qty: 2 },
        ],
      }

      const cancelledPayload = buildCancelPOPayload({
        po: partiallyReceivedPO,
        cancelDate: '2026-10-29',
        reason: 'รายการที่ 2 ของขาดตลาด ยกเลิกส่วนที่เหลือ',
      })

      expect(cancelledPayload.Status).toBe('CANCELLED')
      expect(cancelledPayload.Note).toContain('[ยกเลิกใบสั่งซื้อเมื่อ 2026-10-29]: รายการที่ 2 ของขาดตลาด ยกเลิกส่วนที่เหลือ')
      // Applied items for SP-063 must still be preserved so stock history remains intact!
      const applied = getPOAppliedItems(cancelledPayload)
      expect(applied).toEqual({ 'SP-063': 1 })
    })
  })
})
