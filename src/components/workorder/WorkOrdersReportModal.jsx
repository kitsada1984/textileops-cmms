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
} from 'lucide-react'
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

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex flex-col items-center">
      {/* ── TOP ACTION BAR (Screen only, hidden on print) ─────────────── */}
      <div className="sticky top-0 z-20 w-full bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl backdrop-blur-md print:hidden">
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
              ตรวจสอบข้อมูลก่อนสั่งพิมพ์ หรือบันทึกเป็น PDF ขนาด A4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              showSignatures
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-transparent text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="แสดงหรือซ่อนช่องลงนามท้ายรายงาน"
          >
            ช่องลงนาม: {showSignatures ? 'แสดง' : 'ซ่อน'}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/25 px-4 py-2 font-bold"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน (Print A4)</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
