import { CalendarClock, CheckCircle2, Clock, Pause, Pencil, Printer, Trash2 } from 'lucide-react'
import { WORK_ORDER_STATUS_OPTIONS } from './workOrderNormalize.js'
import { getProblemCauseMeta } from '../../constants/problemCause'

// Row cells moved verbatim from the WorkOrders table mapper (props only).
export function WorkOrderJobTypeBadge({ job }) {
  return (
                        <td>
                          <span
                            className={`badge ${
                              job.JobType === 'DESIGN'
                                ? 'badge-purple'
                                : job.JobType === 'PM'
                                ? 'badge-yellow'
                                : job.JobType === 'SETUP'
                                ? 'badge-indigo'
                                : 'badge-blue'
                            }`}
                          >
                            {job.JobType === 'DESIGN' ? '🎨 ปรับแบบ' : job.JobType === 'PM' ? '🧹 PM' : job.JobType === 'SETUP' ? '⚙️ เตรียมเครื่อง' : '🛠️ แก้ไข'}
                          </span>
                        </td>
  )
}

export function WorkOrderProblemCell({ job }) {
  return (
                        <td>
                          {job.ProblemCause || job.problem_cause ? (
                            (() => {
                              const meta = getProblemCauseMeta(job.ProblemCause || job.problem_cause)
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}
                                  title={`สาเหตุปัญหา: ${meta.label}`}
                                >
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>
                              )
                            })()
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
  )
}

export function WorkOrderDetailsCell({ job, detailsDisplay, dailyLogs, latestDailyLog, openDailyLogModal }) {
  return (
                        <td className="max-w-[240px] min-w-[130px]" style={{ color: 'var(--text-700)' }}>
                          <div className="truncate text-xs font-medium" title={detailsDisplay}>
                            {detailsDisplay}
                          </div>
                          {latestDailyLog && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                openDailyLogModal(job)
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 cursor-pointer transition-colors max-w-full truncate"
                              title={`อัปเดตงานล่าสุด (${latestDailyLog.date}): ${latestDailyLog.details} (คลิกเพื่อดูประวัติหรืออัปเดต)`}
                            >
                              <span className="flex-shrink-0">📝 {latestDailyLog.date?.slice(5) || latestDailyLog.date}:</span>
                              <span className="truncate font-normal text-slate-600 dark:text-slate-300">{latestDailyLog.details}</span>
                              {dailyLogs.length > 1 && (
                                <span className="px-1 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-[9px] flex-shrink-0">
                                  +{dailyLogs.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
  )
}

export function WorkOrderStatusCell({ job, statusMeta, canEdit, handleQuickStatusChange }) {
  return (
                        <td>
                          {canEdit && !job.IsDeleted ? (
                            <select
                              value={statusMeta.value}
                              onChange={(e) => handleQuickStatusChange(job, e.target.value)}
                              className={`badge ${statusMeta.badgeClass} cursor-pointer font-bold border-0 pr-5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
                              title="คลิกเพื่อเปลี่ยนสถานะใบสั่งงาน"
                              aria-label="สถานะใบสั่งงาน"
                            >
                              {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold"
                                >
                                  {opt.icon} {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`badge ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          )}
                        </td>
  )
}

export function WorkOrderDurationCell({ job, sla, isCompleted }) {
  return (
                        <td className="font-mono" style={{ color: isCompleted ? 'var(--text-900)' : 'var(--text-400)' }}>
                          <div className="font-bold text-xs">
                            {job.WorkingDurationText || (isCompleted ? `${job.WorkingHoursDecimal} ชม.` : (sla.durationText && sla.durationText !== '—' ? sla.durationText : 'กำลังจับเวลา...'))}
                          </div>
                          {sla.offShiftHoursDecimal > 0 && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 mt-0.5 font-semibold">
                              <span>🌙 หักนอกกะ {sla.offShiftDurationText}</span>
                            </div>
                          )}
                          {sla.sundayHoursDecimal > 0 && (
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 flex items-center gap-0.5 mt-0.5 font-semibold">
                              <span>🏖️ หักวันอาทิตย์ {sla.sundayDurationText}</span>
                            </div>
                          )}
                          {sla.lostHoursDecimal > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
                              <Clock size={10} />
                              <span>หักงานแทรก {sla.lostDurationText}</span>
                            </div>
                          )}
                          {sla.activeInterruption && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border animate-pulse mt-0.5 ${sla.activeInterruption.no_tech_remaining ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'}`}
                              title={sla.activeInterruption.no_tech_remaining ? `ไม่มีช่างอยู่ (หยุดนับเวลา): ${sla.activeInterruption.task_name}` : `กำลังพักงาน: ${sla.activeInterruption.task_name}`}
                            >
                              {sla.activeInterruption.no_tech_remaining ? '🛑 ไม่มีช่างอยู่ (หยุดเวลา)' : '⏸️ กำลังพักงาน'}
                            </span>
                          )}
                        </td>
  )
}

export function WorkOrderRowActions({ job, sla, isCompleted, canEdit, canDelete, dailyLogs, openInterruptionModal, openCompleteModal, openDailyLogModal, openPrintModal, openEditModal, handleDeleteJob }) {
  return (
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Interruption / Lost Time Button */}
                            {!job.IsDeleted && (
                              <button
                                type="button"
                                onClick={() => openInterruptionModal(job)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  sla.activeInterruption
                                    ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30'
                                    : sla.lostHoursDecimal > 0
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600'
                                }`}
                                title={sla.activeInterruption ? `กำลังทำงานแทรก: ${sla.activeInterruption.task_name} (คลิกเพื่อจบงานแทรก)` : 'บันทึกงานแทรก / เวลาที่สูญเสียไป'}
                              >
                                {sla.activeInterruption ? (
                                  <>
                                    <Pause size={13} />
                                    <span className="hidden sm:inline">พักงานอยู่</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={13} />
                                    {sla.lostHoursDecimal > 0 && <span className="text-[10px]">({sla.lostHoursDecimal}ช.)</span>}
                                  </>
                                )}
                              </button>
                            )}

                            {/* Complete Job Button (if in progress) */}
                            {!isCompleted && !job.IsDeleted && canEdit && (
                              <button
                                type="button"
                                onClick={() => openCompleteModal(job)}
                                className="btn-success px-3 py-1.5 text-xs min-h-[44px] rounded-xl font-bold flex items-center gap-1"
                                title="บันทึกจบงาน"
                              >
                                <CheckCircle2 size={13} />
                                <span>จบงาน</span>
                              </button>
                            )}

                            {/* Daily Work Progress Update Button */}
                            {!job.IsDeleted && canEdit && (
                              <button
                                type="button"
                                onClick={() => openDailyLogModal(job)}
                                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  dailyLogs.length > 0
                                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600'
                                }`}
                                title="อัปเดตงานประจำวัน / บันทึกจบวัน (ความคืบหน้า & สถานะ)"
                              >
                                <CalendarClock size={14} />
                                <span className="hidden xl:inline text-[11px]">อัปเดต</span>
                                {dailyLogs.length > 0 && (
                                  <span className="text-[10px] font-mono px-1 rounded-full bg-indigo-600 text-white">
                                    {dailyLogs.length}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Print A4 Report */}
                            <button
                              onClick={() => openPrintModal(job)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors"
                              title="พิมพ์ใบสั่งงาน A4"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Edit Job */}
                            {!job.IsDeleted && canEdit && (
                              <button
                                onClick={() => openEditModal(job)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors"
                                title="แก้ไขใบสั่งงาน"
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {/* Delete Job */}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteJob(job)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="ลบใบสั่งงาน"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
  )
}
