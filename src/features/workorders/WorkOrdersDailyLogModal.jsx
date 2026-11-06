import { Ban, CalendarClock, Check, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { WORK_ORDER_STATUS_OPTIONS, getJobDailyLogs, getWorkOrderDetails, getWorkOrderStatusMeta } from './workOrderNormalize.js'

// Daily-progress modal moved verbatim from WorkOrders (props only).
export function WorkOrdersDailyLogModal({ dailyLogModalOpen, dailyLogJob, setDailyLogModalOpen, dailyLogDate, setDailyLogDate, dailyLogDetails, setDailyLogDetails, dailyLogHours, setDailyLogHours, dailyLogStatus, setDailyLogStatus, dailyLogTechs, setDailyLogTechs, dailyLogSubmitting, cancellingJobSubmitting, handleSaveDailyLog, handleDeleteDailyLog, openCancelJobConfirm, technicians, allJobs, canEdit, canDelete }) {
  return (
    <>
      {dailyLogModalOpen && dailyLogJob && (() => {
        const currentJob =
          allJobs.find(
            (j) =>
              (j.id && j.id === dailyLogJob.id) ||
              (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
              (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
          ) || dailyLogJob
        const jobLogs = getJobDailyLogs(currentJob)
        const jobStatusMeta = getWorkOrderStatusMeta(currentJob.Status)
        const currentDetails = getWorkOrderDetails(currentJob)
        const jobIdDisplay = currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID

        return (
          <Modal
            open={dailyLogModalOpen}
            onClose={() => setDailyLogModalOpen(false)}
            title={`อัปเดตความคืบหน้างานประจำวัน • ${jobIdDisplay}`}
          >
            <div className="space-y-4 text-xs">
              {/* Job Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      {jobIdDisplay}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {currentJob.MC}
                    </span>
                    <span className="text-slate-500">
                      (KI: {currentJob.KI || '—'}{currentJob.Design ? ` • ${currentJob.Design}` : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">สถานะปัจจุบัน:</span>
                    <span className={`badge ${jobStatusMeta.badgeClass}`}>
                      {jobStatusMeta.label}
                    </span>
                  </div>
                </div>
                {currentDetails !== '—' && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">อาการ/รายละเอียดตั้งต้น: </span>
                    {currentDetails}
                  </div>
                )}
              </div>

              {/* Previous Daily Updates Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CalendarClock size={14} className="text-indigo-500" />
                    <span>ประวัติความคืบหน้าแต่ละวัน ({jobLogs.length} รายการ)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    อัปเดตเฉพาะเมื่อมีความเคลื่อนไหว
                  </span>
                </div>

                {jobLogs.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    ยังไม่มีบันทึกความคืบหน้ารายวันสำหรับใบสั่งงานนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[...jobLogs].reverse().map((entry, idx) => {
                      const entryMeta = getWorkOrderStatusMeta(entry.status)
                      return (
                        <div
                          key={entry.id || idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                📅 {entry.date}
                              </span>
                              <span className={`badge text-[10px] ${entryMeta.badgeClass}`}>
                                {entryMeta.label}
                              </span>
                              {entry.hours && (
                                <span className="font-mono text-slate-500 text-[11px]">
                                  ⏱️ {entry.hours} ชม.
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>บันทึกโดย: {entry.recorded_by || '—'}</span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDailyLog(entry.id)}
                                  className="text-slate-400 hover:text-red-500 p-0.5"
                                  title="ลบรายการนี้"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium pl-1">
                            {entry.details}
                          </div>

                          {Array.isArray(entry.techs) && entry.techs.length > 0 && (
                            <div className="text-[10px] text-slate-500 pl-1">
                              ช่าง: {entry.techs.join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* New Progress Update Form */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>➕ บันทึกความคืบหน้าใหม่ (เมื่อจบวัน / มีการเปลี่ยนแปลง)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="label text-[11px]">วันที่ *</label>
                    <input
                      type="date"
                      value={dailyLogDate}
                      onChange={(e) => setDailyLogDate(e.target.value)}
                      className="input font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="label text-[11px]">สถานะ ณ สิ้นวัน *</label>
                    <select
                      value={dailyLogStatus}
                      onChange={(e) => setDailyLogStatus(e.target.value)}
                      className="select text-xs font-semibold"
                    >
                      {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.fullLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px]">ชั่วโมงทำงานวันนี้ (ถ้ามี)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="เช่น 4 ชม."
                      value={dailyLogHours}
                      onChange={(e) => setDailyLogHours(e.target.value)}
                      className="input font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Technicians Checklist */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="label text-[11px] mb-0">ช่างที่ปฏิบัติงานในวันนี้</label>
                    <span className="text-[10px] text-slate-400">คลิกเลือกหรือยกเลิก</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {technicians.map((t, i) => {
                      const isSel = dailyLogTechs.includes(t.Name)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setDailyLogTechs((prev) =>
                              prev.includes(t.Name)
                                ? prev.filter((name) => name !== t.Name)
                                : [...prev, t.Name]
                            )
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          {isSel && <Check size={11} strokeWidth={3} />}
                          <span>{t.Name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Details Textarea */}
                <div>
                  <label className="label text-[11px]">รายละเอียดความคืบหน้า / สิ่งที่ทำได้ในวันนี้ *</label>
                  <textarea
                    rows={3}
                    placeholder="เช่น ตรวจเช็คระบบไฟเสร็จแล้ว มอเตอร์ไหม้ รออะไหล่เข้าวันพรุ่งนี้..."
                    value={dailyLogDetails}
                    onChange={(e) => setDailyLogDetails(e.target.value)}
                    className="input text-xs w-full resize-none"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDailyLogModalOpen(false)}
                  className="btn-outline px-2.5 sm:px-3.5 py-2 text-xs shrink-0 font-medium"
                  disabled={dailyLogSubmitting || cancellingJobSubmitting}
                >
                  ปิด
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={openCancelJobConfirm}
                    className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 transition-colors flex items-center justify-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                    disabled={dailyLogSubmitting || cancellingJobSubmitting}
                    title="ยกเลิกใบสั่งงานนี้ (มีป๊อปอัปยืนยัน)"
                  >
                    <Ban size={13} className="shrink-0" />
                    <span>ยกเลิกงานนี้</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDailyLog}
                  disabled={dailyLogSubmitting || cancellingJobSubmitting || !dailyLogDetails.trim()}
                  className="btn-primary flex-1 sm:flex-initial sm:ml-auto px-2.5 sm:px-5 py-2 text-xs flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
                >
                  <Check size={14} className="shrink-0" />
                  <span>{dailyLogSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกความคืบหน้า'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </>
  )
}
