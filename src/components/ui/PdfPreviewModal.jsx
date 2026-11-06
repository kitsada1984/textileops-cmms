import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  QrCode as QrIcon,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Layers,
  Wrench,
} from 'lucide-react'
import { getDirectImageUrl, getImageFallbackUrls, getFullResolutionImageUrl } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../utils/imageFileProcessor'
import { getStatusStyle, buildSelectableItems, resolvePrintHeader } from './pdfPrintMeta'
import { buildReportFilename } from './reportTheme'
import { PdfReportCover } from './PdfReportCover'
import { PdfSummaryCards } from './PdfSummaryCards'
import { PdfReportChart } from './PdfReportChart'
import { PdfTopBar } from './PdfTopBar'
import { PdfSectionPicker } from './PdfSectionPicker'
import { PdfDocHeader } from './PdfDocHeader'
import { PdfSignatures } from './PdfSignatures'
import { PdfDataTable } from './PdfDataTable'



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
  historyTable = null,
  images = [],
  remarks = '',
  cover = null,
  summary = [],
  chart = null,
  signatories = [
    { title: 'ผู้จัดทำ / ผู้ขอ', name: '', date: '' },
    { title: 'ช่างผู้ปฏิบัติงาน', name: '', date: '' },
    { title: 'หัวหน้างาน / ผู้ตรวจเช็ค', name: '', date: '' },
    { title: 'ผู้อนุมัติ / ผู้จัดการ', name: '', date: '' },
  ],
}) {
  const printRef = useRef(null)

  // ── PRINT SECTION SELECTION ──
  // null = print everything (default behavior, unchanged). Otherwise a Set of
  // excluded section keys chosen from the picker bar (screen-only, never printed).
  const [excludedKeys, setExcludedKeys] = useState(null)

  const selectableItems = useMemo(() => {
    return buildSelectableItems(sections, tableData, historyTable, images, remarks, signatories)
  }, [sections, tableData, historyTable, images, remarks, signatories])

  const isExcluded = (key) => excludedKeys instanceof Set && excludedKeys.has(key)
  const toggleSectionKey = (key) =>
    setExcludedKeys((prev) => {
      const next = prev instanceof Set ? new Set(prev) : new Set()
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const selectAllSections = () => setExcludedKeys(null)

  // reset to "print everything" whenever a new document is opened
  useEffect(() => {
    if (open) setExcludedKeys(null)
  }, [open, docNo])

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
    // Spec filename (report_{date}.pdf): browsers suggest document.title.
    const prevTitle = document.title
    document.title = buildReportFilename()
    const restore = () => {
      document.title = prevTitle
    }
    window.addEventListener('afterprint', restore, { once: true })
    window.print()
    setTimeout(restore, 1000)
  }

  const { theme, currentDateStr, formattedDocDate, qrValue } = resolvePrintHeader({ docType, docDate, docNo })
  const statusCfg = getStatusStyle(status)

  return createPortal(
    <div className="fixed inset-0 z-[999] flex flex-col bg-slate-900/85 backdrop-blur-md overflow-y-auto">
      {/* ── TOP ACTION BAR (Hidden when printing) ── */}
      <PdfTopBar title={title} docNo={docNo} theme={theme} handlePrint={handlePrint} onClose={onClose} />

      {/* ── SECTION PICKER BAR (screen-only, never printed) ── */}
      <PdfSectionPicker selectableItems={selectableItems} excludedKeys={excludedKeys} selectAllSections={selectAllSections} toggleSectionKey={toggleSectionKey} isExcluded={isExcluded} />

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
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
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
          #printable-pdf-document table {
            page-break-inside: auto;
          }
          #printable-pdf-document tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-report-footer {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            align-items: center;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
            padding: 4mm 12mm;
          }
          .print-report-footer .pageno::after {
            content: counter(page);
          }
          .print-report-footer .pagecount::after {
            content: counter(pages);
          }
        }
        .print-report-footer {
          display: none;
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
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-200 flex flex-col justify-between font-report relative overflow-hidden"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Top Decorative Accent Line */}
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ background: `linear-gradient(90deg, ${theme.accent}, #0f172a)` }}
          />

          {/* ── COVER PAGE (opt-in) ── */}
          <PdfReportCover cover={cover} currentDateStr={currentDateStr} />

          {/* ── TOP HEADER ── */}
          <PdfDocHeader theme={theme} title={title} docNo={docNo} formattedDocDate={formattedDocDate} status={status} statusCfg={statusCfg} priority={priority} currentDateStr={currentDateStr} />

          {/* ── SUMMARY STAT CARDS (opt-in) ── */}
          <PdfSummaryCards items={summary} />

            {/* ── SECTION GROUPS ── */}
            <div className="space-y-4">
              {sections.map((sec, idx) => isExcluded(`sec-${idx}`) ? null : (
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

              <PdfDataTable gateKey='table' table={tableData} themeAccent={theme.accent} isExcluded={isExcluded} />

              <PdfDataTable gateKey='history' table={historyTable} themeAccent={theme.accent} isExcluded={isExcluded} />

              {/* ── CHART (opt-in) ── */}
              <PdfReportChart chart={chart} />

              {/* ── ATTACHED PHOTO GALLERY (STANDARDIZED PHOTO SHOWCASE) ── */}
              {!isExcluded('images') && <PdfPhotoGallery images={images} docAccent={theme.accent} />}

              {/* ── REMARKS / NOTES ── */}
              {!isExcluded('remarks') && remarks && (
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
          <PdfSignatures signatories={signatories} isExcluded={isExcluded} qrValue={qrValue} docNo={docNo} currentDateStr={currentDateStr} />

          {/* ── PRINT FOOTER: date · doc · page x/y (print only) ── */}
          <div className="print-report-footer">
            <span>{currentDateStr}</span>
            <span>{docNo || title}</span>
            <span>หน้า <span className="pageno" /> / <span className="pagecount" /></span>
          </div>
        </div>
    </div>,
    document.body
  )
}

