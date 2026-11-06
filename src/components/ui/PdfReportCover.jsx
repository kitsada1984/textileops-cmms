// Cover page for Thai professional print reports (opt-in via `cover` prop).
// First A4 page: accent rail, logo, title, period, organization, document meta.
import gemmaLogo from '../../assets/logo-gemma.png'
import { REPORT_COLORS, REPORT_FONTS } from './reportTheme'

export function PdfReportCover({ cover, currentDateStr }) {
  if (!cover) return null
  const title = cover.title || 'ชื่อรายงาน'
  const organization = cover.organization || 'บริษัท เจมม่า นิตติ้ง จำกัด (Gemma Knits (Thailand) Co., Ltd.)'
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center"
      style={{
        minHeight: '240mm',
        pageBreakAfter: 'always',
        fontFamily: REPORT_FONTS.family,
        padding: '4mm 0',
      }}
    >
      {/* Accent rail */}
      <div
        className="absolute top-0 left-0 right-0 rounded-full"
        style={{ height: 6, background: REPORT_COLORS.accent }}
      />

      {cover.logo === undefined || cover.logo ? (
        <img
          src={cover.logo || gemmaLogo}
          alt="logo"
          style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 26 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : null}

      <div
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
        style={{ color: REPORT_COLORS.muted }}
      >
        {organization}
      </div>

      <h1
        className="font-extrabold max-w-[150mm]"
        style={{
          color: REPORT_COLORS.primary,
          fontSize: 28,
          lineHeight: 1.35,
          breakAfter: 'avoid',
        }}
      >
        {title}
      </h1>

      {cover.subtitle && (
        <p
          className="mt-3 font-semibold max-w-[150mm]"
          style={{ color: REPORT_COLORS.muted, fontSize: REPORT_FONTS.heading }}
        >
          {cover.subtitle}
        </p>
      )}

      {cover.period && (
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold"
          style={{ backgroundColor: '#fff7e0', color: REPORT_COLORS.primary, fontSize: REPORT_FONTS.body }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REPORT_COLORS.accent }} />
          <span>ช่วงเวลา: {cover.period}</span>
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-10 w-full max-w-[420px] text-left rounded-xl p-5"
        style={{ fontSize: REPORT_FONTS.body, backgroundColor: REPORT_COLORS.zebra }}
      >
        {cover.docNo && (
          <>
            <span style={{ color: REPORT_COLORS.muted }}>เลขที่เอกสาร</span>
            <b className="text-right" style={{ color: REPORT_COLORS.ink }}>{cover.docNo}</b>
          </>
        )}
        {cover.department && (
          <>
            <span style={{ color: REPORT_COLORS.muted }}>หน่วยงาน</span>
            <b className="text-right" style={{ color: REPORT_COLORS.ink }}>{cover.department}</b>
          </>
        )}
        <span style={{ color: REPORT_COLORS.muted }}>วันที่ออกรายงาน</span>
        <b className="text-right" style={{ color: REPORT_COLORS.ink }}>{cover.date || currentDateStr}</b>
      </div>

      <div className="w-full max-w-[420px] flex items-center justify-center gap-2 mt-12">
        <span className="h-px flex-1" style={{ backgroundColor: REPORT_COLORS.line }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: REPORT_COLORS.muted }}>
          TextileOps CMMS
        </span>
        <span className="h-px flex-1" style={{ backgroundColor: REPORT_COLORS.line }} />
      </div>
    </div>
  )
}
