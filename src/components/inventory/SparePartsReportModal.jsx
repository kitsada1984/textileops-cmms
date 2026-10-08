import { useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Building2,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'
import { getSparePartImageUrl, stripSparePartImageMeta } from '../../utils/sparePartImage'
import { getPartStockStatus } from '../../utils/inventory'

/**
 * Helper to get spare part display name (EN or TH)
 */
function getPartName(part = {}) {
  return part.Part_Name_EN || part.Part_Name_TH || '—'
}

/**
 * Status meta for spare parts
 */
const STATUS_META = {
  IN_STOCK: {
    label: 'สต็อกปกติ',
    enLabel: 'In Stock',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
  },
  LOW_STOCK: {
    label: 'สต็อกต่ำ',
    enLabel: 'Low Stock',
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
  },
  OUT_OF_STOCK: {
    label: 'สินค้าหมด',
    enLabel: 'Out of Stock',
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
  },
}

export default function SparePartsReportModal({
  open = false,
  onClose,
  items = [],
  filterContext = '',
  currentUserName = '',
}) {
  const printRef = useRef(null)
  const [showThumbnails, setShowThumbnails] = useState(true)

  // Report calculations
  const summary = useMemo(() => {
    let totalQty = 0
    let totalValuation = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    items.forEach((item) => {
      const qty = Number(item.Stock_Qty || 0)
      const min = Number(item.Min_Qty || 0)
      const price = Number(item.Unit_Price || 0)
      const val = qty * price

      totalQty += qty
      totalValuation += val

      const status = getPartStockStatus(qty, min)
      if (status === 'OUT_OF_STOCK') outOfStockCount++
      else if (status === 'LOW_STOCK') lowStockCount++
    })

    return {
      totalItems: items.length,
      totalQty,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      reorderNeeded: lowStockCount + outOfStockCount,
    }
  }, [items])

  if (!open) return null

  const handlePrint = () => {
    window.print()
  }

  const printDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
      {/* ── TOP ACTION BAR (Screen only) ─────────────────────────── */}
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              พรีวิวรายงานตารางรายการอะไหล่ (A4 Portrait)
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {items.length} รายการ
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              ตรวจสอบข้อมูลก่อนสั่งพิมพ์ หรือเลือกบันทึกเป็น PDF ในขนาดกระดาษมาตรฐาน A4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle Photos */}
          <button
            type="button"
            onClick={() => setShowThumbnails((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showThumbnails
                ? 'bg-slate-800 text-blue-300 border-blue-500/40 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="เปิด/ปิดการแสดงภาพตัวอย่างในตาราง"
          >
            {showThumbnails ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} />}
            <span>{showThumbnails ? 'แสดงรูปภาพ' : 'ซ่อนรูปภาพ'}</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Printer size={16} />
            <span>พิมพ์เอกสาร / บันทึก PDF (A4)</span>
          </button>

          {/* Close Button */}
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
          #printable-spare-parts-report,
          #printable-spare-parts-report * {
            visibility: visible;
          }
          #printable-spare-parts-report {
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
          #printable-spare-parts-report table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }
          #printable-spare-parts-report thead {
            display: table-header-group !important;
          }
          #printable-spare-parts-report tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          #printable-spare-parts-report tfoot {
            display: table-footer-group !important;
          }
          .no-print {
            display: none !important;
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
          id="printable-spare-parts-report"
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
                      ระบบบริหารจัดการคลังอะไหล่และงานซ่อมบำรุงโรงทอ
                    </p>
                  </div>
                </div>

                {/* Report Title & Metadata Badge */}
                <div className="text-right flex flex-col items-end">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black tracking-wide uppercase mb-1">
                    INTERNAL REPORT · สต็อกอะไหล่
                  </div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    รายงานทะเบียนและสต็อกอะไหล่
                  </h2>
                  <p className="text-[10.5px] font-medium text-slate-500">
                    SPARE PARTS INVENTORY & VALUATION REPORT
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

              {/* Filter Context Ribbon (if filtered) */}
              {filterContext && (
                <div className="mt-2.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[10.5px] text-slate-600 flex items-center justify-between">
                  <span className="font-medium">
                    📌 <strong>เงื่อนไขรายงาน:</strong> {filterContext}
                  </span>
                  <span className="font-bold text-slate-700">
                    รวม {items.length} รายการ
                  </span>
                </div>
              )}
            </div>

            {/* ── 2. SUMMARY KPI STATS CARDS ───────────────────── */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {/* Total Parts */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    รายการอะไหล่ทั้งหมด
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                    {summary.totalItems.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">รายการ</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Package size={14} />
                </div>
              </div>

              {/* Total Stock Qty */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    จำนวนคงเหลือรวม
                  </div>
                  <div className="text-base font-black text-emerald-700 mt-0.5 font-mono">
                    {summary.totalQty.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">ชิ้น</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 size={14} />
                </div>
              </div>

              {/* Total Valuation */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                    มูลค่าสต็อกรวม
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                    ฿{Math.round(summary.totalValuation).toLocaleString()}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <DollarSign size={14} />
                </div>
              </div>

              {/* Low / Out of stock */}
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                summary.reorderNeeded > 0
                  ? 'border-rose-200 bg-rose-50/70 text-rose-800'
                  : 'border-slate-200 bg-slate-50/70'
              }`}>
                <div>
                  <div className="text-[9.5px] font-bold uppercase tracking-wider opacity-80">
                    ต่ำกว่าเกณฑ์ / หมด
                  </div>
                  <div className={`text-base font-black mt-0.5 font-mono ${
                    summary.reorderNeeded > 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}>
                    {summary.reorderNeeded.toLocaleString()} <span className="text-[10px] font-normal opacity-70">รายการ</span>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                  summary.reorderNeeded > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  <AlertTriangle size={14} />
                </div>
              </div>
            </div>

            {/* ── 3. DATA TABLE (A4 Portrait Fit) ──────────────── */}
            <div className="flex-1">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2 px-1.5 text-center w-7 border border-slate-900">#</th>
                    {showThumbnails && (
                      <th className="py-2 px-1 text-center w-8 border border-slate-900">รูป</th>
                    )}
                    <th className="py-2 px-2 w-20 border border-slate-900">รหัสอะไหล่</th>
                    <th className="py-2 px-2 border border-slate-900">ชื่ออะไหล่ / รายละเอียด</th>
                    <th className="py-2 px-2 w-16 border border-slate-900">หมวดหมู่</th>
                    <th className="py-2 px-1.5 text-center w-12 border border-slate-900">คลัง</th>
                    <th className="py-2 px-2 text-right w-14 border border-slate-900">คงเหลือ</th>
                    <th className="py-2 px-1.5 text-right w-11 border border-slate-900">ขั้นต่ำ</th>
                    <th className="py-2 px-1.5 text-center w-10 border border-slate-900">หน่วย</th>
                    <th className="py-2 px-2 text-right w-16 border border-slate-900">ราคา/หน่วย</th>
                    <th className="py-2 px-2 text-right w-18 border border-slate-900">มูลค่ารวม</th>
                    <th className="py-2 px-2 text-center w-16 border border-slate-900">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showThumbnails ? 12 : 11}
                        className="py-10 text-center text-slate-400 border border-slate-200"
                      >
                        ไม่พบข้อมูลรายการอะไหล่ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    items.map((part, idx) => {
                      const qty = Number(part.Stock_Qty || 0)
                      const min = Number(part.Min_Qty || 0)
                      const price = Number(part.Unit_Price || 0)
                      const val = qty * price
                      const status = getPartStockStatus(qty, min)
                      const meta = STATUS_META[status] || STATUS_META.IN_STOCK
                      const imgUrl = getSparePartImageUrl(part)
                      const partName = getPartName(part)
                      const isLow = qty <= min && qty > 0
                      const isOut = qty <= 0

                      return (
                        <tr
                          key={part.id || part._id || part.Part_Code || idx}
                          className={`${
                            idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          } border-b border-slate-200`}
                        >
                          {/* Row Number */}
                          <td className="py-1.5 px-1 text-center font-mono text-[9px] text-slate-500 border border-slate-200">
                            {idx + 1}
                          </td>

                          {/* Thumbnail */}
                          {showThumbnails && (
                            <td className="py-1 px-1 text-center border border-slate-200">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt=""
                                  className="w-7 h-7 rounded object-cover mx-auto border border-slate-200"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                                  <ImageIcon size={12} />
                                </div>
                              )}
                            </td>
                          )}

                          {/* Part Code */}
                          <td className="py-1.5 px-2 font-mono font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                            {part.Part_Code || '—'}
                          </td>

                          {/* Part Name & Sub info */}
                          <td className="py-1.5 px-2 border border-slate-200">
                            <div className="font-bold text-slate-950 leading-tight">
                              {partName}
                            </div>
                            {part.Part_Name_TH && part.Part_Name_EN && (
                              <div className="text-[9px] text-slate-500 leading-tight">
                                {part.Part_Name_TH}
                              </div>
                            )}
                            {part.Compatible_Machines && (
                              <div className="text-[8.5px] text-blue-600/90 leading-tight mt-0.5 truncate max-w-[170px]">
                                ใช้กับ: {Array.isArray(part.Compatible_Machines) ? part.Compatible_Machines.join(', ') : part.Compatible_Machines}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-1.5 px-2 text-slate-700 border border-slate-200 whitespace-nowrap">
                            {part.Category || '—'}
                          </td>

                          {/* Location / Store */}
                          <td className="py-1.5 px-1.5 text-center font-semibold border border-slate-200 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                              part.Location_Store === 'Store'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : part.Location_Store?.startsWith('GMK')
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {part.Location_Store || '—'}
                            </span>
                          </td>

                          {/* Stock Qty */}
                          <td className={`py-1.5 px-2 text-right font-mono font-bold border border-slate-200 ${
                            isOut
                              ? 'text-rose-600 font-black'
                              : isLow
                                ? 'text-amber-600 font-black'
                                : 'text-slate-900'
                          }`}>
                            {qty.toLocaleString()}
                          </td>

                          {/* Min Qty */}
                          <td className="py-1.5 px-1.5 text-right font-mono text-slate-500 border border-slate-200">
                            {min ? min.toLocaleString() : '—'}
                          </td>

                          {/* Unit */}
                          <td className="py-1.5 px-1.5 text-center text-slate-600 border border-slate-200 whitespace-nowrap">
                            {part.Unit || 'ชิ้น'}
                          </td>

                          {/* Unit Price */}
                          <td className="py-1.5 px-2 text-right font-mono text-slate-700 border border-slate-200 whitespace-nowrap">
                            {price > 0 ? `฿${price.toLocaleString()}` : '—'}
                          </td>

                          {/* Total Valuation */}
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                            {val > 0 ? `฿${val.toLocaleString()}` : '—'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-1.5 px-1.5 text-center border border-slate-200 whitespace-nowrap">
                            <span
                              className="px-1.5 py-0.5 rounded text-[8.5px] font-black inline-block border"
                              style={{
                                backgroundColor: meta.bg,
                                color: meta.text,
                                borderColor: meta.border,
                              }}
                            >
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>

                {/* ── GRAND TOTAL FOOTER ROW ───────────────────── */}
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-950 border-t-2 border-slate-900">
                      <td
                        colSpan={showThumbnails ? 6 : 5}
                        className="py-2 px-3 text-right text-[10px] uppercase tracking-wider border border-slate-300"
                      >
                        รวมทั้งสิ้น ({items.length} รายการ):
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[10.5px] text-emerald-800 font-black border border-slate-300">
                        {summary.totalQty.toLocaleString()}
                      </td>
                      <td colSpan={3} className="py-2 px-2 text-center text-slate-400 border border-slate-300">
                        —
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-[10.5px] text-blue-900 font-black border border-slate-300 whitespace-nowrap">
                        ฿{Math.round(summary.totalValuation).toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center border border-slate-300">
                        <span className="text-[9px] text-slate-500 font-normal">ครบถ้วน</span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── 4. SIGNATORIES SECTION ───────────────────────── */}
            <div className="mt-8 pt-4 border-t border-slate-300 avoid-break">
              <div className="grid grid-cols-3 gap-6 text-center text-slate-800">
                {/* 1. Prepared by */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    ผู้จัดทำรายงาน (Prepared By)
                  </div>
                  <div className="w-40 border-b border-dotted border-slate-400 mb-1.5" />
                  <div className="text-[9.5px] text-slate-600">
                    ( {currentUserName || '...................................................'} )
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    วันที่: ...... / ...... / ............
                  </div>
                </div>

                {/* 2. Stock Controller */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    ผู้ตรวจสอบคลัง (Stock Controller)
                  </div>
                  <div className="w-40 border-b border-dotted border-slate-400 mb-1.5" />
                  <div className="text-[9.5px] text-slate-600">
                    ( ................................................... )
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    วันที่: ...... / ...... / ............
                  </div>
                </div>

                {/* 3. Approved by */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                    ผู้อนุมัติ / ผจก. (Approved By)
                  </div>
                  <div className="w-40 border-b border-dotted border-slate-400 mb-1.5" />
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
                <span>พิมพ์เมื่อ {printDateStr} น. · หน้า 1 / 1 (ต่อเนื่องตามจำนวนหน้าจริง)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
