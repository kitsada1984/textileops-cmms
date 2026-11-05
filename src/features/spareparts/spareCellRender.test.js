import { describe, it, expect } from 'vitest'
import { resolveSpareCellValue, countSamePartCode } from './spareCellRender'

// Characterization: lock cell value resolution + duplicate-code counting
// before extracting them out of the render arrow (no logic change).

describe('spareCellRender characterization', () => {
  it('resolves image, name, status, and raw fields', () => {
    const row = { Part_Code: 'SP-1', ImageUrl: 'http://img', Part_Name_EN: 'Needle', Status: 'IN_STOCK' }
    const deps = {
      getSparePartImageUrl: (r) => r.ImageUrl,
      getSparePartName: (r) => r.Part_Name_EN,
      getSparePartStatus: (r) => r.Status,
    }

    expect(resolveSpareCellValue(row, { field: 'ImageUrl' }, deps)).toBe('http://img')
    expect(resolveSpareCellValue(row, { field: 'Part_Name_EN' }, deps)).toBe('Needle')
    expect(resolveSpareCellValue(row, { field: 'Status' }, deps)).toBe('IN_STOCK')
    expect(resolveSpareCellValue(row, { field: 'Part_Code' }, deps)).toBe('SP-1')
  })

  it('counts duplicate part codes case-insensitively', () => {
    const data = [
      { Part_Code: 'SP-001' },
      { Part_Code: ' sp-001 ' },
      { Part_Code: 'SP-002' },
    ]

    expect(countSamePartCode(data, 'SP-001')).toBe(2)
    expect(countSamePartCode(data, 'SP-002')).toBe(1)
  })
})
