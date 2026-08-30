import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  QrCode as QrIcon,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Wrench,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'
import { getDirectImageUrl, getImageFallbackUrls, getFullResolutionImageUrl } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../utils/imageFileProcessor'

/* ── DOCUMENT THEME CONFIGURATION ─────────────────────────────────────────── */
const DOC_THEMES = {
  machine: {
    accent: '#2563eb',
    gradient: 'from-blue-600 to-indigo-700',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    border: '#bfdbfe',
    icon: '🏭',
    code: 'MC-SPEC',
    enType: 'Machine Data Sheet',
  },
  cylinder: {
    accent: '#0284c7',
    gradient: 'from-sky-600 to-blue-700',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    border: '#bae6fd',
    icon: '⚙️',
    code: 'CYL-SPEC',
    enType: 'Cylinder Data Sheet',
  },
  workorder: {
    accent: '#4f46e5',
    gradient: 'from-indigo-600 to-violet-700',
    badgeBg: '#e0e7ff',
    badgeText: '#3730a3',
    border: '#c7d2fe',
    icon: '📋',
    code: 'WO-JOB',
    enType: 'Work Order Report',
  },
  repair_request: {
    accent: '#e11d48',
    gradient: 'from-rose-600 to-red-700',
    badgeBg: '#ffe4e6',
    badgeText: '#9f1239',
    border: '#fecdd3',
    icon: '⚠️',
    code: 'RR-REP',
    enType: 'Machine Repair Request',
  },
  pmplan: {
    accent: '#7c3aed',
    gradient: 'from-violet-600 to-purple-700',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
    border: '#ddd6fe',
    icon: '📅',
    code: 'PM-PLAN',
    enType: 'Preventive Maintenance Plan',
  },
  centercheck: {
    accent: '#0d9488',
    gradient: 'from-teal-600 to-emerald-700',
    badgeBg: '#ccfbf1',
    badgeText: '#115e59',
    border: '#99f6e4',
    icon: '📐',
    code: 'CC-INSP',
    enType: 'Center Check Report',
  },
  needle: {
    accent: '#059669',
    gradient: 'from-emerald-600 to-teal-700',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    border: '#a7f3d0',
    icon: '🪡',
    code: 'NDL-REP',
    enType: 'Needle Inspection Report',
  },
  sparepart: {
    accent: '#d97706',
    gradient: 'from-amber-600 to-orange-700',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    border: '#fde68a',
    icon: '📦',
    code: 'SP-INV',
    enType: 'Spare Part Data Sheet',
  },
  purchasing: {
    accent: '#9333ea',
    gradient: 'from-purple-600 to-indigo-700',
    badgeBg: '#f3e8ff',
    badgeText: '#6b21a8',
    border: '#e9d5ff',
    icon: '🛒',
    code: 'PR-REQ',
    enType: 'Purchase Request',
  },
  general: {
    accent: '#475569',
    gradient: 'from-slate-700 to-slate-900',
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    border: '#e2e8f0',
    icon: '📄',
    code: 'DOC-SYS',
    enType: 'System Document',
  },
}

/* ── STATUS BADGE HELPER ─────────────────────────────────────────────────── */
function getStatusStyle(status = '') {
  const norm = String(status || '').toUpperCase()
  if (norm.includes('APPROVED') || norm.includes('อนุมัติ') || norm.includes('ซ่อมเสร็จ') || norm.includes('COMPLETED') || norm.includes('ปกติ') || norm.includes('ผ่าน') || norm.includes('RUNNING')) {
    return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' }
  }
  if (norm.includes('REJECTED') || norm.includes('ไม่อนุมัติ') || norm.includes('BREAKDOWN') || norm.includes('ต่ำกว่าเกณฑ์') || norm.includes('ควรเปลี่ยน') || norm.includes('CRITICAL') || norm.includes('ด่วนที่สุด') || norm.includes('มาก')) {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' }
  }
  if (norm.includes('WAIT_PARTS') || norm.includes('รออะไหล่')) {
    return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', dot: '#a855f7' }
  }
  // Pending / In progress / Default
  return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', dot: '#f59e0b' }
}

