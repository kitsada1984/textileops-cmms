import { ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { REPORT_COLORS, REPORT_FONTS } from './reportTheme'

// Signatures + verification moved from PdfPreviewModal. Minimal treatment:
// light cards, thin separators, compact QR line that wraps on narrow screens.
export function PdfSignatures({ signatories, isExcluded, qrValue, docNo, currentDateStr }) {
  return (
    <div
      className={`mt-5 pt-4 space-y-3 ${isExcluded('sign') ? 'hidden' : ''}`}
      style={{ borderTop: `1px solid ${REPORT_COLORS.line}`, fontFamily: REPORT_FONTS.family, breakInside: 'avoid' }}
    >
      {/* Standard signatures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {signatories.map((sig, sIdx) => (
          <div
            key={sIdx}
            className="rounded-xl p-2.5 flex flex-col justify-between text-center min-h-[78px]"
            style={{ backgroundColor: REPORT_COLORS.zebra }}
          >
            <div className="text-[10px] font-bold pb-1" style={{ color: REPORT_COLORS.muted }}>
              {sig.title}
            </div>
            <div className="my-auto py-2">
              <div className="w-3/4 mx-auto mb-1.5" style={{ borderBottom: `1px dashed ${REPORT_COLORS.line}` }} />
              <div className="text-[11.5px] font-bold truncate" style={{ color: REPORT_COLORS.ink }}>
                {sig.name || '...........................................'}
              </div>
            </div>
            <div className="text-[10px] font-medium" style={{ color: REPORT_COLORS.muted }}>
              วันที่: <span className="font-semibold">{sig.date || '....../....../......'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Verification line */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 text-[10px]"
        style={{ borderTop: `1px solid ${REPORT_COLORS.line}`, color: REPORT_COLORS.muted }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-white rounded-md" style={{ border: `1px solid ${REPORT_COLORS.line}` }}>
            <QRCodeSVG value={qrValue} size={32} />
          </div>
          <div>
            <div className="font-bold flex items-center gap-1" style={{ color: REPORT_COLORS.primary }}>
              <ShieldCheck size={11} className="text-emerald-600" />
              <span>TEXTILEOPS CMMS VERIFIED DOCUMENT</span>
            </div>
            <div style={{ fontSize: 10 }}>สแกน QR เพื่อตรวจสอบความถูกต้องของข้อมูลผ่านระบบออนไลน์</div>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="font-semibold">เอกสารควบคุมภายใน · บริษัท เจมม่า นิตติ้ง จำกัด</div>
          <div className="font-mono" style={{ fontSize: 10 }}>
            DOC-REF: {docNo || 'N/A'} · GEN: {currentDateStr}
          </div>
        </div>
      </div>
    </div>
  )
}
