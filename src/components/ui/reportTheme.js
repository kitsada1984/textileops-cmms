// Shared Thai professional report theme (format_report_pdf spec).
// Single source for print-report tokens: colors, Sarabun type scale,
// A4 geometry, table/chart defaults, and the report_{date}.pdf filename.
export const REPORT_COLORS = {
  primary: '#1F3A5F',
  accent: '#F2A900',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  zebra: '#f8fafc',
  white: '#ffffff',
}

export const REPORT_FONTS = {
  family: "'Sarabun','Noto Sans Thai','Segoe UI',Tahoma,sans-serif",
  title: 24,
  heading: 16,
  body: 11,
}

export const REPORT_PAGE = {
  size: 'A4',
  marginMm: 20,
  widthMm: 210,
  heightMm: 297,
}

export const REPORT_TABLE = {
  headerFill: REPORT_COLORS.primary,
  headerText: '#ffffff',
  zebraFill: REPORT_COLORS.zebra,
  border: 'thin',
}

export const REPORT_CHART_COLORS = [REPORT_COLORS.primary, REPORT_COLORS.accent]

export function formatReportDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Spec filename: report_{date}.pdf
export function buildReportFilename(date = new Date()) {
  return `report_${formatReportDate(date)}.pdf`
}

// Pure bar-layout math for the SVG chart (kept testable outside JSX).
export function layoutBarChart(data = [], width = 560, rowH = 26, maxBarW = 380) {
  const rows = (Array.isArray(data) ? data : []).map((d) => ({
    label: String(d?.label ?? ''),
    value: Number(d?.value) || 0,
  }))
  const max = Math.max(1, ...rows.map((r) => r.value))
  return {
    width,
    height: Math.max(rows.length * rowH + 8, 34),
    rowH,
    maxBarW,
    bars: rows.map((r) => ({ ...r, w: Math.max(2, Math.round((r.value / max) * maxBarW)) })),
  }
}
