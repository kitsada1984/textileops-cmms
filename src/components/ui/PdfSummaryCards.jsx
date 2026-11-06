// Summary stat cards row for print reports (opt-in via `summary` prop).
// Key numbers render large; `highlight` items get the accent treatment.
import { REPORT_COLORS, REPORT_FONTS } from './reportTheme'

export function PdfSummaryCards({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border bg-white p-3 text-center"
          style={{
            borderColor: item.highlight ? REPORT_COLORS.accent : REPORT_COLORS.line,
            borderWidth: item.highlight ? 2 : 1,
            fontFamily: REPORT_FONTS.family,
          }}
        >
          <div className="font-extrabold" style={{ color: item.highlight ? REPORT_COLORS.accent : REPORT_COLORS.primary, fontSize: 22 }}>
            {item.value}
          </div>
          <div className="font-semibold mt-0.5" style={{ color: REPORT_COLORS.muted, fontSize: REPORT_FONTS.body }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  )
}
