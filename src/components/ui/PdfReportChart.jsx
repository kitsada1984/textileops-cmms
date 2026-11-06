// Inline SVG bar chart for print reports (opt-in via `chart` prop).
// Pure SVG prints crisply (no canvas); `type: 'auto'` resolves to bars.
import { REPORT_COLORS, REPORT_CHART_COLORS, REPORT_FONTS, layoutBarChart } from './reportTheme'
import { PdfSectionHeading } from './PdfSectionHeading'

export function PdfReportChart({ chart }) {
  if (!chart || !Array.isArray(chart.data) || chart.data.length === 0) return null
  const layout = layoutBarChart(chart.data)
  const colors = Array.isArray(chart.colors) && chart.colors.length > 0 ? chart.colors : REPORT_CHART_COLORS
  const labelW = 150
  return (
    <div className="mt-4 chart" style={{ breakInside: 'avoid' }}>
      {chart.title && (
        <PdfSectionHeading title={chart.title} accent={colors[1]} className="mb-2" />
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={chart.title || 'chart'}
        style={{ fontFamily: REPORT_FONTS.family }}
      >
        {layout.bars.map((bar, i) => (
          <g key={i} transform={`translate(0, ${i * layout.rowH + 4})`}>
            <text x={0} y={13} fontSize={11} fill={REPORT_COLORS.primary} fontWeight={700}>
              {bar.label.length > 22 ? `${bar.label.slice(0, 22)}…` : bar.label}
            </text>
            <rect
              x={labelW}
              y={2}
              width={bar.w}
              height={16}
              rx={4}
              fill={colors[i % colors.length]}
            />
            <text x={labelW + bar.w + 6} y={14} fontSize={11} fill={REPORT_COLORS.primary} fontWeight={700}>
              {bar.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Re-export for callers that only need the color cycle.
export { REPORT_CHART_COLORS }