/* ── ATTACHED PHOTO ITEM COMPONENT ───────────────────────────────────────── */
function PdfAttachedPhotoItem({ item, index, totalCount, docAccent }) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [error, setError] = useState(false)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  const rawUrl = typeof item === 'object' && item !== null ? (item.url || item.localUrl || item.src) : item
  const caption = typeof item === 'object' && item !== null && item.caption ? item.caption : `รูปถ่ายชิ้นส่วน #${index + 1}`
  const fallbacks = getImageFallbackUrls(rawUrl)
  const fullResUrl = getFullResolutionImageUrl(rawUrl)

  useEffect(() => {
    let active = true
    setError(false)
    setFallbackIdx(0)
    const baseSrc = getDirectImageUrl(rawUrl, 'w1200')
    if (!baseSrc) {
      setResolvedSrc('')
      return
    }
    if (baseSrc.startsWith('data:image/heic') || baseSrc.startsWith('data:image/heif')) {
      convertHeicDataUrlIfNeeded(baseSrc).then((converted) => {
        if (active) setResolvedSrc(converted)
      })
    } else {
      setResolvedSrc(baseSrc)
    }
    return () => {
      active = false
    }
  }, [rawUrl])

  const handleImgError = () => {
    if (fallbackIdx < fallbacks.length - 1) {
      const next = fallbackIdx + 1
      setFallbackIdx(next)
      setResolvedSrc(fallbacks[next])
    } else {
      setError(true)
    }
  }

  const isSingle = totalCount === 1

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-200 bg-white flex flex-col shadow-xs transition-all ${isSingle ? 'max-w-xl mx-auto' : ''}`}>
      {/* Photo Viewport */}
      <div className={`relative bg-slate-900/5 flex items-center justify-center overflow-hidden group ${isSingle ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        {!error && resolvedSrc ? (
          <>
            <img
              src={resolvedSrc}
              alt={caption}
              className="w-full h-full object-contain bg-slate-950/20"
              crossOrigin="anonymous"
              loading="eager"
              onError={handleImgError}
            />
            {fullResUrl && (
              <a
                href={fullResUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="เปิดดูรูปภาพขนาดเต็ม"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 print:hidden shadow-md backdrop-blur-xs flex items-center gap-1 text-[10px]"
              >
                <ExternalLink size={12} />
                <span>ดูรูปเต็ม</span>
              </a>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-slate-400 text-center gap-1.5 w-full h-full bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
              <ImageIcon size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-700">{caption}</span>
            {rawUrl && typeof rawUrl === 'string' && (
              <span className="text-[9px] text-slate-400 font-mono truncate max-w-[200px]">
                {rawUrl.includes('drive.google.com') ? 'Google Drive Asset' : 'Local / Online File'}
              </span>
            )}
          </div>
        )}

        {/* Index Tag Badge */}
        {totalCount > 1 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9.5px] font-bold backdrop-blur-xs flex items-center gap-1">
            <span>📷 รูปที่ {index + 1}</span>
          </div>
        )}
      </div>

      {/* Photo Caption Strip */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: docAccent }} />
          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[260px]">
            {caption}
          </span>
        </div>
        <span className="text-[9px] text-slate-400 font-mono">ATTACHMENT #{index + 1}</span>
      </div>
    </div>
  )
}

/* ── PHOTO SHOWCASE GALLERY COMPONENT ────────────────────────────────────── */
function PdfPhotoGallery({ images = [], docAccent = '#2563eb' }) {
  if (!images || images.length === 0) return null

  const isSingle = images.length === 1
  const isTwo = images.length === 2

  return (
    <div className="space-y-2 mt-5">
      <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-3.5 rounded-xs" style={{ backgroundColor: docAccent }} />
          <span>รูปถ่ายตัวอย่างและสภาพชิ้นส่วน (Attached Sample & Inspection Photos)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold lowercase">
          ({images.length} {images.length === 1 ? 'photo' : 'photos'})
        </span>
      </div>

      <div
        className={`p-3 bg-slate-50/80 rounded-xl border border-slate-200 ${
          isSingle ? 'block' : isTwo ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 sm:grid-cols-3 gap-3'
        }`}
      >
        {images.map((img, i) => (
          <PdfAttachedPhotoItem
            key={i}
            item={img}
            index={i}
            totalCount={images.length}
            docAccent={docAccent}
          />
        ))}
      </div>
    </div>
  )
}

