import gemmaLogo from '../../assets/logo-gemma.png'
import { format } from 'date-fns'

// Document header moved verbatim from PdfPreviewModal (props only).
export function PdfDocHeader({ theme, title, docNo, formattedDocDate, status, statusCfg, priority, currentDateStr }) {
  return (
    <>
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5 gap-4">
              {/* Company Logo & Identity */}
              <div className="flex items-center gap-3.5">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="w-13 h-13 object-contain drop-shadow-xs"
                />
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-950 uppercase leading-tight">
                    บริษัท เจมม่า นิตติ้ง จำกัด (Gemma Knits (Thailand)Co., Ltd.)
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 tracking-wide uppercase mt-0.5">
                    TEXTILE OPERATIONS CMMS · MAINTENANCE & ENGINEERING
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    ระบบบริหารจัดการงานบำรุงรักษาและควบคุมการผลิตสิ่งทอ
                  </p>
                </div>
              </div>

              {/* Document Type Badge & Identification */}
              <div className="text-right">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-white rounded-md text-xs font-black tracking-wider uppercase mb-1.5 shadow-xs"
                  style={{ backgroundColor: theme.accent }}
                >
                  <span>{theme.icon}</span>
                  <span>{title}</span>
                </div>
                <div className="text-[11.5px] font-mono text-slate-800 flex items-center justify-end gap-1">
                  <span className="text-slate-500 font-sans text-[10.5px]">เลขที่เอกสาร:</span>
                  <strong className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-bold border border-slate-200">
                    {docNo || 'DOC-' + format(new Date(), 'yyyyMMdd')}
                  </strong>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  วันที่เอกสาร: <span className="font-semibold text-slate-700">{formattedDocDate}</span>
                </div>
              </div>
            </div>

            {/* ── STATUS & METADATA BAR ── */}
            <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 mb-5 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Status Badge */}
                {status && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">สถานะ:</span>
                    <span
                      style={{
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.text,
                        borderColor: statusCfg.border,
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-[11px] border"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
                      <span>{status}</span>
                    </span>
                  </div>
                )}

                {/* Priority / Extra Tag */}
                {priority && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">ข้อมูลจำเพาะ / ตำแหน่ง:</span>
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-200/80 text-slate-800 border border-slate-300">
                      {priority}
                    </span>
                  </div>
                )}

                {/* Doc Code Tag */}
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                  {theme.code}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 font-medium">
                พิมพ์เมื่อ: <span className="font-mono text-slate-700 font-bold">{currentDateStr}</span>
              </div>
            </div>
    </>
  )
}
