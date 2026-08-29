import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, FileText, CheckCircle2, AlertCircle, QrCode as QrIcon, Image as ImageIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { useState } from 'react'
import gemmaLogo from '../../assets/logo-gemma.png'
import { getDirectImageUrl, getImageFallbackUrls } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../utils/imageFileProcessor'

function PdfAttachedPhoto({ src, index }) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [error, setError] = useState(false)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  const rawUrl = typeof src === 'object' && src !== null ? (src.url || src.localUrl || src.src) : src
  const fallbacks = getImageFallbackUrls(rawUrl)

  useEffect(() => {
    let active = true
    setError(false)
    setFallbackIdx(0)
    const baseSrc = getDirectImageUrl(rawUrl, 'w1000')
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

  return (
    <div className="rounded-lg overflow-hidden border border-slate-300 bg-white aspect-video flex items-center justify-center shadow-xs">
      {!error && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={`Inspection Photo ${index + 1}`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="eager"
          onError={handleImgError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2 text-slate-400 text-center gap-1 w-full h-full bg-slate-50">
          <ImageIcon size={22} className="text-blue-500" />
          <span className="text-[10px] font-bold text-slate-700">รูปถ่ายชิ้นส่วน #{index + 1}</span>
          {rawUrl && typeof rawUrl === 'string' && rawUrl.includes('drive.google.com') && (
            <span className="text-[8.5px] text-slate-400 font-mono">Google Drive File</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function PdfPreviewModal({
  open,
  onClose,
  docType = 'general', // 'workorder' | 'machine' | 'cylinder' | 'pmplan' | 'centercheck' | 'sparepart' | 'purchasing' | 'repair_request'
  title = 'เอกสารระบบ / System Document',
  docNo = '',
  docDate = '',
  status = '',
  priority = '',
  record = {},
  sections = [], // array of { title, fields: [{ label, value, full, mono }] }
  tableData = null, // { headers: [], rows: [] }
  images = [], // array of image urls or objects
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

  const currentDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')
  const formattedDocDate = docDate ? (String(docDate).includes('/') ? docDate : format(new Date(docDate), 'dd/MM/yyyy')) : format(new Date(), 'dd/MM/yyyy')
  const qrValue = window.location.origin + (docNo ? `?doc=${encodeURIComponent(docNo)}` : '')

  return createPortal(
    <div className="fixed inset-0 z-[999] flex flex-col bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      {/* ── TOP ACTION BAR (Hidden when printing) ── */}
      <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-700/80 px-4 py-3 shadow-xl print:hidden flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-white text-sm font-bold flex items-center gap-2">
              <span>{title}</span>
              {docNo && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-xs border border-slate-700">
                  {docNo}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">พรีวิวเอกสารขนาดมาตรฐาน A4 พร้อมระบบพิมพ์ตรง</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer size={15} />
            <span>พิมพ์เอกสาร / บันทึก PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="ปิดหน้าต่าง"
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
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* ── PREVIEW WRAPPER ── */}
      <div className="flex-1 p-4 sm:p-8 flex justify-center items-start">
        {/* ── A4 PAPER SHEET ── */}
        <div
          id="printable-pdf-document"
          ref={printRef}
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-200 flex flex-col justify-between font-sans relative"
          style={{ boxSizing: 'border-box' }}
        >
          {/* ── TOP HEADER ── */}
          <div>
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6 gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={gemmaLogo}
                  alt="Gemma Knits Logo"
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    GEMMA KNITS CO., LTD.
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-600 tracking-wide uppercase">
                    TEXTILE OPERATIONS CMMS · MAINTENANCE & ENGINEERING
                  </p>
                  <p className="text-[10px] text-slate-500">
                    ระบบบริหารจัดการงานบำรุงรักษาโรงงานถักผ้า
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded text-xs font-black tracking-wider uppercase mb-1">
                  {title}
                </div>
                <div className="text-[11px] font-mono text-slate-700">
                  <span className="text-slate-500 font-sans">เลขที่เอกสาร: </span>
                  <span className="font-bold">{docNo || 'DOC-' + format(new Date(), 'yyyyMMdd')}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  วันที่เอกสาร: {formattedDocDate}
                </div>
              </div>
            </div>

            {/* ── STATUS & METADATA BAR ── */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-6 text-xs">
              <div className="flex items-center gap-4">
                {status && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">สถานะ:</span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-blue-100 text-blue-800 border border-blue-200">
                      {status}
                    </span>
                  </div>
                )}
                {priority && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">ความสำคัญ:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      priority === 'ด่วนที่สุด' || priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' :
                      priority === 'ด่วน' || priority === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-slate-200 text-slate-800'
                    }`}>
                      {priority}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                พิมพ์เมื่อ: <span className="font-mono">{currentDateStr}</span>
              </div>
            </div>

            {/* ── SECTION GROUPS ── */}
            <div className="space-y-5">
              {sections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  {sec.title && (
                    <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                      <span className="w-1.5 h-3 bg-blue-600 rounded-sm"></span>
                      <span>{sec.title}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                    {sec.fields.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className={`${f.full ? 'col-span-2 sm:col-span-4' : 'col-span-1 sm:col-span-2'} p-1.5 bg-white rounded border border-slate-100`}
                      >
                        <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">
                          {f.label}
                        </div>
                        <div className={`text-xs font-semibold text-slate-900 ${f.mono ? 'font-mono' : ''} break-words mt-0.5`}>
                          {f.value !== null && f.value !== undefined && f.value !== '' ? String(f.value) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ── DETAIL TABLE (IF PROVIDED) ── */}
              {tableData && tableData.rows && tableData.rows.length > 0 && (
                <div className="space-y-1.5 mt-4">
                  {tableData.title && (
                    <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                      <span className="w-1.5 h-3 bg-blue-600 rounded-sm"></span>
                      <span>{tableData.title}</span>
                    </div>
                  )}

                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10.5px] font-black text-slate-700 uppercase">
                          {tableData.headers.map((h, hIdx) => (
                            <th key={hIdx} className="py-1.5 px-2 border-r border-slate-200 last:border-r-0">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="py-1.5 px-2 border-r border-slate-200 last:border-r-0">
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

              {/* ── ATTACHED PHOTOS (รูปถ่ายสภาพเข็ม / ชิ้นส่วน) ── */}
              {images && images.length > 0 && (
                <div className="space-y-1.5 mt-4">
                  <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                    <span className="w-1.5 h-3 bg-teal-600 rounded-sm"></span>
                    <span>รูปถ่ายสภาพเข็มและชิ้นส่วน (Attached Inspection Photos)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    {images.map((img, i) => (
                      <PdfAttachedPhoto key={i} src={img} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── REMARKS / NOTES ── */}
              {remarks && (
                <div className="space-y-1 mt-4">
                  <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1">
                    <span className="w-1.5 h-3 bg-slate-500 rounded-sm"></span>
                    <span>หมายเหตุและบันทึกเพิ่มเติม (Remarks)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {remarks}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM SECTION: QR CODE & SIGNATURES ── */}
          <div className="mt-8 pt-4 border-t-2 border-slate-800 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              {signatories.map((sig, sIdx) => (
                <div key={sIdx} className="border border-slate-300 rounded p-2.5 flex flex-col justify-between text-center min-h-[90px] bg-slate-50/40">
                  <div className="text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1">
                    {sig.title}
                  </div>
                  <div className="my-auto py-2">
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                    <div className="text-xs font-bold text-slate-800">{sig.name || '...........................................'}</div>
                  </div>
                  <div className="text-[9.5px] text-slate-500">
                    วันที่: {sig.date || '....../....../......'}
                  </div>
                </div>
              ))}
            </div>

            {/* ── FOOTER & VERIFICATION ── */}
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <QRCodeSVG value={qrValue} size={34} />
                <div>
                  <div className="font-bold text-slate-600">TEXTILEOPS CMMS VERIFIED DOCUMENT</div>
                  <div>สแกนเพื่อตรวจสอบความถูกต้องของข้อมูลผ่านระบบออนไลน์</div>
                </div>
              </div>
              <div className="text-right">
                <div>หน้า 1 จาก 1 · เอกสารควบคุมภายใน บจก. เจมม่า นิตส์</div>
                <div className="font-mono text-[8.5px]">DOC-REF: {docNo || 'N/A'} · GEN: {currentDateStr}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
