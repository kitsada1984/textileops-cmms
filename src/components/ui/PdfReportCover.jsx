// Cover page for Thai professional print reports (opt-in via `cover` prop).
// First A4 page: logo, report title, document meta, accent bar.
import { REPORT_COLORS, REPORT_FONTS } from './reportTheme'

export function PdfReportCover({ cover, currentDateStr }) {
  if (!cover) return null
  const title = cover.title || 'ชื่อรายงาน'
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '247mm', pageBreakAfter: 'always', fontFamily: REPORT_FONTS.family }}
    >
      <div className="w-full h-2 rounded-full mb-10" style={{ background: REPORT_COLORS.accent }} />
      {cover.logo === undefined || cover.logo ? (
        <img
          src={cover.logo || '/logo-gemma.png'}
          alt="logo"
          style={{ width: 96, height: 96, objectFit: 'contain', marginBottom: 24 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
      <h1
        className="font-extrabold"
        style={{ color: REPORT_COLORS.primary, fontSize: REPORT_FONTS.title, lineHeight: 1.4 }}
      >
        {title}
      </h1>
      {cover.subtitle && (
        <p className="mt-2 font-semibold" style={{ color: REPORT_COLORS.muted, fontSize: REPORT_FONTS.heading - 2 }}>
          {cover.subtitle}
        </p>
      )}
      <div
        className="grid grid-cols-2 gap-2 mt-10 w-full max-w-[420px] text-left"
        style={{ fontSize: REPORT_FONTS.body }}
      >
        {cover.docNo && (
          <>
            <span style={{ color: REPORT_COLORS.muted }}>เลขที่เอกสาร</span>
            <b style={{ color: REPORT_COLORS.ink }}>{cover.docNo}</b>
          </>
        )}
        <span style={{ color: REPORT_COLORS.muted }}>วันที่ออกรายงาน</span>
        <b style={{ color: REPORT_COLORS.ink }}>{cover.date || currentDateStr}</b>
      </div>
      <div className="w-full h-2 rounded-full mt-10" style={{ background: REPORT_COLORS.primary }} />
    </div>
  )
}
