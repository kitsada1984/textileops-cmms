// Shared report section heading: accent rail + 16px bold primary title.
// Used by section groups, data tables, charts, and remarks so the print
// hierarchy stays in one place instead of four copied flex rows.
import { REPORT_COLORS } from './reportTheme'

export function PdfSectionHeading({ title, accent = REPORT_COLORS.accent, className = '' }) {
  if (!title) return null
  return (
    <div
      className={`flex items-center gap-2 ${className}`.trim()}
      style={{ color: REPORT_COLORS.primary, breakAfter: 'avoid' }}
    >
      <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      <span className="text-[16px] font-bold">{title}</span>
    </div>
  )
}
