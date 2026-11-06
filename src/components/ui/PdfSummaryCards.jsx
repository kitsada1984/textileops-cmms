// Summary stat cards row for print reports (opt-in via `summary` prop).
// Key numbers render large; `highlight` items get the accent treatment.
// `trend` accepts a signed number, a percent string, or 'up' | 'down' | 'flat'.
import { REPORT_COLORS, REPORT_FONTS } from './reportTheme'

function resolveTrend(trend) {
  if (trend === undefined || trend === null || trend === '') return null
  if (typeof trend === 'number') {
    if (!Number.isFinite(trend)) return null
    if (trend === 0) return { dir: 'flat', text: '0%' }
    return { dir: trend > 0 ? 'up' : 'down', text: `${Math.abs(trend)}%` }
  }
  const raw = String(trend).trim()
  const key = raw.toLowerCase()
  if (key === 'up' || key === 'down' || key === 'flat') return { dir: key, text: '' }
  return { dir: raw.startsWith('-') ? 'down' : 'up', text: raw.replace(/^\+/, '') }
}

const TREND_STYLES = {
  up: { arrow: '▲', color: '#047857' },
  down: { arrow: '▼', color: '#b91c1c' },
  flat: { arrow: '–', color: REPORT_COLORS.muted },
}

export function PdfSummaryCards({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const cols = items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
  return (
    <div className={`grid grid-cols-2 ${cols} gap-3 mt-3`} style={{ breakInside: 'avoid' }}>
      {items.map((item, i) => {
        const trend = resolveTrend(item.trend)
        const trendStyle = trend ? TREND_STYLES[trend.dir] : null
        return (
          <div
            key={i}
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: item.highlight ? '#fffaeb' : REPORT_COLORS.zebra,
              border: item.highlight ? `1px solid ${REPORT_COLORS.accent}` : `1px solid ${REPORT_COLORS.line}`,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              fontFamily: REPORT_FONTS.family,
              breakInside: 'avoid',
            }}
          >
            <div className="flex items-baseline justify-center gap-1">
              <span
                className="font-extrabold"
                style={{
                  color: item.highlight ? REPORT_COLORS.accent : REPORT_COLORS.primary,
                  fontSize: 28,
                  lineHeight: 1.15,
                }}
              >
                {item.value}
              </span>
              {item.unit && (
                <span className="font-bold" style={{ color: REPORT_COLORS.muted, fontSize: 11 }}>
                  {item.unit}
                </span>
              )}
            </div>

            {trendStyle && (
              <div
                className="inline-flex items-center gap-1 mt-1 font-bold"
                style={{ color: trendStyle.color, fontSize: 10.5 }}
              >
                <span>{trendStyle.arrow}</span>
                {trend.text && <span>{trend.text}</span>}
              </div>
            )}

            <div className="font-semibold mt-1" style={{ color: REPORT_COLORS.muted, fontSize: REPORT_FONTS.body }}>
              {item.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
