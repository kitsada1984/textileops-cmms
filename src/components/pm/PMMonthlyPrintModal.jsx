import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  Calendar,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Cpu,
  Layers,
  MapPin,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import gemmaLogo from '../../assets/logo-gemma.png'
import { THAI_MONTHS } from './PMMonthlyScheduleView'

export default function PMMonthlyPrintModal({
  open = false,
  onClose,
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  items = [],
  stats = {},
  daysPerMachine = 3,
  locationFilter = 'ALL',
  currentUserName = '',
}) {
  const printRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  if (!open) return null

  const monthName = THAI_MONTHS[month - 1] || `เดือนที่ ${month}`
  const buddhistYear = year + 543
  const documentCode = `PM-SCH-${year}${String(month).padStart(2, '0')}`
  const printDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')

  const locationLabel = !locationFilter || locationFilter === 'ALL'
    ? 'ทุกโซน / โรงทอทั้งหมด'
    : `เฉพาะโรงทอ ${locationFilter}`

  // Handlers
  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = async () => {
    const element = printRef.current
    if (!element) return

    try {
      setDownloading(true)
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for sharp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      const pageHeight = pdf.internal.pageSize.getHeight()

      // If document fits on one page
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      } else {
        // Multi-page slicing if needed
        let heightLeft = pdfHeight
        let position = 0

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight

        while (heightLeft > 0) {
          position = position - pageHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
          heightLeft -= pageHeight
        }
      }

      const fileName = `PM_Monthly_Schedule_${year}_${String(month).padStart(2, '0')}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      alert(`ไม่สามารถดาวน์โหลดไฟล์ PDF ได้: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
      {/* ── TOP ACTION BAR (Screen only / print:hidden) ─────────────────────────── */}
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              พรีวิวแผนงานบำรุงรักษาเชิงป้องกันประจำเดือน (A4 Landscape)
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {monthName} {buddhistYear} | รวม {items.length} เครื่อง
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              ตรวจสอบรูปแบบเอกสารก่อนสั่งพิมพ์ หรือดาวน์โหลดเป็นไฟล์ PDF ขนาด A4 แนวนอน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลดเป็นไฟล์ PDF"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>{downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="พิมพ์เอกสารออกเครื่องพิมพ์หรือ PDF"
          >
            <Printer size={16} />
            <span>พิมพ์เอกสาร (A4)</span>
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
            size: A4 landscape;
            margin: 8mm 7mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-pm-monthly-report,
          #printable-pm-monthly-report * {
            visibility: visible;
          }
          #printable-pm-monthly-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── PREVIEW CONTAINER / PRINTABLE DOCUMENT ─────────────────── */}
      <div className="p-4 sm:p-6 w-full flex justify-center">
        <div
          ref={printRef}
          id="printable-pm-monthly-report"
          className="w-full max-w-[297mm] min-h-[200mm] bg-white text-slate-900 p-8 rounded-xl shadow-2xl border border-slate-300 font-sans print:border-0 print:p-2 print:shadow-none"
        >
          {/* ── 1. HEADER SECTION ─────────────────────────────────── */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-start justify-between gap-4">
              {/* Logo & Company Name */}
              <div className="flex items-center gap-3">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    บริษัท แกมม่า นิตติ้ง จำกัด (Gemma Knits Co., Ltd.)
                  </h1>
                  <h2 className="text-sm font-extrabold text-blue-700 leading-tight">
                    แผนงานบำรุงรักษาเชิงป้องกันประจำเดือน (Monthly Preventive Maintenance Schedule)
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ระบบบริหารจัดการงานบำรุงรักษาเครื่องจักรสิ่งทอ (TextileOps CMMS Platform)
                  </p>
                </div>
              </div>

              {/* Document Metadata Box */}
              <div className="text-right text-[10px] space-y-0.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div className="font-mono font-bold text-slate-800">
                  รหัสเอกสาร: <span className="text-blue-700">{documentCode}</span>
                </div>
                <div className="text-slate-600">
                  ประจำเดือน: <strong className="text-slate-900">{monthName} {buddhistYear}</strong>
                </div>
                <div className="text-slate-500">
                  วันที่พิมพ์: {printDateStr} น.
                </div>
                {currentUserName && (
                  <div className="text-slate-500">
                    ผู้พิมพ์: <strong>{currentUserName}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Scope Sub-bar */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-600">
              <div className="flex items-center gap-3">
                <span>
                  📍 <strong>ขอบเขตโรงทอ:</strong> {locationLabel}
                </span>
                <span>
                  ⏱️ <strong>เกณฑ์เวลา:</strong> {daysPerMachine} วันทำการ/เครื่อง (ไม่นับวันอาทิตย์)
                </span>
              </div>
              <span className="font-bold text-slate-800">
                จำนวนเครื่องจักรในแผนทั้งหมด: {items.length} เครื่อง
              </span>
            </div>
          </div>

          {/* ── 2. KPI SUMMARY CARDS ──────────────────────────────── */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  เครื่องทั้งหมดในแผน
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                  {items.length} <span className="text-[10px] font-normal text-slate-500">เครื่อง</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Cpu size={14} />
              </div>
            </div>

            <div className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                  เสร็จสมบูรณ์
                </div>
                <div className="text-base font-black text-emerald-700 mt-0.5 font-mono">
                  {stats.completed || 0} <span className="text-[10px] font-normal text-slate-500">({items.length > 0 ? Math.round(((stats.completed || 0) / items.length) * 100) : 0}%)</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={14} />
              </div>
            </div>

            <div className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                  กำลังดำเนินการ
                </div>
                <div className="text-base font-black text-amber-700 mt-0.5 font-mono">
                  {stats.inProgress || 0} <span className="text-[10px] font-normal text-slate-500">เครื่อง</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Clock size={14} />
              </div>
            </div>

            <div className="p-2 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  ตามแผน / รอดำเนินการ
                </div>
                <div className="text-base font-black text-blue-700 mt-0.5 font-mono">
                  {stats.scheduled || 0} <span className="text-[10px] font-normal text-slate-500">เครื่อง</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                <Calendar size={14} />
              </div>
            </div>
          </div>

          {/* ── 3. MAIN SCHEDULE TABLE ───────────────────────────── */}
          <div className="mb-4">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-1 px-1.5 text-center w-8 border border-slate-900">#</th>
                  <th className="py-1 px-2 w-28 border border-slate-900">รหัสเครื่อง (M/C)</th>
                  <th className="py-1 px-2 w-20 border border-slate-900">ซีเรียล (KI)</th>
                  <th className="py-1 px-1.5 text-center w-16 border border-slate-900">โรงทอ</th>
                  <th className="py-1 px-1.5 text-center w-16 border border-slate-900">ชนิด</th>
                  <th className="py-1 px-2 w-32 border border-slate-900">ช่วงวันที่วางแผน</th>
                  <th className="py-1 px-2 w-32 border border-slate-900">ผลการทำจริง</th>
                  <th className="py-1 px-2 w-24 border border-slate-900">ช่างผู้รับผิดชอบ</th>
                  <th className="py-1 px-2 text-center w-24 border border-slate-900">สถานะ</th>
                  <th className="py-1 px-2 border border-slate-900">ใบสั่งงาน / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400 border border-slate-200 italic">
                      ไม่มีรายการแผน PM สำหรับเดือนนี้
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const isCompleted = item.status === 'COMPLETED'
                    const isInProgress = item.status === 'IN_PROGRESS'
                    const isDelayed = item.status === 'DELAYED'

                    const statusBadgeClass = isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isInProgress
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : isDelayed
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-blue-50 text-blue-800 border-blue-200'

                    const statusLabel = isCompleted
                      ? 'เสร็จสิ้น'
                      : isInProgress
                      ? 'กำลังทำ'
                      : isDelayed
                      ? 'ล่าช้า'
                      : 'ตามแผน'

                    const plannedText = item.plannedStartDate
                      ? `${item.plannedStartDate} ถึง ${item.plannedEndDate || item.plannedStartDate} (${item.workingDays || daysPerMachine} ว.)`
                      : '—'

                    const actualText = item.actualStartDate
                      ? `${item.actualStartDate}${item.actualEndDate && item.actualEndDate !== item.actualStartDate ? ` ถึง ${item.actualEndDate}` : ''}`
                      : '—'

                    return (
                      <tr
                        key={item.id || idx}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                      >
                        <td className="py-1 px-1.5 text-center font-mono font-bold text-slate-500 border border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2 font-bold text-slate-900 border border-slate-200">
                          <div className="flex items-center gap-1">
                            <span>{item.mc}</span>
                            {item.isUnplanned && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                นอกแผน
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-2 font-mono text-slate-600 border border-slate-200">
                          {item.ki || '—'}
                        </td>
                        <td className="py-1 px-1.5 text-center font-medium text-slate-700 border border-slate-200">
                          {item.location || '—'}
                        </td>
                        <td className="py-1 px-1.5 text-center text-slate-600 border border-slate-200">
                          {item.type || '—'}
                        </td>
                        <td className="py-1 px-2 font-mono text-[9px] text-slate-700 border border-slate-200">
                          {plannedText}
                        </td>
                        <td className="py-1 px-2 font-mono text-[9px] text-slate-800 border border-slate-200">
                          {actualText}
                        </td>
                        <td className="py-1 px-2 text-slate-700 border border-slate-200 truncate max-w-[100px]">
                          {item.actualTech || item.assignedTech || '—'}
                        </td>
                        <td className="py-1 px-2 text-center border border-slate-200">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${statusBadgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-[9px] text-slate-600 border border-slate-200 truncate max-w-[140px]">
                          {item.workOrderId ? (
                            <span className="font-mono text-blue-700 font-bold mr-1">
                              {item.workOrderId}
                            </span>
                          ) : null}
                          {item.notes || '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── 4. SIGN-OFF / APPROVAL SECTION ─────────────────────── */}
          <div className="mt-4 pt-3 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-[10px] text-slate-800">
            <div className="text-center p-2 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-bold text-slate-900 mb-6">ผู้จัดทำแผน (Prepared By)</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div className="text-slate-600">เจ้าหน้าที่วางแผนบำรุงรักษา</div>
              <div className="text-slate-500 text-[9px]">วันที่: ....../....../............</div>
            </div>

            <div className="text-center p-2 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-bold text-slate-900 mb-6">ผู้ตรวจสอบ (Inspected By)</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div className="text-slate-600">หัวหน้าฝ่ายซ่อมบำรุง</div>
              <div className="text-slate-500 text-[9px]">วันที่: ....../....../............</div>
            </div>

            <div className="text-center p-2 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="font-bold text-slate-900 mb-6">ผู้อนุมัติ (Approved By)</div>
              <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto mb-1"></div>
              <div className="text-slate-600">ผู้จัดการฝ่ายผลิต / โรงงาน</div>
              <div className="text-slate-500 text-[9px]">วันที่: ....../....../............</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