/* ── MAIN PDF PREVIEW MODAL ──────────────────────────────────────────────── */
export default function PdfPreviewModal({
  open,
  onClose,
  docType = 'general',
  title = 'เอกสารระบบ / System Document',
  docNo = '',
  docDate = '',
  status = '',
  priority = '',
  record = {},
  sections = [],
  tableData = null,
  images = [],
  remarks = '',
  signatories = [
    { title: 'ผู้จัดทำ / ผู้ขอ', name: '', date: '' },
    { title: 'ช่างผู้ปฏิบัติงาน', name: '', date: '' },
    { title: 'หัวหน้างาน / ผู้ตรวจเช็ค', name: '', date: '' },
    { title: 'ผู้อนุมัติ / ผู้จัดการ', name: '', date: '' },
  ],
}) {
  const printRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const handlePrint = () => {
    window.print()
  }

  const theme = DOC_THEMES[docType] || DOC_THEMES.general
  const statusCfg = getStatusStyle(status)
  const currentDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')
  const formattedDocDate = docDate
    ? (String(docDate).includes('/') ? docDate : format(new Date(docDate), 'dd/MM/yyyy'))
    : format(new Date(), 'dd/MM/yyyy')

  const qrValue = typeof window !== 'undefined'
    ? window.location.origin + (docNo ? `?doc=${encodeURIComponent(docNo)}` : '')
    : ''

  return createPortal(
    <div className="fixed inset-0 z-[999] flex flex-col bg-slate-900/85 backdrop-blur-md overflow-y-auto">
      {/* ── TOP ACTION BAR (Hidden when printing) ── */}
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

      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-pdf-document, #printable-pdf-document * {
            visibility: visible;
          }
          #printable-pdf-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      {/* ── PREVIEW WRAPPER ── */}
      <div className="flex-1 p-4 sm:p-8 flex justify-center items-start">
        {/* ── A4 PAPER SHEET ── */}
        <div
          id="printable-pdf-document"
          ref={printRef}
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-200 flex flex-col justify-between font-sans relative overflow-hidden"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Top Decorative Accent Line */}
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ background: `linear-gradient(90deg, ${theme.accent}, #0f172a)` }}
          />

          {/* ── TOP HEADER ── */}
          <div>
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5 gap-4">
              {/* Company Logo & Identity */}
              <div className="flex items-center gap-3.5">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="w-13 h-13 object-contain drop-shadow-xs"
                />
                <div>
                  <h1 className="text-[17px] font-black tracking-tight text-slate-950 uppercase leading-none">
                    GEMMA KNITS CO., LTD.
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 tracking-wide uppercase mt-1">
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

            {/* ── SECTION GROUPS ── */}
            <div className="space-y-4">
              {sections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  {sec.title && (
                    <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                      <span className="w-2 h-3.5 rounded-xs" style={{ backgroundColor: theme.accent }} />
                      <span>{sec.title}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
                    {sec.fields.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className={`${f.full ? 'col-span-2 sm:col-span-4' : 'col-span-1 sm:col-span-2'} p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs`}
                      >
                        <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tight mb-0.5">
                          {f.label}
                        </div>

                        {/* Interactive Belt Checks */}
                        {f.belts && Array.isArray(f.belts) ? (
                          <div className="grid grid-cols-5 gap-1.5 mt-1">
                            {f.belts.map((b) => (
                              <div
                                key={b.tape}
                                className={`flex items-center justify-center gap-1 py-1 px-1 rounded-md border text-center font-bold text-[10.5px] ${
                                  b.checked
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                <span>เทป {b.tape}:</span>
                                <span>{b.checked ? '☑ ผ่าน' : '☐'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`text-[12px] font-bold text-slate-900 ${f.mono ? 'font-mono' : ''} break-words mt-0.5 leading-snug`}>
                            {f.value !== null && f.value !== undefined && f.value !== '' ? String(f.value) : '—'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ── DETAIL TABLE (IF PROVIDED) ── */}
              {tableData && tableData.rows && tableData.rows.length > 0 && (
                <div className="space-y-1.5 mt-4">
                  {tableData.title && (
                    <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                      <span className="w-2 h-3.5 rounded-xs" style={{ backgroundColor: theme.accent }} />
                      <span>{tableData.title}</span>
                    </div>
                  )}

                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white text-[10.5px] font-black uppercase">
                          {tableData.headers.map((h, hIdx) => (
                            <th key={hIdx} className="py-2 px-2.5 border-r border-slate-700 last:border-r-0 tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-2.5 border-r border-slate-200 last:border-r-0 font-medium text-slate-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── ATTACHED PHOTO GALLERY (STANDARDIZED PHOTO SHOWCASE) ── */}
              <PdfPhotoGallery images={images} docAccent={theme.accent} />

              {/* ── REMARKS / NOTES ── */}
              {remarks && (
                <div className="space-y-1 mt-4">
                  <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                    <span className="w-2 h-3.5 bg-slate-600 rounded-xs" />
                    <span>หมายเหตุและบันทึกเพิ่มเติม (Remarks & Observations)</span>
                  </div>
                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed border-l-4" style={{ borderLeftColor: theme.accent }}>
                    {remarks}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM SECTION: SIGNATURES & VERIFICATION ── */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 space-y-5">
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
                <div className="font-bold text-slate-600">หน้า 1 จาก 1 · เอกสารควบคุมภายใน บจก. เจมม่า นิตส์</div>
                <div className="font-mono text-[8.5px] text-slate-400">
                  DOC-REF: {docNo || 'N/A'} · GEN: {currentDateStr}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

