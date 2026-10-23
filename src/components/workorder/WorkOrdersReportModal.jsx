import { useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Tag,
  Building2,
  Calendar,
  Layers,
  FileText,
  User,
  Wrench,
  Percent,
  Download,
  FileDown,
  Share2,
  Send,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import gemmaLogo from '../../assets/logo-gemma.png'
import {
  calculateSlaPerformance,
  formatMinutesToThai,
} from '../../api/entities'
import {
  getWorkOrderStatusMeta,
  getWorkOrderDetails,
  getLatestDailyLog,
  WORK_ORDER_TYPE_OPTIONS,
  WORK_ORDER_STATUS_OPTIONS,
} from '../../pages/WorkOrders'
import {
  loadLineSettings,
  getSupervisorLineIds,
  sendLineNotification,
} from '../../utils/line'

export default function WorkOrdersReportModal({
  open = false,
  onClose,
  items = [],
  filterContext = {},
  kpiTargets = {},
  currentUserName = '',
}) {
  const printRef = useRef(null)
  const [orientation, setOrientation] = useState('landscape') // 'landscape' | 'portrait'
  const [showSignatures, setShowSignatures] = useState(true)
  const [lineShareModalOpen, setLineShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendingLine, setSendingLine] = useState(false)
  const [lineSendStatus, setLineSendStatus] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const {
    typeFilters = [],
    statusFilters = [],
    search = '',
    showDeleted = false,
  } = filterContext

  // Summary statistics for filtered items
  const summary = useMemo(() => {
    let total = items.length
    let inProgress = 0
    let waiting = 0
    let completed = 0
    let onTimeCount = 0
    let evaluatedSlaCount = 0

    items.forEach((job) => {
      const meta = getWorkOrderStatusMeta(job.Status)
      if (meta.isCompleted) {
        completed++
      } else if (meta.value === 'IN_PROGRESS') {
        inProgress++
      } else {
        waiting++
      }

      const sla = calculateSlaPerformance(job, kpiTargets)
      if (sla) {
        evaluatedSlaCount++
        if (sla.isOnTime) onTimeCount++
      }
    })

    const slaComplianceRate = evaluatedSlaCount > 0 ? Math.round((onTimeCount / evaluatedSlaCount) * 100) : 100

    return {
      total,
      inProgress,
      waiting,
      completed,
      onTimeCount,
      slaComplianceRate,
    }
  }, [items, kpiTargets])

  if (!open) return null

  const handlePrint = () => {
    window.print()
  }

  const printDateStr = format(new Date(), 'dd/MM/yyyy HH:mm')

  // Build filter label badges for report header
  const activeFilterLabels = []
  if (typeFilters && typeFilters.length > 0) {
    const typeNames = typeFilters.map((t) => {
      const opt = WORK_ORDER_TYPE_OPTIONS.find((o) => o.value === t)
      return opt ? opt.label : t
    })
    activeFilterLabels.push(`ประเภท: ${typeNames.join(', ')}`)
  } else {
    activeFilterLabels.push('ประเภท: ทุกประเภท')
  }

  if (statusFilters && statusFilters.length > 0) {
    const statusNames = statusFilters.map((s) => {
      const opt = WORK_ORDER_STATUS_OPTIONS.find((o) => o.value === s)
      return opt ? opt.label : s
    })
    activeFilterLabels.push(`สถานะ: ${statusNames.join(', ')}`)
  } else {
    activeFilterLabels.push('สถานะ: ทั้งหมด')
  }

  if (search && search.trim()) {
    activeFilterLabels.push(`ค้นหา: "${search.trim()}"`)
  }

  if (showDeleted) {
    activeFilterLabels.push('รายการที่ลบ')
  }

  // ── PDF DOWNLOAD HANDLER (Direct .pdf file export) ─────────────────
  const handleDownloadPdf = async () => {
    if (!printRef.current || generatingPdf) return
    setGeneratingPdf(true)
    try {
      const element = printRef.current
      const isLandscape = orientation === 'landscape'

      const html2canvasFn = typeof html2canvas === 'function' ? html2canvas : (html2canvas?.default || html2canvas)
      const canvas = await html2canvasFn(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      if (!canvas || !canvas.width || !canvas.height) {
        throw new Error('Canvas capture returned invalid output')
      }

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      const pdfWidth = isLandscape ? 297 : 210
      const pdfHeight = isLandscape ? 210 : 297

      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage('a4', orientation)
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pdfHeight
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
      pdf.save(`TextileOps_WorkOrders_Report_${timestamp}.pdf`)
    } catch (err) {
      console.error('PDF download error:', err)
      window.print()
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ── CSV EXPORT HANDLER ─────────────────────────────────────────────
  const handleDownloadCsv = () => {
    const headers = [
      'ลำดับ',
      'Job ID',
      'เครื่องจักร (M/C)',
      'KI / แบบผ้า',
      'ประเภทงาน',
      'อาการเสีย / รายละเอียดงาน',
      'ความคืบหน้าล่าสุด',
      'สถานะ',
      'ช่างผู้รับผิดชอบ',
      'เวลาเริ่มงาน',
      'ระยะเวลาดำเนินงาน',
      'ประสิทธิภาพ SLA',
      'เป้าหมาย SLA (ชม.)',
      'ผู้บันทึก',
      'วันที่บันทึก',
    ]

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = items.map((job, idx) => {
      const typeOpt = WORK_ORDER_TYPE_OPTIONS.find((t) => t.value === job.JobType)
      const statusMeta = getWorkOrderStatusMeta(job.Status)
      const details = getWorkOrderDetails(job)
      const latestLog = getLatestDailyLog(job)
      const sla = calculateSlaPerformance(job, kpiTargets)
      const targetHours = kpiTargets[job.JobType] || 0
      const startTimeStr = `${job.StartDate || ''} ${job.StartTime || ''}`.trim() || '—'
      const durationStr = job.WorkingDurationText || (job.TotalDowntimeMinutes ? formatMinutesToThai(job.TotalDowntimeMinutes) : '—')
      const slaStr = sla ? (sla.isOnTime ? `ทันกำหนด (${sla.actualHours} ชม.)` : `เกินกำหนด (+${sla.overdueHours} ชม.)`) : '—'

      return [
        idx + 1,
        escapeCsv(job.Job_ID || job.id),
        escapeCsv(job.MC || '—'),
        escapeCsv(job.KI ? `${job.KI} ${job.Design ? `(${job.Design})` : ''}` : job.Design || '—'),
        escapeCsv(typeOpt ? typeOpt.label : job.JobType || '—'),
        escapeCsv(details || '—'),
        escapeCsv(latestLog?.progress_note || '—'),
        escapeCsv(statusMeta.label),
        escapeCsv(job.Technicians || '—'),
        escapeCsv(startTimeStr),
        escapeCsv(durationStr),
        escapeCsv(slaStr),
        escapeCsv(targetHours ? `${targetHours} ชม.` : '—'),
        escapeCsv(job.CreatedBy || '—'),
        escapeCsv(job.created_at || '—'),
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
    link.href = url
    link.download = `TextileOps_WorkOrders_Report_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ── LINE SHARE MESSAGE BUILDER ──────────────────────────────────────
  const lineMessageText = useMemo(() => {
    const filterSummary = activeFilterLabels.join(' | ')
    const topJobs = items.slice(0, 8).map((job, idx) => {
      const statusMeta = getWorkOrderStatusMeta(job.Status)
      const details = getWorkOrderDetails(job)
      const shortDetails = details ? (details.length > 25 ? details.slice(0, 25) + '...' : details) : '—'
      return `${idx + 1}. ${job.Job_ID || job.id} | ${job.MC || '—'} | ${statusMeta.label} | ${shortDetails}`
    }).join('\n')

    const moreText = items.length > 8 ? `\n...และอีก ${items.length - 8} รายการ` : ''

    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://textileops-cmms.pages.dev'

    return `📋 รายงานสรุปใบสั่งงาน (TextileOps CMMS)
📅 วันที่: ${printDateStr}
👤 ผู้จัดทำ: ${currentUserName || 'ผู้ใช้งาน'}
🔍 ตัวกรอง: ${filterSummary}

📊 สรุปผลงาน (${items.length} รายการ):
• งานทั้งหมด: ${summary.total} รายการ
• ⏳ กำลังซ่อม: ${summary.inProgress} รายการ
• 🕒 รอดำเนินการ: ${summary.waiting} รายการ
• ✅ ปิดงานแล้ว: ${summary.completed} รายการ
• 🎯 อัตราทำตาม SLA: ${summary.slaComplianceRate}%

📝 รายการใบสั่งงาน:
${topJobs || 'ไม่มีรายการงาน'}${moreText}

🔗 ตรวจสอบรายละเอียดเต็มในระบบ:
${origin}`
  }, [items, activeFilterLabels, printDateStr, currentUserName, summary])

  const handleCopyLineMessage = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(lineMessageText)
      } else {
        const input = document.createElement('textarea')
        input.value = lineMessageText
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Copy error:', err)
    }
  }

  const handleOpenLineApp = () => {
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(lineMessageText)}`
    window.open(url, '_blank')
  }

  const handlePushToSystemGroup = async () => {
    setSendingLine(true)
    setLineSendStatus(null)
    try {
      const cfg = loadLineSettings()
      const targetIds = getSupervisorLineIds(cfg)

      let res = null
      if (cfg.channel_access_token && targetIds.length > 0) {
        res = await sendLineNotification({
          token: cfg.channel_access_token,
          targetId: targetIds[0],
          messages: [{ type: 'text', text: lineMessageText }],
          type: 'text',
        })
      } else if (cfg.line_notify_token) {
        res = await sendLineNotification({
          notifyToken: cfg.line_notify_token,
          textMessage: '\n' + lineMessageText,
          type: 'notify',
        })
      } else if (targetIds.length > 0) {
        res = await sendLineNotification({
          targetId: targetIds[0],
          messages: [{ type: 'text', text: lineMessageText }],
          type: 'text',
        })
      } else {
        setLineSendStatus({
          ok: false,
          message: 'ยังไม่ได้ระบุกลุ่ม LINE ซ่อมบำรุงในหน้าตั้งค่า หรือคุณสามารถกด "เปิดแอป LINE" เพื่อแชร์ได้ทันที',
        })
        setSendingLine(false)
        return
      }

      if (res && (res.ok || res.status === 200)) {
        setLineSendStatus({
          ok: true,
          message: 'ส่งสรุปรายงานเข้ากลุ่ม LINE เรียบร้อยแล้ว',
        })
      } else {
        setLineSendStatus({
          ok: false,
          message: res?.error || 'ไม่สามารถส่งข้อความได้ กรุณาลองใช้ปุ่ม "เปิดแอป LINE" แทน',
        })
      }
    } catch (e) {
      setLineSendStatus({
        ok: false,
        message: e?.message || 'ส่งแจ้งเตือนไม่สำเร็จ กรุณากด "เปิดแอป LINE" เพื่อแชร์โดยตรง',
      })
    } finally {
      setSendingLine(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
      {/* ── TOP ACTION BAR (Screen only, hidden on print) ─────────────── */}
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-md print:hidden flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              พรีวิวรายงานใบสั่งงานซ่อมบำรุง (A4 {orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'})
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {items.length} รายการ (ตามตัวกรอง)
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              ตรวจสอบข้อมูล สั่งพิมพ์ บันทึก PDF ดาวน์โหลด CSV หรือแชร์สรุปเข้า LINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Orientation Toggle */}
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                orientation === 'landscape'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              แนวนอน (Landscape)
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                orientation === 'portrait'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              แนวตั้ง (Portrait)
            </button>
          </div>

          {/* Toggle Signatures */}
          <button
            type="button"
            onClick={() => setShowSignatures(!showSignatures)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              showSignatures
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="แสดงหรือซ่อนช่องลงนามท้ายรายงาน"
          >
            ช่องลงนาม: {showSignatures ? 'แสดง' : 'ซ่อน'}
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 disabled:opacity-50 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ดาวน์โหลดรายงานเป็นไฟล์ PDF (.pdf) ลงเครื่องทันที"
          >
            {generatingPdf ? (
              <Loader2 size={14} className="animate-spin text-rose-400" />
            ) : (
              <FileDown size={14} className="text-rose-400" />
            )}
            <span className="hidden sm:inline">ดาวน์โหลด</span>
            <span>PDF</span>
          </button>

          {/* Download CSV Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel / CSV (.csv)"
          >
            <Download size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">ดาวน์โหลด</span>
            <span>CSV</span>
          </button>

          {/* Share LINE Button */}
          <button
            type="button"
            onClick={() => {
              setLineSendStatus(null)
              setLineShareModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="แชร์สรุปรายงานเข้า LINE"
          >
            <Share2 size={14} className="text-[#06c755]" />
            <span>แชร์ LINE</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/25 px-3.5 py-1.5 font-bold cursor-pointer"
            title="พิมพ์รายงานทางเครื่องพิมพ์ หรือบันทึก PDF ผ่านเบราว์เซอร์"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── PRINTABLE REPORT CONTAINER ─────────────────────────────────── */}
      <div className="p-4 sm:p-8 w-full flex justify-center print:p-0">
        <div
          ref={printRef}
          className={`bg-white text-slate-900 shadow-2xl rounded-2xl p-6 sm:p-8 w-full print:p-0 print:shadow-none print:rounded-none print:w-full ${
            orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'
          }`}
          style={{ minHeight: orientation === 'landscape' ? '210mm' : '297mm' }}
        >
          {/* Header section with Gemma Knits Branding */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-center gap-3.5">
              <img
                src={gemmaLogo}
                alt="Gomma Knits"
                className="h-12 w-auto object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
                  บริษัท กอมม่า นิตส์ จำกัด (Gomma Knits Co., Ltd.)
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-1">
                  ระบบบริหารงานซ่อมบำรุงและผลงานช่าง (TextileOps CMMS)
                </p>
                <p className="text-sm font-black text-blue-900 mt-1">
                  รายงานสรุปใบสั่งงานซ่อมบำรุง (Work Orders & Maintenance Report)
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-600 font-medium space-y-0.5">
              <div>
                <span className="font-bold text-slate-800">วันที่พิมพ์: </span>
                <span className="font-mono">{printDateStr}</span>
              </div>
              <div>
                <span className="font-bold text-slate-800">ผู้พิมพ์รายงาน: </span>
                <span>{currentUserName || 'ช่างผู้ใช้งานระบบ'}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                รวมทั้งสิ้น: <strong className="text-slate-900 font-bold">{items.length}</strong> รายการ
              </div>
            </div>
          </div>

          {/* Active Filter Criteria Subheader */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 text-xs flex flex-wrap items-center justify-between gap-2 print:bg-slate-50 print:border-slate-300">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Tag size={12} className="text-blue-600" />
                เงื่อนไขตัวกรอง:
              </span>
              {activeFilterLabels.map((lbl, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-300 text-slate-800 shadow-2xs"
                >
                  {lbl}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              ข้อมูล ณ หน้าต่างระบบใบสั่งงาน (ตามผลการกรองจริง)
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 text-center">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 print:bg-white print:border-slate-300">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">รายการทั้งหมด</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{summary.total}</div>
              <div className="text-[9px] text-slate-400">ใบสั่งงาน</div>
            </div>

            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 print:bg-white print:border-slate-300">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">🟡 กำลังทำ</div>
              <div className="text-lg font-black text-amber-600 font-mono mt-0.5">{summary.inProgress}</div>
              <div className="text-[9px] text-amber-700">กำลังดำเนินการ</div>
            </div>

            <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/50 print:bg-white print:border-slate-300">
              <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">🟠 รอดำเนินการ</div>
              <div className="text-lg font-black text-orange-600 font-mono mt-0.5">{summary.waiting}</div>
              <div className="text-[9px] text-orange-700">รอช่าง / รออะไหล่</div>
            </div>

            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 print:bg-white print:border-slate-300">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">🟢 เสร็จสิ้น</div>
              <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">{summary.completed}</div>
              <div className="text-[9px] text-emerald-700">ปิดงานเรียบร้อย</div>
            </div>

            <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 print:bg-white print:border-slate-300 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">🎯 ผ่านเกณฑ์ SLA</div>
              <div className="text-lg font-black text-blue-600 font-mono mt-0.5">{summary.slaComplianceRate}%</div>
              <div className="text-[9px] text-blue-700">On-Time Compliance</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl mb-4 print:border-slate-400 print:rounded-none">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 print:bg-slate-200">
                  <th className="py-2 px-2 text-center w-8">#</th>
                  <th className="py-2 px-2.5 w-24">Job ID</th>
                  <th className="py-2 px-2 w-16">เครื่อง</th>
                  <th className="py-2 px-2 w-20">KI / แบบ</th>
                  <th className="py-2 px-2 w-20">ประเภท</th>
                  <th className="py-2 px-2.5">อาการเสีย / รายละเอียดงาน</th>
                  <th className="py-2 px-2 w-20 text-center">สถานะ</th>
                  <th className="py-2 px-2 w-28">ช่างผู้ทำ</th>
                  <th className="py-2 px-2 w-24">เวลาเริ่ม</th>
                  <th className="py-2 px-2 w-20 text-center">ระยะเวลา</th>
                  <th className="py-2 px-2 w-28 text-center">SLA Performance</th>
                  <th className="py-2 px-2 w-16 text-slate-600">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {items.map((job, idx) => {
                  const statusMeta = getWorkOrderStatusMeta(job.Status)
                  const sla = calculateSlaPerformance(job, kpiTargets)
                  const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`
                  const detailsDisplay = getWorkOrderDetails(job)
                  const latestDailyLog = getLatestDailyLog(job)

                  // Status style for printing
                  let statusBg = 'bg-slate-100 text-slate-800 border-slate-300'
                  if (statusMeta.value === 'COMPLETED') statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  else if (statusMeta.value === 'IN_PROGRESS') statusBg = 'bg-amber-50 text-amber-800 border-amber-300'
                  else if (statusMeta.value === 'WAITING_TECH') statusBg = 'bg-orange-50 text-orange-800 border-orange-300'
                  else if (statusMeta.value === 'WAITING_PARTS') statusBg = 'bg-purple-50 text-purple-800 border-purple-300'
                  else if (statusMeta.value === 'WAITING_SUMMARY') statusBg = 'bg-blue-50 text-blue-800 border-blue-300'

                  // Job type label
                  const typeLabel =
                    job.JobType === 'DESIGN'
                      ? '🎨 ปรับแบบ'
                      : job.JobType === 'PM'
                      ? '🧹 PM'
                      : '🛠️ แก้ไข'

                  return (
                    <tr
                      key={job.id || idx}
                      className="even:bg-slate-50/70 hover:bg-blue-50/30 print:even:bg-slate-50/40 page-break-inside-avoid"
                      style={{ breakInside: 'avoid' }}
                    >
                      {/* No. */}
                      <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[10px]">
                        {idx + 1}
                      </td>

                      {/* Job ID */}
                      <td className="py-1.5 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {jobIdDisplay}
                      </td>

                      {/* M/C */}
                      <td className="py-1.5 px-2 font-bold text-slate-900 whitespace-nowrap">
                        {job.MC || '—'}
                      </td>

                      {/* KI / Design */}
                      <td className="py-1.5 px-2 text-slate-700 leading-tight">
                        <div className="font-mono font-semibold">{job.KI || '—'}</div>
                        {job.Design && <div className="text-[10px] text-slate-500 truncate max-w-[90px]">{job.Design}</div>}
                        {job.RollNo && <div className="text-[9px] text-slate-400 font-mono">ม้วน {job.RollNo}</div>}
                      </td>

                      {/* Type */}
                      <td className="py-1.5 px-2 whitespace-nowrap font-medium text-slate-800">
                        {typeLabel}
                      </td>

                      {/* Details & Latest daily log */}
                      <td className="py-1.5 px-2.5 text-slate-800">
                        <div className="font-medium line-clamp-2 leading-tight">
                          {detailsDisplay}
                        </div>
                        {latestDailyLog && (
                          <div className="mt-0.5 text-[9px] text-indigo-700 font-medium bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 inline-block max-w-full truncate">
                            📝 {latestDailyLog.date}: {latestDailyLog.details}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusBg}`}>
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Technicians */}
                      <td className="py-1.5 px-2 text-slate-700 leading-tight">
                        <div className="truncate max-w-[120px]" title={job.Technicians}>
                          {job.Technicians || '—'}
                        </div>
                      </td>

                      {/* Start Time */}
                      <td className="py-1.5 px-2 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}`.trim() : '—'}
                      </td>

                      {/* Duration */}
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                        {job.WorkingDurationText || (statusMeta.isCompleted ? `${job.WorkingHoursDecimal || 0}ชม.` : 'กำลังทำ')}
                      </td>

                      {/* SLA Performance */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            sla?.isOnTime
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {sla?.label || '—'}
                        </span>
                      </td>

                      {/* Created By */}
                      <td className="py-1.5 px-2 text-slate-500 text-[10px] truncate max-w-[70px]">
                        {job.CreatedBy || '—'}
                      </td>
                    </tr>
                  )
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-semibold">
                      ไม่พบข้อมูลใบสั่งงานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Optional Signatures Section */}
          {showSignatures && (
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs page-break-inside-avoid">
              <div className="space-y-12">
                <p className="font-bold text-slate-700">ผู้จัดทำรายงาน / บันทึกข้อมูล</p>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <p className="text-[11px] text-slate-500">
                  ( {currentUserName || '...................................................'} )
                  <br />
                  วันที่: ...... / ...... / ............
                </p>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-slate-700">หัวหน้าแผนกซ่อมบำรุง / ผู้ตรวจสอบ</p>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <p className="text-[11px] text-slate-500">
                  ( ................................................... )
                  <br />
                  วันที่: ...... / ...... / ............
                </p>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-slate-700">ผู้จัดการโรงงาน / ผู้อนุมัติ</p>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <p className="text-[11px] text-slate-500">
                  ( ................................................... )
                  <br />
                  วันที่: ...... / ...... / ............
                </p>
              </div>
            </div>
          )}

          {/* Report Footer Notice */}
          <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-between">
            <span>TextileOps Maintenance Management System — Confidential</span>
            <span className="font-mono">Page 1 / 1</span>
          </div>
        </div>
      </div>

      {/* ── LINE SHARE SUBMODAL ────────────────────────────────────── */}
      {lineShareModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#06c755] border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">แชร์รายงานใบสั่งงานเข้า LINE</h3>
                  <p className="text-[11px] text-slate-400">เลือกรูปแบบการแชร์ข้อความสรุปและลิงก์รายงาน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLineShareModalOpen(false)
                  setLineSendStatus(null)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Preview */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 mb-1.5 block">
                ตัวอย่างข้อความสรุปที่จะส่ง ({items.length} รายการตามตัวกรอง):
              </label>
              <textarea
                readOnly
                value={lineMessageText}
                rows={9}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Status banner if any */}
            {lineSendStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                lineSendStatus.ok 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' 
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              }`}>
                {lineSendStatus.ok ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                )}
                <span>{lineSendStatus.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Direct LINE app share */}
              <button
                type="button"
                onClick={handleOpenLineApp}
                className="w-full py-2.5 px-4 rounded-xl bg-[#06c755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <ExternalLink size={15} />
                <span>เปิดแอป LINE (แชร์ไปยังแชท / กลุ่มใดก็ได้)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Push to system group */}
                <button
                  type="button"
                  onClick={handlePushToSystemGroup}
                  disabled={sendingLine}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {sendingLine ? (
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                  ) : (
                    <Send size={14} className="text-blue-400" />
                  )}
                  <span>ส่งเข้ากลุ่ม LINE ซ่อมบำรุง</span>
                </button>

                {/* Copy message */}
                <button
                  type="button"
                  onClick={handleCopyLineMessage}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'คัดลอกเรียบร้อย!' : 'คัดลอกข้อความ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Page Print Media */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 8mm 6mm;
          }
          body {
            background: white !important;
            color: black !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>,
    document.body
  )
}
