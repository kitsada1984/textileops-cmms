import React, { useRef, useState, useMemo } from 'react'
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
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import gemmaLogo from '../../assets/logo-gemma.png'
import { THAI_MONTHS, getItemDayRange, getStatusMeta } from './PMMonthlyScheduleView'

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
  const [viewMode, setViewMode] = useState('timeline') // 'timeline' (default) vs 'list'

  // Days in selected month
  const daysInMonth = new Date(year, month, 0).getDate()

  // Calendar days array for Timeline grid
  const calendarDays = useMemo(() => {
    const days = []
    const THAI_DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d)
      const dayOfWeek = dateObj.getDay()
      days.push({
        dayNumber: d,
        dayOfWeek,
        shortDayName: THAI_DAY_SHORT[dayOfWeek],
        isSunday: dayOfWeek === 0,
      })
    }
    return days
  }, [year, month, daysInMonth])

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
      const targetWidth = 1122 // Standard 297mm A4 landscape at 96 DPI
      const targetHeight = element.scrollHeight || 794

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution (240+ DPI) for sharp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Force desktop landscape canvas rendering (never shrink on mobile)
        windowHeight: Math.max(targetHeight + 100, 900),
        width: targetWidth,
        height: targetHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Force light mode on cloned document so PDF paper is always pure white
          clonedDoc.documentElement.classList.remove('dark')
          if (clonedDoc.body) clonedDoc.body.classList.remove('dark')
          const el = clonedDoc.getElementById('printable-pm-monthly-report')
          if (el) {
            el.style.width = '1122px'
            el.style.minWidth = '1122px'
            el.style.maxWidth = '1122px'
            el.style.margin = '0'
            el.style.backgroundColor = '#ffffff'
            el.style.color = '#0f172a'
            el.style.boxShadow = 'none'
            el.style.border = 'none'
          }
        },
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      // If document fits on one page (center vertically)
      if (pdfHeight <= pageHeight) {
        const yOffset = Math.max(0, (pageHeight - pdfHeight) / 2)
        pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, pdfHeight)
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
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl backdrop-blur-md print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-white tracking-wide whitespace-nowrap">
                <span className="hidden sm:inline">พรีวิวแผนงานบำรุงรักษาเชิงป้องกันประจำเดือน (A4 Landscape)</span>
                <span className="sm:hidden">พรีวิวแผน PM (A4 Landscape)</span>
              </h2>
              <span className="text-[10px] sm:text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                {monthName} {buddhistYear} | รวม {items.length} เครื่อง
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
              ตรวจสอบรูปแบบเอกสารก่อนสั่งพิมพ์ หรือดาวน์โหลดเป็นไฟล์ PDF ขนาด A4 แนวนอน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-800 rounded-xl border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="แสดงแบบปฏิทินแถบเวลา (Gantt Timeline)"
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">แถบเวลา (Timeline)</span>
              <span className="sm:hidden">แถบเวลา</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="แสดงแบบตารางรายการข้อมูลละเอียด"
            >
              <Layers size={13} />
              <span>ตารางรายการ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 min-h-[36px]"
            title="ดาวน์โหลดเป็นไฟล์ PDF"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">{downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            <span className="sm:hidden">{downloading ? 'สร้าง PDF...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 min-h-[36px]"
            title="พิมพ์เอกสารออกเครื่องพิมพ์หรือ PDF"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">พิมพ์เอกสาร (A4)</span>
            <span className="sm:hidden">พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
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
            margin: 6mm 6mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
      <div className="p-2 sm:p-6 w-full flex justify-start lg:justify-center overflow-x-auto">
        <div
          ref={printRef}
          id="printable-pm-monthly-report"
          className="w-[1122px] min-w-[1122px] max-w-[1122px] print:w-full print:min-w-0 print:max-w-none bg-white text-slate-900 p-6 sm:p-7 rounded-xl shadow-2xl border border-slate-300 font-sans print:border-0 print:p-2 print:shadow-none"
          style={{ boxSizing: 'border-box' }}
        >
          {/* ── 1. HEADER SECTION ─────────────────────────────────── */}
          <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5">
            <div className="flex items-start justify-between gap-4">
              {/* Logo & Company Name */}
              <div className="flex items-center gap-3">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="w-11 h-11 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    บริษัท เจมม่า นิตติ้ง จำกัด (Gemma Knits (Thailand)Co., Ltd.)
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
            <div className="mt-2 pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-600">
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

          {/* ── 2. COLOR LEGEND (สัญลักษณ์แถบสี) ──────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 mb-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-medium text-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-900">สัญลักษณ์แถบสี:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-blue-600 inline-block shrink-0 shadow-xs"></span>
                <span>แถบแผนงาน ({daysPerMachine} วัน)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-emerald-600 inline-block shrink-0 shadow-xs"></span>
                <span>ทำจริง: เสร็จสิ้น (Completed)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-amber-500 inline-block shrink-0 shadow-xs"></span>
                <span>ทำจริง: กำลังทำ (In Progress)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 rounded bg-rose-600 inline-block shrink-0 shadow-xs"></span>
                <span>ทำจริง: ล่าช้า (Delayed)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[8px]">
                  นอกแผน
                </span>
                <span>นอกแผน (Unplanned)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-700 font-medium">
              <span className="w-3 h-3 rounded bg-rose-200 border border-rose-300 inline-block shrink-0"></span>
              <span>วันอาทิตย์ (วันหยุด ไม่นับวันทำงาน)</span>
            </div>
          </div>

          {/* ── 4. MAIN SCHEDULE VIEW: TIMELINE GANTT (DEFAULT) VS LIST TABLE ── */}
          {viewMode === 'timeline' ? (
            /* ── 4A. GANTT TIMELINE SCHEDULE (เหมือนบนหน้าเว็บ) ── */
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white mb-3 text-[9px]">
              {/* Timeline Header Row */}
              <div className="flex items-stretch border-b-2 border-slate-900 bg-slate-900 text-white font-bold text-[9px]">
                <div
                  style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}
                  className="w-8 shrink-0 text-center py-1.5 border-r border-slate-700 font-mono text-[9.5px] flex items-center justify-center text-slate-300"
                >
                  #
                </div>
                <div
                  style={{ width: '112px', minWidth: '112px', maxWidth: '112px' }}
                  className="w-28 shrink-0 px-2 py-1.5 border-r border-slate-700 font-bold text-[9.5px] flex items-center text-white"
                >
                  เครื่องจักร (M/C)
                </div>
                <div
                  style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
                  className="w-20 shrink-0 text-center py-1.5 border-r border-slate-700 font-bold text-[9.5px] flex items-center justify-center text-white"
                >
                  สถานะ
                </div>
                {/* 31 Calendar Days Header Columns */}
                <div
                  className="flex-1 grid text-center font-bold"
                  style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                >
                  {calendarDays.map((d) => (
                    <div
                      key={d.dayNumber}
                      className={`py-1 border-r border-slate-700 last:border-r-0 flex flex-col justify-center items-center ${
                        d.isSunday ? 'bg-rose-900/90 text-rose-200 font-black' : 'text-slate-100'
                      }`}
                    >
                      <span className="text-[7.5px] uppercase leading-none font-bold opacity-85">{d.shortDayName}</span>
                      <span className="text-[9.5px] font-mono font-bold leading-tight mt-0.5">
                        {String(d.dayNumber).padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Machine Rows */}
              {items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic">ไม่มีรายการแผน PM สำหรับเดือนนี้</div>
              ) : (
                items.map((item, idx) => {
                  const range = getItemDayRange(item, year, month, daysInMonth)
                  const actItem = item.actualStartDate
                    ? {
                        plannedStartDate: item.actualStartDate,
                        plannedEndDate: item.actualEndDate || item.actualStartDate,
                      }
                    : null
                  const actRange = actItem ? getItemDayRange(actItem, year, month, daysInMonth) : null
                  const hasOverlap = Boolean(
                    range && actRange && !(range.endDay < actRange.startDay || range.startDay > actRange.endDay)
                  )

                  return (
                    <div
                      key={item.id || idx}
                      className={`flex items-stretch border-b border-slate-200 last:border-b-0 min-h-[35px] h-[35px] ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* Left Column 1: Index */}
                      <div
                        style={{ width: '32px', minWidth: '32px', maxWidth: '32px' }}
                        className="w-8 shrink-0 text-center py-1 border-r border-slate-200 font-mono font-bold text-slate-500 text-[10px] flex items-center justify-center"
                      >
                        {idx + 1}
                      </div>

                      {/* Left Column 2: Machine */}
                      <div
                        style={{ width: '112px', minWidth: '112px', maxWidth: '112px' }}
                        className="w-28 shrink-0 px-2 py-1 border-r border-slate-200 flex items-center justify-between gap-1 font-bold text-slate-900 text-[10px]"
                      >
                        <span className="whitespace-nowrap font-bold text-slate-900">{item.mc}</span>
                        {item.isUnplanned && (
                          <span className="text-[7.5px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            นอกแผน
                          </span>
                        )}
                      </div>

                      {/* Left Column 3: Status Badge - Perfectly centered horizontally and vertically */}
                      <div
                        style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}
                        className="w-20 shrink-0 text-center py-1 border-r border-slate-200 flex items-center justify-center px-1"
                      >
                        <span
                          style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          className={`inline-flex items-center justify-center px-2.5 h-[20px] rounded-md text-[8.5px] font-bold border whitespace-nowrap shadow-xs leading-none ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : item.status === 'DELAYED'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          <span style={{ display: 'inline-block', marginBottom: '3px' }}>
                            {item.status === 'COMPLETED'
                              ? 'เสร็จสิ้น'
                              : item.status === 'IN_PROGRESS'
                              ? 'กำลังทำ'
                              : item.status === 'DELAYED'
                              ? 'ล่าช้า'
                              : 'ตามแผน'}
                          </span>
                        </span>
                      </div>

                      {/* Day Grid with Bars */}
                      <div
                        className="flex-1 grid relative py-0.5 h-[35px] min-h-[35px]"
                        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                      >
                        {/* Background Day Columns (Sunday Highlighting) */}
                        {calendarDays.map((d) => (
                          <div
                            key={d.dayNumber}
                            className={`border-r border-slate-100 last:border-r-0 h-full ${
                              d.isSunday ? 'bg-rose-50/70 border-r-rose-100' : ''
                            }`}
                          />
                        ))}

                        {/* 1. Planned Bar (แถบแผนงาน/ล้างเครื่อง) - Perfectly centered in the bar */}
                        {range && (
                          <div
                            style={{
                              gridColumnStart: range.startDay,
                              gridColumnEnd: range.endDay + 1,
                              left: '1px',
                              right: '1px',
                              width: 'calc(100% - 2px)',
                              boxSizing: 'border-box',
                            }}
                            className={`absolute z-2 rounded px-1 flex items-center justify-center text-center font-bold bg-blue-600 text-white shadow-xs overflow-hidden ${
                              hasOverlap
                                ? 'top-[2px] h-[15px] text-[8px] leading-none'
                                : 'inset-y-0 my-auto h-[20px] text-[8.5px] leading-none'
                            }`}
                            title={`แผนงาน: ${item.mc} (${item.plannedStartDate} ถึง ${item.plannedEndDate})`}
                          >
                            <span
                              style={{ display: 'inline-block', marginBottom: hasOverlap ? '1.5px' : '3px' }}
                              className="whitespace-nowrap font-bold text-center leading-none"
                            >
                              {range.span >= 2 ? `แผน: ${item.mc}` : 'แผน'}
                            </span>
                            {range.span >= 4 && (
                              <span
                                style={{ display: 'inline-block', marginBottom: hasOverlap ? '1.5px' : '3px' }}
                                className="font-mono text-[7px] opacity-90 shrink-0 ml-1 leading-none"
                              >
                                ({range.span}ว.)
                              </span>
                            )}
                          </div>
                        )}

                        {/* 2. Actual Bar (แถบทำจริง) - Perfectly centered in the bar */}
                        {actRange && (
                          <div
                            style={{
                              gridColumnStart: actRange.startDay,
                              gridColumnEnd: actRange.endDay + 1,
                              left: '1px',
                              right: '1px',
                              width: 'calc(100% - 2px)',
                              boxSizing: 'border-box',
                            }}
                            className={`absolute z-3 rounded px-1 flex items-center justify-center text-center font-bold text-white shadow-xs overflow-hidden ${
                              hasOverlap
                                ? 'bottom-[2px] h-[15px] text-[8px] leading-none'
                                : 'inset-y-0 my-auto h-[20px] text-[8.5px] leading-none'
                            } ${
                              item.status === 'COMPLETED'
                                ? 'bg-emerald-600'
                                : item.status === 'IN_PROGRESS'
                                ? 'bg-amber-500'
                                : item.status === 'DELAYED'
                                ? 'bg-rose-600'
                                : 'bg-slate-600'
                            }`}
                            title={`ทำจริง: ${item.mc} (${item.actualStartDate} ถึง ${item.actualEndDate || item.actualStartDate})`}
                          >
                            <span
                              style={{ display: 'inline-block', marginBottom: hasOverlap ? '1.5px' : '3px' }}
                              className="whitespace-nowrap font-bold text-center leading-none"
                            >
                              จริง: {item.actualTech || item.mc}
                            </span>
                            {item.workOrderId && actRange.span >= 4 && !hasOverlap && (
                              <span
                                style={{ display: 'inline-block', marginBottom: '3px' }}
                                className="font-mono text-[7px] opacity-90 shrink-0 ml-1 leading-none"
                              >
                                ({item.workOrderId.slice(-4)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            /* ── 4B. LIST TABLE VIEW (ตารางรายการละเอียด) ── */
            <div className="mb-3">
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
                          <td className="py-1 px-2 text-slate-700 border border-slate-200">
                            {item.actualTech || item.assignedTech || '—'}
                          </td>
                          <td className="py-1 px-2 text-center border border-slate-200">
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[8.5px] font-bold border whitespace-nowrap shadow-xs ${statusBadgeClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-[9px] text-slate-600 border border-slate-200">
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
          )}

          {/* ── 5. SIGN-OFF / APPROVAL SECTION ─────────────────────── */}
          <div className="mt-3 pt-2.5 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-[10px] text-slate-800">
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
