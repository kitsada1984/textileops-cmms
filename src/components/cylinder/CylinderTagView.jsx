import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Printer,
  Calendar,
  Disc,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Tag,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'
import { stripCylinderImageMeta } from '../../utils/cylinderImage'

export default function CylinderTagView({
  cylinders = [],
  selectedCylinder = null,
  onSelectCylinder,
}) {
  const [internalSelectedId, setInternalSelectedId] = useState(
    selectedCylinder?.id || selectedCylinder?._id || cylinders[0]?.id || cylinders[0]?._id || ''
  )
  const [search, setSearch] = useState('')
  const [printDate, setPrintDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [customRemark, setCustomRemark] = useState('')
  const [isEditingRemark, setIsEditingRemark] = useState(false)

  // Sync when selectedCylinder prop changes from outside
  useEffect(() => {
    if (selectedCylinder) {
      const id = selectedCylinder.id || selectedCylinder._id
      setInternalSelectedId(id)
    } else if (cylinders.length > 0 && !internalSelectedId) {
      setInternalSelectedId(cylinders[0].id || cylinders[0]._id)
    }
  }, [selectedCylinder, cylinders])

  // Active cylinder object
  const currentCyl = useMemo(() => {
    return (
      cylinders.find((c) => (c.id || c._id) === internalSelectedId) ||
      selectedCylinder ||
      cylinders[0] ||
      null
    )
  }, [cylinders, internalSelectedId, selectedCylinder])

  // Reset remark when cylinder changes (unless user explicitly edited it)
  useEffect(() => {
    if (currentCyl) {
      setCustomRemark(stripCylinderImageMeta(currentCyl.Comment || ''))
    }
  }, [currentCyl?.id, currentCyl?._id, currentCyl?.Comment])

  // Filter cylinders for dropdown
  const filteredCylinders = useMemo(() => {
    if (!search.trim()) return cylinders
    const q = search.toLowerCase()
    return cylinders.filter((c) => {
      const serial = String(c.Serial_NOW || '').toLowerCase()
      const mc = String(c.NewMC || '').toLowerCase()
      const standard = String(c.Standard || '').toLowerCase()
      const loc = String(c.Location || '').toLowerCase()
      return serial.includes(q) || mc.includes(q) || standard.includes(q) || loc.includes(q)
    })
  }, [cylinders, search])

  // Handle cylinder selection
  const handleSelect = (cyl) => {
    const id = cyl.id || cyl._id
    setInternalSelectedId(id)
    if (onSelectCylinder) onSelectCylinder(cyl)
  }

  // Next / Previous quick navigation
  const currentIndex = useMemo(() => {
    return cylinders.findIndex((c) => (c.id || c._id) === (currentCyl?.id || currentCyl?._id))
  }, [cylinders, currentCyl])

  const handlePrev = () => {
    if (currentIndex > 0) handleSelect(cylinders[currentIndex - 1])
  }

  const handleNext = () => {
    if (currentIndex < cylinders.length - 1) handleSelect(cylinders[currentIndex + 1])
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Format date for display
  const displayDate = useMemo(() => {
    try {
      if (!printDate) return format(new Date(), 'dd/MM/yyyy')
      const [y, m, d] = printDate.split('-')
      if (y && m && d) return `${d}/${m}/${y}`
      return format(new Date(printDate), 'dd/MM/yyyy')
    } catch {
      return format(new Date(), 'dd/MM/yyyy')
    }
  }, [printDate])

  return (
    <div className="space-y-4">
      {/* ── PRINT MEDIA STYLES ────────────────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide all application elements */
          body * {
            visibility: hidden !important;
          }
          /* Show only the printable cylinder tag */
          #printable-cylinder-tag, #printable-cylinder-tag * {
            visibility: visible !important;
          }
          #printable-cylinder-tag {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 10mm 14mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 4px solid #0f172a !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            z-index: 999999 !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* ── TOP CONTROL PANEL (SCREEN ONLY) ───────────────────────────── */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Cylinder Selector & Quick Nav */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Tag size={16} className="text-amber-500" />
              <span>เลือกกระบอก:</span>
            </div>

            {/* Quick dropdown with search */}
            <div className="relative min-w-[260px] flex-1 max-w-md">
              <select
                aria-label="เลือกกระบอกที่ต้องการพิมพ์ Tack"
                value={currentCyl?.id || currentCyl?._id || ''}
                onChange={(e) => {
                  const target = cylinders.find((c) => (c.id || c._id) === e.target.value)
                  if (target) handleSelect(target)
                }}
                className="select w-full text-xs font-bold py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                {cylinders.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.NewMC ? `[MC: ${c.NewMC}] ` : ''}
                    {c.Serial_NOW || 'ไม่มีซีเรียล'} · {c.Diameter ? `${c.Diameter}"` : ''} {c.Gauge ? `${c.Gauge}G` : ''} ({c.Location || 'คลัง'})
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="btn-outline p-2 text-xs disabled:opacity-30 rounded-lg"
                title="กระบอกก่อนหน้า"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1 text-slate-500">
                {currentIndex + 1} / {cylinders.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= cylinders.length - 1}
                className="btn-outline p-2 text-xs disabled:opacity-30 rounded-lg"
                title="กระบอกถัดไป"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Date & Print Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar size={14} /> วันที่:
              </span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="input py-1.5 px-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700"
                title="ระบุวันที่ที่ต้องการพิมพ์ลงบนป้าย"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="btn bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              title="สั่งพิมพ์เอกสารติดกระบอก A4 แนวนอน"
            >
              <Printer size={16} />
              <span>สั่งพิมพ์เอกสารติดกระบอก (A4 แนวนอน)</span>
            </button>
          </div>
        </div>

        {/* Remark editing bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex-shrink-0">หมายเหตุ (Remark):</span>
          <input
            type="text"
            value={customRemark}
            onChange={(e) => setCustomRemark(e.target.value)}
            placeholder="พิมพ์ข้อความหมายเหตุเพิ่มเติมสำหรับติดกระบอก..."
            className="input py-1.5 px-3 text-xs w-full rounded-xl border border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* ── PREVIEW WRAPPER (SCREEN ONLY SCROLLABLE CONTAINER) ────────── */}
      <div className="overflow-x-auto pb-8 flex justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        {!currentCyl ? (
          <div className="card p-12 text-center text-slate-400">
            <Disc size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold">ไม่พบข้อมูลกระบอกสำหรับพิมพ์ Tack</p>
          </div>
        ) : (
          /* ── A4 LANDSCAPE SHEET (297mm x 210mm) ──────────────────── */
          <div
            id="printable-cylinder-tag"
            className="bg-white text-slate-900 shadow-2xl rounded-sm border-2 border-slate-900 flex flex-col justify-between select-none relative"
            style={{
              width: '297mm',
              height: '210mm',
              minWidth: '297mm',
              minHeight: '210mm',
              padding: '10mm 14mm',
              boxSizing: 'border-box',
              fontFamily: 'Inter, Prompt, sans-serif',
            }}
          >
            {/* Top Bar Accent */}
            <div className="absolute top-0 left-0 right-0 h-[6px] bg-slate-900" />

            {/* ── HEADER: LOGO, TITLE, DATE ─────────────────────────── */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-950 leading-tight">
                    เอกสารติดกระบอกเข็ม
                  </h1>
                  <p className="text-[11px] font-mono font-bold tracking-widest text-slate-600 uppercase">
                    CYLINDER IDENTIFICATION TAG
                  </p>
                </div>
              </div>

              {/* วันที่ (Field 1 of 7) */}
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  วันที่ (DATE)
                </span>
                <span className="text-lg font-mono font-black text-slate-900">
                  {displayDate}
                </span>
              </div>
            </div>

            {/* ── HIGHLIGHT SECTION: เครื่องปัจจุบัน & ซีเรียลปัจจุบัน ────── */}
            {/* (Fields 2 & 3 of 7: เน้นตัวใหญ่เห็นชัดจากระยะไกล) */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* เครื่องปัจจุบัน (Current Machine) */}
              <div className="border-3 border-slate-900 bg-slate-50/70 p-4 rounded-xl flex flex-col justify-between min-h-[145px]">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    เครื่องปัจจุบัน (CURRENT M/C)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    MACHINE
                  </span>
                </div>
                <div className="my-auto text-center py-2">
                  <div
                    className="font-mono font-black tracking-tight text-slate-950 truncate"
                    style={{ fontSize: '48pt', lineHeight: 1.1 }}
                  >
                    {currentCyl.NewMC || '—'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium text-right">
                  ตำแหน่ง: {currentCyl.Location || '—'}
                </div>
              </div>

              {/* ซีเรียลปัจจุบัน (Current Serial) */}
              <div className="border-3 border-slate-900 bg-slate-50/70 p-4 rounded-xl flex flex-col justify-between min-h-[145px]">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    ซีเรียลปัจจุบัน (SERIAL NOW)
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    SERIAL
                  </span>
                </div>
                <div className="my-auto text-center py-2">
                  <div
                    className="font-mono font-black tracking-tight text-slate-950 truncate"
                    style={{ fontSize: '42pt', lineHeight: 1.1 }}
                  >
                    {currentCyl.Serial_NOW || '—'}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium text-right">
                  มาตรฐาน: {currentCyl.Standard || '—'}
                </div>
              </div>
            </div>

            {/* ── SPECS SECTION: เส้นผ่าศูนย์กลาง, เกจ, จำนวนเข็ม ────────── */}
            {/* (Fields 4, 5, 6 of 7) */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              {/* เส้นผ่าศูนย์กลาง (Diameter) */}
              <div className="border-2 border-slate-800 bg-white p-3 rounded-xl text-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  เส้นผ่าศูนย์กลาง (DIAMETER)
                </span>
                <div className="text-3xl font-mono font-black text-slate-900">
                  {currentCyl.Diameter ? `${currentCyl.Diameter}"` : '—'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  นิ้ว (Inches)
                </span>
              </div>

              {/* เกจ (Gauge) */}
              <div className="border-2 border-slate-800 bg-white p-3 rounded-xl text-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  เกจ (GAUGE)
                </span>
                <div className="text-3xl font-mono font-black text-slate-900">
                  {currentCyl.Gauge ? `${currentCyl.Gauge}G` : '—'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  เข็มต่อนิ้ว (Gauge)
                </span>
              </div>

              {/* จำนวนเข็ม (Total Needles) */}
              <div className="border-2 border-slate-800 bg-white p-3 rounded-xl text-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  จำนวนเข็ม (TOTAL NEEDLES)
                </span>
                <div className="text-3xl font-mono font-black text-slate-900">
                  {currentCyl.Needle ? `${Number(currentCyl.Needle).toLocaleString()} เล่ม` : '—'}
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  เล่ม (Needles)
                </span>
              </div>
            </div>

            {/* ── REMARK SECTION (Field 7 of 7) ───────────────────────── */}
            <div className="border-2 border-slate-800 bg-white p-3.5 rounded-xl flex-1 flex flex-col justify-start">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                หมายเหตุ (REMARK):
              </span>
              <div className="text-base font-semibold text-slate-800 leading-relaxed min-h-[50px] whitespace-pre-wrap">
                {customRemark || '—'}
              </div>
            </div>

            {/* ── FOOTER NOTE ────────────────────────────────────────── */}
            <div className="pt-2 mt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>TextileOps Platform · เอกสารประจำกระบอกเข็มโรงงาน</span>
              <span>พิมพ์เมื่อ: {displayDate} · GEMMA KNITS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
