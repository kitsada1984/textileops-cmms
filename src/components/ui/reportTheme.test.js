import { describe, it, expect } from 'vitest'
import {
  REPORT_COLORS,
  REPORT_FONTS,
  REPORT_PAGE,
  buildReportFilename,
  layoutBarChart,
} from './reportTheme'

// Locks the shared report theme tokens (format_report_pdf spec).
describe('reportTheme', () => {
  it('holds the approved palette and type scale', () => {
    expect(REPORT_COLORS.primary).toBe('#1F3A5F')
    expect(REPORT_COLORS.accent).toBe('#F2A900')
    expect(REPORT_FONTS.title).toBe(24)
    expect(REPORT_FONTS.heading).toBe(16)
    expect(REPORT_FONTS.body).toBe(11)
    expect(REPORT_FONTS.family).toContain('Sarabun')
    expect(REPORT_PAGE.size).toBe('A4')
    expect(REPORT_PAGE.marginMm).toBe(20)
  })

  it('builds the spec filename', () => {
    expect(buildReportFilename(new Date(2026, 10, 6))).toBe('report_2026-11-06.pdf')
    expect(buildReportFilename()).toMatch(/^report_\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('lays out bars proportionally', () => {
    const layout = layoutBarChart(
      [{ label: 'A', value: 10 }, { label: 'B', value: 5 }, { label: 'C', value: 0 }],
      560, 26, 380
    )

    expect(layout.bars[0].w).toBe(380)
    expect(layout.bars[1].w).toBe(190)
    expect(layout.bars[2].w).toBe(2)
    expect(layout.height).toBeGreaterThan(0)
  })

  it('handles empty data', () => {
    expect(layoutBarChart([]).bars).toEqual([])
  })
})
