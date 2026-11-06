import gemmaLogo from '../../assets/logo-gemma.png'
import { format } from 'date-fns'
import { REPORT_COLORS } from './reportTheme'

// Minimal professional header (report design spec): one brand line,
// document title, code chip, and a thin meta row. Stacks on narrow screens.
export function PdfDocHeader({ theme, title, docNo, formattedDocDate, status, statusCfg, priority, currentDateStr }) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 mb-3" style={{ borderBottom: `1px solid ${REPORT_COLORS.line}`, breakAfter: 'avoid' }}>
        <div className="flex items-center gap-3 min-w-0">
          <img src={gemmaLogo} alt="Gemma Knits Logo" className="w-11 h-11 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[13px] font-extrabold tracking-tight leading-tight" style={{ color: REPORT_COLORS.primary }}>
              บริษัท เจมม่า นิตติ้ง จำกัด
            </h1>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: REPORT_COLORS.muted }}>
              Gemma Knits (Thailand) Co., Ltd. · TextileOps CMMS
            </p>
          </div>
        </div>

        <div className="sm:text-right shrink-0">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wide mb-1 max-w-full"
            style={{ backgroundColor: REPORT_COLORS.accent, color: REPORT_COLORS.primary }}
          >
            <span>{theme.icon}</span>
            <span>{title}</span>
          </div>
          <div className="text-[10.5px] font-mono font-bold" style={{ color: REPORT_COLORS.ink }}>
            {docNo || 'DOC-' + format(new Date(), 'yyyyMMdd')}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: REPORT_COLORS.muted }}>
            วันที่เอกสาร: {formattedDocDate}
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 mb-3 text-[10.5px]"
        style={{ backgroundColor: REPORT_COLORS.zebra, color: REPORT_COLORS.ink, breakAfter: 'avoid' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {status && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
              {status}
            </span>
          )}
          {priority && (
            <span className="font-semibold" style={{ color: REPORT_COLORS.muted }}>
              ข้อมูลจำเพาะ / ตำแหน่ง: <b style={{ color: REPORT_COLORS.ink }}>{priority}</b>
            </span>
          )}
          <span className="px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: '#ffffff', color: REPORT_COLORS.muted, border: `1px solid ${REPORT_COLORS.line}` }}>
            {theme.code}
          </span>
        </div>
        <div className="font-medium" style={{ color: REPORT_COLORS.muted }}>
          พิมพ์เมื่อ: <span className="font-mono font-bold" style={{ color: REPORT_COLORS.ink }}>{currentDateStr}</span>
        </div>
      </div>
    </>
  )
}
