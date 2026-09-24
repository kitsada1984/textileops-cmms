import { describe, it, expect } from 'vitest'
import { formatNeedleStockFileName } from './needleStockUtils'

describe('formatNeedleStockFileName', () => {
  it('formats needle stock file name with correct prefix, setId, action, timestamp, and extension', () => {
    const fixedDate = new Date(2026, 8, 24, 10, 15, 30) // 2026-09-24 10:15:30
    const name = formatNeedleStockFileName('NS-0002', 'OUT', 'camera_capture.jpg', fixedDate)
    expect(name).toBe('Stockเข็ม_NS-0002_OUT_20260924_101530.jpg')
  })

  it('handles NEW action for new needle set', () => {
    const fixedDate = new Date(2026, 8, 24, 9, 30, 0)
    const name = formatNeedleStockFileName('NS-0005', 'NEW', 'photo.png', fixedDate)
    expect(name).toBe('Stockเข็ม_NS-0005_NEW_20260924_093000.png')
  })

  it('handles GRADE action for grading update', () => {
    const fixedDate = new Date(2026, 8, 24, 14, 5, 9)
    const name = formatNeedleStockFileName('NS-0001', 'GRADE', 'inspection.jpeg', fixedDate)
    expect(name).toBe('Stockเข็ม_NS-0001_GRADE_20260924_140509.jpeg')
  })

  it('defaults to jpg when file has no extension or is a blob', () => {
    const fixedDate = new Date(2026, 8, 24, 12, 0, 0)
    const name = formatNeedleStockFileName('NS-0003', 'IN', 'blob', fixedDate)
    expect(name).toBe('Stockเข็ม_NS-0003_IN_20260924_120000.jpg')
  })

  it('handles missing or empty setId gracefully', () => {
    const fixedDate = new Date(2026, 8, 24, 12, 0, 0)
    const name = formatNeedleStockFileName('', 'ADJUST', 'broken_needle.JPG', fixedDate)
    expect(name).toBe('Stockเข็ม_NS-UNKNOWN_ADJUST_20260924_120000.jpg')
  })
})
