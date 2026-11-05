import { Printer, X } from 'lucide-react'

// Top action bar moved verbatim from PdfPreviewModal (props only).
export function PdfTopBar({ title, docNo, theme, handlePrint, onClose }) {
  return (
      <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-700/80 px-4 py-3 shadow-2xl print:hidden flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-md font-bold"
            style={{ background: `linear-gradient(135deg, ${theme.accent}, #0f172a)` }}
          >
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-sm font-bold tracking-tight">{title}</h2>
              {docNo && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-xs font-bold border border-slate-700">
                  {docNo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{theme.enType}</span>
              <span>·</span>
              <span>ขนาดมาตรฐาน A4 พร้อมระบบพิมพ์และแนบรูปภาพคมชัด</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Printer size={16} />
            <span>พิมพ์เอกสาร / บันทึก PDF (A4)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>
  )
}
