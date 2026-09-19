import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  computeKnittingNeedles,
  computeKnittingNeedleType,
  safeFormatDate,
  normalizeImagesList,
  generateMachinePdfProps,
  generateCylinderPdfProps,
  generateWorkOrderPdfProps,
  generateRepairRequestPdfProps,
  generateCenterCheckPdfProps,
  generateNeedleConditionPdfProps,
  generateSparePartPdfProps,
  generatePurchasingPdfProps,
  resolveDocumentContext,
  getCachedTable,
} from './index'

describe('Document Generation Deep Module', () => {
  describe('Mathematical & Domain Lookup Calculations', () => {
    it('computeKnittingNeedles returns standard OEM matrix needle counts', () => {
      expect(computeKnittingNeedles(30, 28)).toBe(2640)
      expect(computeKnittingNeedles('34"', '28G')).toBe(2988)
      expect(computeKnittingNeedles(30, 24)).toBe(2256)
      expect(computeKnittingNeedles(34, 20)).toBe(2136)
      expect(computeKnittingNeedles(38, 28)).toBe(3344)
    })

    it('computeKnittingNeedles falls back to 12-feeder formula for custom diameter/gauge', () => {
      // 20" dia, 22 gauge: (PI * 20 * 22 / 12) * 12 = round(115.19) * 12 = 115 * 12 = 1380
      const calc = computeKnittingNeedles(20, 22)
      expect(calc).toBeGreaterThan(1300)
      expect(calc % 12).toBe(0) // Aligned to 12 feeders
    })

    it('computeKnittingNeedles returns null for invalid or missing inputs', () => {
      expect(computeKnittingNeedles(null, 28)).toBeNull()
      expect(computeKnittingNeedles(30, 0)).toBeNull()
      expect(computeKnittingNeedles('', '')).toBeNull()
    })

    it('computeKnittingNeedleType returns accurate needle model per machine maker and type', () => {
      expect(computeKnittingNeedleType('Mayer & Cie', 'Single', 28)).toContain('Mayer Relanit 28G')
      expect(computeKnittingNeedleType('Mayer', 'Jacquard', 28)).toContain('Mayer Jacquard 28G')
      expect(computeKnittingNeedleType('Mayer', 'Interlock Double', 24)).toContain('G02 (24G)')
      expect(computeKnittingNeedleType('Terrot', 'Single', 28)).toContain('Terrot (28G High-Speed)')
      expect(computeKnittingNeedleType('Pailung', 'Single', 28)).toContain('Pailung (28G Standard)')
      expect(computeKnittingNeedleType('Fukuhara', 'Single', 28)).toContain('Vo-Fukuhara Spec (28G)')
      expect(computeKnittingNeedleType('Unknown', 'Single', 28)).toContain('Groz-Beckert Standard (28G Knitting Needle)')
    })
  })

  describe('Formatters & Image Normalizers', () => {
    it('safeFormatDate handles valid, null, and invalid dates safely', () => {
      expect(safeFormatDate('2026-05-15T10:30:00Z', 'dd/MM/yyyy')).toBe('15/05/2026')
      expect(safeFormatDate(null)).toBe('—')
      expect(safeFormatDate(undefined)).toBe('—')
      expect(safeFormatDate('invalid-date')).toBe('—')
    })

    it('normalizeImagesList handles string URLs and structured image objects', () => {
      const urls = ['https://example.com/1.jpg', 'https://example.com/2.jpg']
      const normalized = normalizeImagesList(urls, 'Test Photo')
      expect(normalized).toHaveLength(2)
      expect(normalized[0]).toEqual({ url: 'https://example.com/1.jpg', caption: 'Test Photo #1' })
      expect(normalized[1]).toEqual({ url: 'https://example.com/2.jpg', caption: 'Test Photo #2' })

      const objects = [{ url: 'https://example.com/item.png', caption: 'Custom Item' }]
      expect(normalizeImagesList(objects)).toEqual([
        { url: 'https://example.com/item.png', caption: 'Custom Item' },
      ])

      expect(normalizeImagesList(null)).toEqual([])
      expect(normalizeImagesList([])).toEqual([])
    })
  })

  describe('Pure Document Projections with Explicit Context', () => {
    it('generateMachinePdfProps resolves linked cylinder and inspection deterministically without localStorage', () => {
      const mockMachine = {
        id: 'mc-1',
        Mc: 'MC-01',
        Diameter: 30,
        Gauge: 28,
        Location: 'โรงทอ 1',
        Status: 'ปกติ',
        Remark: 'ImageUrl: https://img.com/mc.jpg\nTape5: T-505',
      }

      const mockCylinders = [
        { Serial_NOW: 'CYL-99', NewMC: 'MC-01', Standard: 'Standard 28G' },
      ]

      const mockCenterChecks = [
        { mc: 'MC-01', doc_date: '2026-04-10T08:00:00Z' },
      ]

      const result = generateMachinePdfProps(mockMachine, {
        cylinders: mockCylinders,
        centerChecks: mockCenterChecks,
        needleConditions: [],
      })

      expect(result).not.toBeNull()
      expect(result.docType).toBe('machine')
      expect(result.docNo).toBe('MC-01')
      expect(result.images).toEqual([
        { url: 'https://img.com/mc.jpg', caption: 'รูปถ่ายเครื่องจักร MC-01' },
      ])

      // Check technical section has computed needles and linked cylinder
      const techSection = result.sections.find((s) => s.title.includes('Technical Specifications'))
      expect(techSection).toBeDefined()

      const needleCountField = techSection.fields.find((f) => f.label.includes('Needle Count'))
      expect(needleCountField.value).toBe('2,640 เล่ม')

      const linkedCylField = techSection.fields.find((f) => f.label.includes('กระบอกเข็มที่ติดตั้ง'))
      expect(linkedCylField.value).toContain('Serial: CYL-99')

      const lastInspectionField = techSection.fields.find((f) => f.label.includes('ตรวจเช็คล่าสุด'))
      expect(lastInspectionField.value).toBe('10/04/2026')
    })

    it('generateCylinderPdfProps resolves machine specs and needle type with pure context', () => {
      const mockCylinder = {
        id: 'cyl-10',
        Serial_NOW: 'CYL-2026-01',
        NewMC: 'MC-05',
        Diameter: 34,
        Gauge: 28,
        Location: 'คลังกระบอก',
        Manufacturer: 'Mayer',
        Standard: 'Standard',
      }

      const mockMachines = [
        { Mc: 'MC-05', Feeder: 96, Sinker: 'Vo-Sinker', Oil: 'Klüber 46' },
      ]

      const result = generateCylinderPdfProps(mockCylinder, { machines: mockMachines })

      expect(result).not.toBeNull()
      expect(result.docType).toBe('cylinder')
      expect(result.docNo).toBe('CYL-2026-01')

      const specSection = result.sections.find((s) => s.title.includes('Specifications & Needles'))
      expect(specSection).toBeDefined()

      const needlesField = specSection.fields.find((f) => f.label.includes('Needle Count'))
      expect(needlesField.value).toBe('2,988 เล่ม')

      const feederField = specSection.fields.find((f) => f.label.includes('Feeders'))
      expect(feederField.value).toBe('96 ฟีด')

      const oilField = specSection.fields.find((f) => f.label.includes('น้ำมันเครื่องที่ใช้'))
      expect(oilField.value).toBe('Klüber 46')
    })

    it('generateWorkOrderPdfProps hydrates missing design and KI from repairRequests context', () => {
      const mockWorkOrder = {
        id: 'wo-101',
        WONumber: 'WO-2026-001',
        Job_ID: 'JOB-99',
        MC: 'MC-02',
        JobType: 'REPAIR',
        Technicians: 'สมชาย',
        Problem: 'ร่องเข็มแตก',
        WorkingDurationText: '3.5 ชม.',
      }

      const mockRepairRequests = [
        {
          machine_mc: 'MC-02',
          status: 'APPROVED',
          Design: 'Cotton Rib 2x2',
          KI: 'KI-8877',
          roll_no: '12',
          cylinder_location: 'โรงทอ 2',
        },
      ]

      const result = generateWorkOrderPdfProps(mockWorkOrder, {
        repairRequests: mockRepairRequests,
      })

      expect(result).not.toBeNull()
      expect(result.docType).toBe('workorder')
      expect(result.docNo).toBe('WO-2026-001')

      const detailSection = result.sections.find((s) => s.title.includes('Work Order Details'))
      expect(detailSection.fields.find((f) => f.label.includes('KI')).value).toBe('KI-8877')
      expect(detailSection.fields.find((f) => f.label.includes('Design')).value).toBe('Cotton Rib 2x2')
      expect(detailSection.fields.find((f) => f.label.includes('เลขม้วน')).value).toBe('12')
      expect(detailSection.fields.find((f) => f.label.includes('Location')).value).toBe('โรงทอ 2')
    })

    it('generateRepairRequestPdfProps cleans hidden tags and resolves cylinder specs', () => {
      const mockReq = {
        id: 'req-50',
        request_no: 'REQ-2026-050',
        machine_mc: 'MC-03',
        problem_description: 'เข็มหักบ่อย\nDesign: Single Jersey Basic\nKI: 1234\nRoll: 5\nImageUrl: https://img.com/broken.jpg',
        created_at: '2026-06-01T09:00:00Z',
      }

      const mockCylinders = [
        { NewMC: 'MC-03', Serial_NOW: 'CYL-03-A', Location: 'โรงทอ 3', Standard: 'Standard' },
      ]

      const result = generateRepairRequestPdfProps(mockReq, { cylinders: mockCylinders })

      expect(result).not.toBeNull()
      expect(result.docType).toBe('repair_request')
      expect(result.docNo).toBe('REQ-2026-050')
      expect(result.remarks).toBe('เข็มหักบ่อย') // Cleaned of tags

      const detailsSection = result.sections.find((s) => s.title.includes('Repair Request Details'))
      expect(detailsSection.fields.find((f) => f.label.includes('Cylinder Serial')).value).toBe('CYL-03-A')
      expect(detailsSection.fields.find((f) => f.label.includes('Location')).value).toBe('โรงทอ 3')
      expect(result.images[0].url).toBe('https://img.com/broken.jpg')
    })

    it('generateCenterCheckPdfProps renders checklist items and tableData correctly', () => {
      const mockCheck = {
        id: 'cc-1',
        doc_no: 'CC-2026-001',
        mc: 'MC-01',
        serial: 'CYL-01',
        type: 'Single',
        counter_latest: 150000,
        greasing: true,
        oil_change: false,
        items: [
          { no: 1, item: 'เช็คระดับศูนย์เข็ม', std: '0.02 mm', val_before: '0.05', val_after: '0.02', result: 'ผ่าน' },
        ],
      }

      const result = generateCenterCheckPdfProps(mockCheck, { cylinders: [], machines: [] })
      expect(result).not.toBeNull()
      expect(result.docType).toBe('centercheck')
      expect(result.tableData.rows).toHaveLength(1)
      expect(result.tableData.rows[0][1]).toBe('เช็คระดับศูนย์เข็ม')
      expect(result.tableData.rows[0][5]).toBe('ผ่าน')
    })

    it('generateNeedleConditionPdfProps renders inspection history and status labels', () => {
      const mockNeedle = {
        id: 'ndl-1',
        serial: 'CYL-05',
        machine_mc: 'MC-05',
        status: 'WATCH',
        counter: 250000,
        doc_date: '2026-07-01T10:00:00Z',
      }

      const mockHistory = [
        { doc_date: '2026-06-01', machine_mc: 'MC-05', counter: 200000, status: 'NORMAL', inspector: 'ช่างเอ' },
      ]

      const result = generateNeedleConditionPdfProps(mockNeedle, mockHistory, { cylinders: [] })
      expect(result).not.toBeNull()
      expect(result.docType).toBe('needle')
      expect(result.status).toBe('สึกปานกลาง (Medium Wear)')
      expect(result.tableData.rows).toHaveLength(1)
      expect(result.tableData.rows[0][5]).toBe('สึกเล็กน้อย (Minor Wear)')
    })

    it('generateSparePartPdfProps accurately computes valuations and stock status', () => {
      const normalPart = {
        id: 'sp-1',
        PartNumber: 'BRG-6205',
        PartName: 'ลูกปืนแบริ่ง 6205',
        QuantityOnHand: 20,
        MinStock: 5,
        MaxStock: 50,
        UnitPrice: 150,
      }

      const normalResult = generateSparePartPdfProps(normalPart)
      expect(normalResult.status).toBe('ระดับสต็อกปกติ (Normal)')

      const lowStockPart = {
        ...normalPart,
        QuantityOnHand: 3,
      }
      const lowResult = generateSparePartPdfProps(lowStockPart)
      expect(lowResult.status).toBe('สต็อกต่ำกว่าเกณฑ์ (Low Stock)')

      const outOfStockPart = {
        ...normalPart,
        QuantityOnHand: 0,
      }
      const outResult = generateSparePartPdfProps(outOfStockPart)
      expect(outResult.status).toBe('สินค้าหมดสต็อก (Out of Stock)')
    })

    it('generatePurchasingPdfProps calculates totals and handles null gracefully', () => {
      expect(generatePurchasingPdfProps(null)).toBeNull()

      const pr = {
        id: 'pr-1',
        PRNumber: 'PR-2026-001',
        ItemName: 'เข็ม Groz-Beckert 28G',
        Quantity: 500,
        EstimatedUnitPrice: 12,
      }

      const result = generatePurchasingPdfProps(pr)
      expect(result).not.toBeNull()
      expect(result.docType).toBe('purchasing')
      const itemsSection = result.sections.find((s) => s.title.includes('Requested Items & Costs'))
      const totalField = itemsSection.fields.find((f) => f.label.includes('Total Amount'))
      expect(totalField.value).toBe('6,000 บาท')
    })
  })

  describe('Storage Fallback Seam', () => {
    it('getCachedTable returns empty array if storage is empty or undefined', () => {
      expect(getCachedTable('non_existent_table')).toEqual([])
    })

    it('resolveDocumentContext provides all entity collections', () => {
      const context = resolveDocumentContext('machine', { Mc: 'MC-01' }, {
        machines: [{ Mc: 'MC-01' }],
        cylinders: [{ Serial_NOW: 'C1' }],
      })

      expect(context.machines).toHaveLength(1)
      expect(context.cylinders).toHaveLength(1)
      expect(Array.isArray(context.centerChecks)).toBe(true)
      expect(Array.isArray(context.needleConditions)).toBe(true)
      expect(Array.isArray(context.repairRequests)).toBe(true)
    })
  })
})
