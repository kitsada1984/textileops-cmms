import { ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// Signatures + footer moved verbatim from PdfPreviewModal (props only).
export function PdfSignatures({ signatories, isExcluded, qrValue, docNo, currentDateStr }) {
  return (
          <div className={`mt-8 pt-4 border-t-2 border-slate-900 space-y-5 ${isExcluded('sign') ? 'hidden' : ''}`}>
            {/* 4 Standard Signatures */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              {signatories.map((sig, sIdx) => (
                <div
                  key={sIdx}
                  className="border border-slate-300 rounded-xl p-2.5 flex flex-col justify-between text-center min-h-[96px] bg-slate-50/50 shadow-2xs"
                >
                  <div className="text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200 pb-1">
                    {sig.title}
                  </div>
                  <div className="my-auto py-2">
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {sig.name || '...........................................'}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium">
                    วันที่: <span className="font-semibold">{sig.date || '....../....../......'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── FOOTER & VERIFICATION ── */}
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-white border border-slate-200 rounded-md shadow-2xs">
                  <QRCodeSVG value={qrValue} size={36} />
                </div>
                <div>
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    <span>TEXTILEOPS CMMS VERIFIED DOCUMENT</span>
                  </div>
                  <div className="text-[8.5px] text-slate-500">สแกน QR เพื่อตรวจสอบความถูกต้องของข้อมูลผ่านระบบออนไลน์</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-600">หน้า 1 จาก 1 · เอกสารควบคุมภายใน บริษัท เจมม่า นิตติ้ง จำกัด (Gemma Knits (Thailand)Co., Ltd.)</div>
                <div className="font-mono text-[8.5px] text-slate-400">
                  DOC-REF: {docNo || 'N/A'} · GEN: {currentDateStr}
                </div>
              </div>
            </div>
          </div>
  )
}
