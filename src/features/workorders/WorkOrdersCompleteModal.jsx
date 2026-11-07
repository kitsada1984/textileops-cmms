import { Check, CheckCircle2, Clock } from 'lucide-react'
import Modal from '../../components/ui/Modal'

// Complete-job modal moved verbatim from WorkOrders (props only).
export function WorkOrdersCompleteModal({ completeModalOpen, compJob, compCalcDuration, compEndDate, compEndTime, compSubmitting, setCompEndDate, setCompEndTime, setCompleteModalOpen, handleCompleteJob, openInterruptionModal, canEditDate = true }) {
  return (
    <>
      {completeModalOpen && compJob && (
        <Modal
          open={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          title="บันทึกจบงานซ่อม (Complete Job)"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>รหัสงาน (Job ID):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {compJob.Job_ID || compJob['Job ID']}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>เครื่องจักร & งาน:</span>
                <span className="font-bold" style={{ color: 'var(--text-900)' }}>
                  {compJob.MC} (KI: {compJob.KI})
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-500)' }}>เวลาเริ่มงาน:</span>
                <span className="font-mono" style={{ color: 'var(--text-700)' }}>
                  {compJob.StartDate} {compJob.StartTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">วันที่จบงาน * {!canEditDate && <span className="font-normal">(เฉพาะ admin แก้ไขได้)</span>}</label>
                <input
                  type="date"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  className="input font-mono"
                  required
                  disabled={!canEditDate}
                />
              </div>
              <div>
                <label className="label">เวลาจบงาน *</label>
                <input
                  type="time"
                  value={compEndTime}
                  onChange={(e) => setCompEndTime(e.target.value)}
                  className="input font-mono"
                  required
                />
              </div>
            </div>

            {/* Duration Breakdown with Sunday & Interruption Deduction */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">เวลารวมทั้งหมด (Gross):</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{compCalcDuration.grossDurationText || '—'}</span>
              </div>
              {compCalcDuration.offShiftMinutes > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                    <span>🌙 หักเวลานอกกะทำงาน (12 ชม./วัน):</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    - {compCalcDuration.offShiftDurationText}
                  </span>
                </div>
              )}
              {compCalcDuration.sundayMinutes > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1 font-semibold">
                    <span>🏖️ หักวันอาทิตย์ (วันหยุดโรงงาน):</span>
                  </span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    - {compCalcDuration.sundayDurationText}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  <Clock size={12} />
                  <span>เวลาที่สูญเสียไป (งานแทรก):</span>
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  - {compCalcDuration.lostDurationText || '0 นาที'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>👉 เวลาทำงานสุทธิ (ใช้คิด KPI):</span>
                </span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {compCalcDuration.netDurationText || compCalcDuration.durationText}
                </span>
              </div>
            </div>

            {/* Quick Button to manage interruptions right inside complete modal */}
            <div className="flex justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => openInterruptionModal(compJob)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
              >
                <Clock size={13} />
                <span>+ จัดการงานแทรก / เวลาที่เสียไป</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCompleteJob}
                disabled={compSubmitting}
                className="btn-success"
              >
                <Check size={14} />
                <span>{compSubmitting ? 'กำลังบันทึก...' : 'ยืนยันจบงาน'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
