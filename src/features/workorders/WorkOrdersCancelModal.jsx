import { AlertTriangle, Ban } from 'lucide-react'
import Modal from '../../components/ui/Modal'

// Cancel-confirm modal moved verbatim from WorkOrders (props only).
export function WorkOrdersCancelModal({ cancelJobModalOpen, dailyLogJob, cancelJobReason, setCancelJobReason, cancellingJobSubmitting, setCancelJobModalOpen, handleConfirmCancelJob }) {
  return (
    <>
      {cancelJobModalOpen && dailyLogJob && (() => {
        const jobIdDisplay = dailyLogJob.Job_ID || dailyLogJob['Job ID'] || dailyLogJob.WO_ID
        return (
          <Modal
            open={cancelJobModalOpen}
            onClose={() => !cancellingJobSubmitting && setCancelJobModalOpen(false)}
            title="⚠️ ยืนยันการยกเลิกใบสั่งงาน"
            size="sm"
            className="border-rose-300 dark:border-rose-900/60 shadow-rose-950/20"
          >
            <div className="space-y-4 text-xs">
              {/* Alert Warning Box */}
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                    คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้?
                  </div>
                  <div className="text-rose-700 dark:text-rose-300 leading-relaxed">
                    ใบสั่งงาน <span className="font-mono font-bold">{jobIdDisplay}</span> (เครื่อง {dailyLogJob.MC || '-'}) จะถูกเปลี่ยนสถานะเป็น <span className="font-bold">"ยกเลิก" (CANCELLED)</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Input (Required) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผลในการยกเลิกใบสั่งงาน <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelJobReason}
                  onChange={(e) => setCancelJobReason(e.target.value)}
                  placeholder="ระบุสาเหตุที่ต้องยกเลิกงาน เช่น ยกเลิกแผนผลิต, เครื่องถูกย้าย, สั่งงานซ้ำซ้อน..."
                  className="input text-xs w-full resize-none border-rose-200 dark:border-rose-900/50 focus:border-rose-500 focus:ring-rose-500"
                  disabled={cancellingJobSubmitting}
                  required
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  * ข้อมูลเหตุผลจะถูกบันทึกลงในประวัติความคืบหน้ารายวัน (Daily Logs) เพื่อความโปร่งใส
                </span>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelJobModalOpen(false)}
                  disabled={cancellingJobSubmitting}
                  className="btn-outline px-4 text-xs"
                >
                  กลับ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelJob}
                  disabled={cancellingJobSubmitting || !cancelJobReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Ban size={14} />
                  <span>{cancellingJobSubmitting ? 'กำลังยกเลิกงาน...' : 'ยืนยันยกเลิกงานนี้'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </>
  )
}
