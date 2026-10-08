import { useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  Disc,
  Layers,
  Cpu,
  MapPin,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'

export default function YarnBeltsPrintModal({
  open = false,
  onClose,
  data = {},
  locationFilter = 'ALL',
  currentUserName = '',
}) {
  const printRef = useRef(null)

  if (!open) return null

  const {
    overallSummary = [],
    tapeBreakdown = { 1: [], 2: [], 3: [], 4: [], 5: [] },
    stats = {},
  } = data

  const handlePrint = () => {
    window.print()
  }

  const printDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')
  const locationLabel = locationFilter === 'ALL' || !locationFilter ? 'ทุกโซน / โรงทอทั้งหมด' : `โซน ${locationFilter}`

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
      {/* ── TOP ACTION BAR (Screen only) ─────────────────────────── */}
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Disc size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              พรีวิวรายงานสายพานส่งด้าย เทป 1-5 (A4 Portrait)
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                รวม {stats.totalBelts || 0} เส้น
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              ตรวจสอบข้อมูลสรุปยอดจำนวนสายพานก่อนพิมพ์ หรือบันทึกเป็น PDF ขนาด A4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Printer size={16} />
            <span>พิมพ์เอกสาร / บันทึก PDF (A4)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── PRINT CSS EMBEDDED ──────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 7mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-yarn-belts-report,
          #printable-yarn-belts-report * {
            visibility: visible;
          }
          #printable-yarn-belts-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-yarn-belts-report table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          #printable-yarn-belts-report thead {
            display: table-header-group !important;
          }
          #printable-yarn-belts-report tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          #printable-yarn-belts-report tfoot {
            display: table-footer-group !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── PREVIEW CONTAINER ───────────────────────────────────── */}
      <div className="flex-1 w-full p-4 sm:p-8 flex justify-center items-start">
        {/* ── A4 PAPER SHEET ─────────────────────────────────────── */}
        <div
          id="printable-yarn-belts-report"
          ref={printRef}
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-6 sm:p-9 shadow-2xl rounded-sm border border-slate-200 flex flex-col justify-between font-sans relative overflow-hidden"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800" />

          {/* Main Document Content */}
          <div className="flex-1 flex flex-col">
            {/* ── 1. HEADER SECTION ────────────────────────────── */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-start justify-between gap-4">
                {/* Logo & Company Name */}
                <div className="flex items-center gap-3">
                  <img
                    src={gemmaLogo}
                    alt="Gemma Knits Logo"
                    className="h-12 w-auto object-contain flex-shrink-0"
                  />
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-950 uppercase leading-tight">
                      บริษัท เจ็มม่า นิตส์ จำกัด
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-600">
                      GEMMA KNITS CO., LTD. · TEXTILEOPS CMMS
                    </p>
                    <p className="text-[10px] text-slate-400">
                      รายงานสายพานส่งด้ายเครื่องจักรโรงทอ (เทป 1 - 5)
                    </p>
                  </div>
                </div>

                {/* Report Title & Metadata Badge */}
                <div className="text-right flex flex-col items-end">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black tracking-wide uppercase mb-1">
                    INTERNAL REPORT · MACHINE YARN BELTS
                  </div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    รายงานสรุปสายพานส่งด้าย (เทป 1 - 5)
                  </h2>
                  <p className="text-[10.5px] font-medium text-slate-500">
                    YARN FEEDING BELTS SPECIFICATION & USAGE REPORT
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={10} /> {printDateStr} น.
                    </span>
                    {currentUserName && (
                      <span>· พิมพ์โดย: {currentUserName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scope Ribbon */}
              <div className="mt-2.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[10.5px] text-slate-600 flex items-center justify-between">
                <span className="font-medium">
                  📍 <strong>ขอบเขตข้อมูล:</strong> {locationLabel}
                </span>
                <span className="font-bold text-slate-700">
                  เครื่องจักรทั้งหมด {stats.totalMachines || 0} เครื่อง (ติดตั้งสายพาน {stats.machinesWithBelts || 0} เครื่อง)
                </span>
              </div>
            </div>

            {/* ── 2. SUMMARY KPI STATS CARDS ───────────────────── */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    จำนวนสายพานรวม
                  </div>
                  <div className="text-base font-black text-blue-700 mt-0.5 font-mono">
                    {stats.totalBelts || 0} <span className="text-[10px] font-normal text-slate-500">เส้น</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Disc size={14} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    เบอร์สายพานที่ใช้งาน
                  </div>
                  <div className="text-base font-black text-emerald-700 mt-0.5 font-mono">
                    {stats.uniqueBeltSizes || 0} <span className="text-[10px] font-normal text-slate-500">เบอร์</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Layers size={14} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    เครื่องที่ติดตั้งสายพาน
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                    {stats.machinesWithBelts || 0} <span className="text-[10px] font-normal text-slate-500">เครื่อง</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                  <Cpu size={14} />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    โซน / โรงทอ
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-0.5 truncate max-w-[110px]">
                    {locationFilter === 'ALL' || !locationFilter ? 'ทุกโซน' : locationFilter}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <MapPin size={14} />
                </div>
              </div>
            </div>

            {/* ── 3. OVERALL BELTS SUMMARY TABLE ───────────────── */}
            <div className="mb-4">
              <div className="text-[11px] font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
                <span>ตารางที่ 1: สรุปภาพรวมจำนวนเส้นแยกตามเบอร์สายพาน (รวมทุกตำแหน่ง เทป 1 - 5)</span>
              </div>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-1.5 px-2 text-center w-8 border border-slate-900">#</th>
                    <th className="py-1.5 px-3 w-28 border border-slate-900">เบอร์สายพาน</th>
                    <th className="py-1.5 px-2 text-center w-14 border border-slate-900">เทป 1</th>
                    <th className="py-1.5 px-2 text-center w-14 border border-slate-900">เทป 2</th>
                    <th className="py-1.5 px-2 text-center w-14 border border-slate-900">เทป 3</th>
                    <th className="py-1.5 px-2 text-center w-14 border border-slate-900">เทป 4</th>
                    <th className="py-1.5 px-2 text-center w-14 border border-slate-900">เทป 5</th>
                    <th className="py-1.5 px-2 text-center w-20 border border-slate-900">จำนวนเครื่อง</th>
                    <th className="py-1.5 px-3 text-right w-24 border border-slate-900">จำนวนรวม (เส้น)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {overallSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 border border-slate-200">
                        ไม่พบข้อมูลสายพานส่งด้ายในกลุ่มเครื่องจักรที่เลือก
                      </td>
                    </tr>
                  ) : (
                    overallSummary.map((item, idx) => (
                      <tr
                        key={item.beltNo}
                        className={`${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} border-b border-slate-200`}
                      >
                        <td className="py-1.5 px-2 text-center font-mono text-slate-500 border border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-950 border border-slate-200">
                          {item.beltNo}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono border border-slate-200">
                          {item.tapePositions[1] ? <span className="font-semibold text-slate-800">{item.tapePositions[1]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono border border-slate-200">
                          {item.tapePositions[2] ? <span className="font-semibold text-slate-800">{item.tapePositions[2]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono border border-slate-200">
                          {item.tapePositions[3] ? <span className="font-semibold text-slate-800">{item.tapePositions[3]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono border border-slate-200">
                          {item.tapePositions[4] ? <span className="font-semibold text-slate-800">{item.tapePositions[4]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono border border-slate-200">
                          {item.tapePositions[5] ? <span className="font-semibold text-slate-800">{item.tapePositions[5]}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-600 border border-slate-200">
                          {item.machineCount} เครื่อง
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-black text-blue-900 border border-slate-200 text-[10.5px]">
                          {item.totalQty.toLocaleString()} เส้น
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {overallSummary.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-900">
                      <td colSpan={2} className="py-2 px-3 text-right text-[10px] uppercase tracking-wider border border-slate-300">
                        รวมทั้งสิ้น:
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300">
                        {overallSummary.reduce((acc, i) => acc + i.tapePositions[1], 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300">
                        {overallSummary.reduce((acc, i) => acc + i.tapePositions[2], 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300">
                        {overallSummary.reduce((acc, i) => acc + i.tapePositions[3], 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300">
                        {overallSummary.reduce((acc, i) => acc + i.tapePositions[4], 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300">
                        {overallSummary.reduce((acc, i) => acc + i.tapePositions[5], 0)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold border border-slate-300 text-slate-600">
                        {stats.machinesWithBelts || 0} เครื่อง
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[10.5px] text-blue-950 font-black border border-slate-300">
                        {stats.totalBelts || 0} เส้น
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── 4. TAPE BREAKDOWN MINI TABLES (5 Positions) ──── */}
            <div className="mb-6">
              <div className="text-[11px] font-black text-slate-900 mb-1.5">
                <span>ตารางที่ 2: สรุปแจกแจงจำนวนเส้นแยกรายตำแหน่ง (เทป 1 ถึง เทป 5)</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((pos) => {
                  const list = tapeBreakdown[pos] || []
                  const tapeTotal = list.reduce((acc, item) => acc + item.qty, 0)

                  return (
                    <div key={pos} className="border border-slate-300 rounded overflow-hidden">
                      <div className="bg-slate-800 text-white px-2 py-1 flex items-center justify-between text-[9px] font-bold">
                        <span>เทป {pos}</span>
                        <span className="font-mono text-blue-300">{tapeTotal} เส้น</span>
                      </div>
                      <table className="w-full text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                            <th className="py-1 px-1.5 text-left">เบอร์</th>
                            <th className="py-1 px-1.5 text-right">จำนวน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.length === 0 ? (
                            <tr>
                              <td colSpan={2} className="py-2 text-center text-slate-400">
                                —
                              </td>
                            </tr>
                          ) : (
                            list.map((item) => (
                              <tr key={item.beltNo}>
                                <td className="py-1 px-1.5 font-mono font-semibold text-slate-800 truncate">
                                  {item.beltNo}
                                </td>
                                <td className="py-1 px-1.5 font-mono text-right font-bold text-slate-950">
                                  {item.qty}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 5. SIGNATORIES SECTION ───────────────────────── */}
            <div className="mt-6 pt-4 border-t border-slate-300 avoid-break">
              <div className="grid grid-cols-3 gap-6 text-center text-slate-800">
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    ผู้จัดทำรายงาน (Prepared By)
                  </div>
                  <div className="w-36 border-b border-dotted border-slate-400 mb-1.5" />
                  <div className="text-[9.5px] text-slate-600">
                    ( {currentUserName || '...................................................'} )
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    วันที่: ...... / ...... / ............
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    หัวหน้าแผนกซ่อมบำรุง (Supervisor)
                  </div>
                  <div className="w-36 border-b border-dotted border-slate-400 mb-1.5" />
                  <div className="text-[9.5px] text-slate-600">
                    ( ................................................... )
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    วันที่: ...... / ...... / ............
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    ผู้อนุมัติ / ผจก. โรงงาน (Approved By)
                  </div>
                  <div className="w-36 border-b border-dotted border-slate-400 mb-1.5" />
                  <div className="text-[9.5px] text-slate-600">
                    ( ................................................... )
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    วันที่: ...... / ...... / ............
                  </div>
                </div>
              </div>

              {/* Bottom Doc Footer Line */}
              <div className="mt-6 pt-2 border-t border-slate-100 flex items-center justify-between text-[8.5px] text-slate-400">
                <span>TextileOps CMMS · Gemma Knits Co., Ltd. (เอกสารควบคุมภายใน)</span>
                <span>พิมพ์เมื่อ {printDateStr} น. · หน้า 1 / 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
