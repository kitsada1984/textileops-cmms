import React, { useState, useMemo, useEffect } from 'react'
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Tag,
  Disc,
  RotateCcw,
  Maximize2,
} from 'lucide-react'

/**
 * Calculates optimal font size for the 200mm x 70mm tag
 * to fill the area prominently without clipping.
 */
export function getMachineTagFontSize(text) {
  const str = String(text || '').trim()
  const len = str.length

  if (len === 0) return '80pt'
  if (len <= 2) return '125pt'
  if (len <= 4) return '105pt'
  if (len <= 6) return '88pt'
  if (len <= 8) return '72pt'
  if (len <= 11) return '58pt'
  if (len <= 15) return '46pt'
  return '36pt'
}

export default function CylinderMachineTagView({
  cylinders = [],
  selectedCylinder = null,
  onSelectCylinder,
}) {
  const [currentCylId, setCurrentCylId] = useState(() => {
    return selectedCylinder?.id || selectedCylinder?._id || cylinders[0]?.id || cylinders[0]?._id || ''
  })

  // Sync with prop when selectedCylinder changes from outside
  useEffect(() => {
    if (selectedCylinder) {
      const id = selectedCylinder.id || selectedCylinder._id
      if (id && id !== currentCylId) {
        setCurrentCylId(id)
      }
    }
  }, [selectedCylinder])

  const currentIndex = useMemo(() => {
    if (!cylinders.length) return -1
    const idx = cylinders.findIndex((c) => (c.id || c._id) === currentCylId)
    return idx >= 0 ? idx : 0
  }, [cylinders, currentCylId])

  const currentCyl = cylinders[currentIndex] || null

  // Custom machine text allow live edit before print
  const [machineText, setMachineText] = useState('')

  useEffect(() => {
    if (currentCyl) {
      setMachineText(currentCyl.NewMC || '')
    }
  }, [currentCylId, currentCyl])

  const handleSelect = (cyl) => {
    if (!cyl) return
    const id = cyl.id || cyl._id
    setCurrentCylId(id)
    onSelectCylinder?.(cyl)
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelect(cylinders[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentIndex < cylinders.length - 1) {
      handleSelect(cylinders[currentIndex + 1])
    }
  }

  const handleResetMachine = () => {
    setMachineText(currentCyl?.NewMC || '')
  }

  const handlePrint = () => {
    window.print()
  }

  const fontSize = useMemo(() => getMachineTagFontSize(machineText), [machineText])

  return (
    <div className="space-y-4">
      {/* ── PRINT MEDIA STYLES ────────────────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide everything in the document */
          body * {
            visibility: hidden !important;
          }
          /* Show only the printable machine tag */
          #printable-machine-tag, #printable-machine-tag * {
            visibility: visible !important;
          }
          #printable-machine-tag {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 200mm !important;
            height: 70mm !important;
            max-width: 200mm !important;
            max-height: 70mm !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            background-color: #bbf7d0 !important; /* light green */
            color: #000000 !important; /* black */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            border: 2px solid #16a34a !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
          @page {
            size: 200mm 70mm;
            margin: 0;
          }
        }
      `}</style>

      {/* ── TOP CONTROL PANEL (SCREEN ONLY) ───────────────────────────── */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Cylinder Selector & Nav */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Tag size={16} />
              <span>เลือกกระบอก:</span>
            </div>

            {/* Quick dropdown */}
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
                    {c.NewMC ? `[เครื่อง: ${c.NewMC}] ` : '[ไม่ระบุเครื่อง] '}
                    {c.Serial_NOW || 'ไม่มีซีเรียล'} · {c.Diameter ? `${c.Diameter}"` : ''} {c.Gauge ? `${c.Gauge}G` : ''} ({c.Location || 'คลัง'})
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next */}
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

          {/* Machine Name Live Editor & Print Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                เครื่องปัจจุบัน:
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={machineText}
                  onChange={(e) => setMachineText(e.target.value)}
                  placeholder="ระบุชื่อเครื่อง"
                  className="input py-1.5 px-2.5 text-xs font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 w-36 text-center"
                  title="ปรับแก้ข้อความเครื่องปัจจุบันที่จะพิมพ์ลงบนป้าย"
                />
                {machineText !== (currentCyl?.NewMC || '') && (
                  <button
                    type="button"
                    onClick={handleResetMachine}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title="คืนค่าเดิมจากฐานข้อมูล"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="btn bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              title="สั่งพิมพ์ Tack เครื่องปัจจุบัน ขนาด 20cm x 7cm"
            >
              <Printer size={16} />
              <span>สั่งพิมพ์ Tack (20cm × 7cm)</span>
            </button>
          </div>
        </div>

        {/* Dimension & Specification Info Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
              <Maximize2 size={12} />
              ขนาด: กว้าง 20 cm × ยาว 7 cm
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bbf7d0] border border-emerald-400 inline-block" />
              พื้นหลังสีเขียวอ่อน · ตัวหนังสือสีดำ
            </span>
            <span className="text-slate-500">
              (พิมพ์เฉพาะ "เครื่องปัจจุบัน" เท่านั้น เต็มพื้นที่พอดี)
            </span>
          </div>

          {currentCyl && (
            <div className="text-slate-400 font-mono">
              ซีเรียลอ้างอิง: <span className="text-slate-600 dark:text-slate-300 font-bold">{currentCyl.Serial_NOW || '—'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── PREVIEW CANVAS (SCREEN PREVIEW & PRINTABLE TARGET) ──────────── */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        {!currentCyl && !machineText ? (
          <div className="card p-12 text-center text-slate-400">
            <Disc size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold">ไม่พบข้อมูลกระบอกสำหรับพิมพ์ Tack</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Dimension Marker (Width 20cm) */}
            <div className="w-[756px] max-w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-1 print:hidden">
              <span>|← 0 cm</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">ความกว้าง 20 cm (200 mm)</span>
              <span>20 cm →|</span>
            </div>

            <div className="flex items-center">
              {/* Dimension Marker (Height 7cm) */}
              <div className="h-[264px] flex flex-col items-center justify-between text-[10px] font-mono text-slate-400 mr-1.5 py-1 print:hidden select-none">
                <span>↑</span>
                <span className="rotate-[-90deg] whitespace-nowrap font-bold text-emerald-700 dark:text-emerald-400">
                  ยาว 7 cm
                </span>
                <span>↓</span>
              </div>

              {/* ── 20cm x 7cm TAG CONTAINER ── */}
              <div
                id="printable-machine-tag"
                className="relative flex items-center justify-center select-none shadow-xl border-2 border-dashed border-emerald-600"
                style={{
                  width: '200mm',
                  height: '70mm',
                  maxWidth: '200mm',
                  maxHeight: '70mm',
                  backgroundColor: '#bbf7d0', // Light green
                  color: '#000000', // Black text
                  boxSizing: 'border-box',
                  padding: '4mm 6mm',
                  overflow: 'hidden',
                }}
              >
                {/* Main Hero Machine Text */}
                <span
                  className="font-black tracking-tight select-all text-center leading-none"
                  style={{
                    fontSize,
                    color: '#000000',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  {machineText || currentCyl?.NewMC || '—'}
                </span>
              </div>
            </div>

            {/* Hint message under preview */}
            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5 print:hidden">
              <span>💡 คำแนะนำ: กดปุ่ม</span>
              <strong className="text-emerald-700 dark:text-emerald-400">"สั่งพิมพ์ Tack (20cm × 7cm)"</strong>
              <span>หรือกด Ctrl+P เพื่อพิมพ์ติดกระบอกทันที</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
