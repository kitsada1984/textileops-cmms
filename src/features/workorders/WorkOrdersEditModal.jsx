import { Check } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { WORK_ORDER_STATUS_OPTIONS, getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { PROBLEM_CAUSE_OPTIONS } from '../../constants/problemCause'

// Edit-job modal moved verbatim from WorkOrders (props only).
export function WorkOrdersEditModal({ editModalOpen, editJob, editTechs, editSubmitting, setEditJob, setEditModalOpen, handleEditJob, toggleEditTechSelection, technicians, inUseMachines, matchedEditActiveMachine }) {
  return (
    <>
      {editModalOpen && editJob && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`แก้ไขใบสั่งงาน ${editJob.Job_ID || editJob['Job ID']}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center justify-between">
                  <span>รหัสเครื่อง (M/C)</span>
                  {inUseMachines.length > 0 && (
                    <span className="text-[10px] font-normal text-blue-500 dark:text-blue-400">
                      (ในระบบ: {inUseMachines.length} เครื่อง)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  list="wo-inuse-machines"
                  placeholder="เช่น DA-306M หรือพิมพ์ค้นหา"
                  value={editJob.MC || ''}
                  onChange={(e) => setEditJob({ ...editJob, MC: e.target.value })}
                  className="input font-mono font-bold uppercase"
                />
                {matchedEditActiveMachine && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50/70 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">In-use</span>
                    {matchedEditActiveMachine.location && (
                      <span>· โซน: <b className="text-slate-800 dark:text-slate-200">{matchedEditActiveMachine.location}</b></span>
                    )}
                    {matchedEditActiveMachine.serial && (
                      <span>· ซีเรียล: <span className="font-mono">{matchedEditActiveMachine.serial}</span></span>
                    )}
                    {(matchedEditActiveMachine.diameter || matchedEditActiveMachine.gauge) && (
                      <span>· ขนาด: <span className="font-mono">{matchedEditActiveMachine.diameter ? `${matchedEditActiveMachine.diameter}"` : ''} {matchedEditActiveMachine.gauge ? `${matchedEditActiveMachine.gauge}G` : ''}</span></span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="label">รหัสงาน (KI)</label>
                <input
                  type="text"
                  value={editJob.KI || ''}
                  onChange={(e) => setEditJob({ ...editJob, KI: e.target.value })}
                  className="input font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">แบบงาน (Design)</label>
                <input
                  type="text"
                  value={editJob.Design || ''}
                  onChange={(e) => setEditJob({ ...editJob, Design: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">เลขม้วน (Roll No)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editJob.RollNo || editJob.roll_no || ''}
                  onChange={(e) => setEditJob({ ...editJob, RollNo: e.target.value, roll_no: e.target.value })}
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="label">สาเหตุปัญหา (Root Cause)</label>
                <select
                  value={editJob.ProblemCause || editJob.problem_cause || ''}
                  onChange={(e) => setEditJob({ ...editJob, ProblemCause: e.target.value })}
                  className="select font-semibold"
                >
                  <option value="">-- ไม่ระบุ / ระบุภายหลัง --</option>
                  {PROBLEM_CAUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">ประเภทงาน (Job Type)</label>
                <select
                  value={editJob.JobType || 'REPAIR'}
                  onChange={(e) => setEditJob({ ...editJob, JobType: e.target.value })}
                  className="select font-semibold"
                >
                  <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                  <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                  <option value="PM">🧹 PM / ล้างเครื่อง</option>
                  <option value="SETUP">⚙️ เตรียมเครื่อง (Setup)</option>
                </select>
              </div>
              <div>
                <label className="label">สถานะ (Status)</label>
                <select
                  value={getWorkOrderStatusMeta(editJob.Status).value}
                  onChange={(e) => setEditJob({ ...editJob, Status: e.target.value })}
                  className="select font-semibold"
                >
                  {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.fullLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">รายละเอียด / อาการเสียงานซ่อม</label>
              <input
                type="text"
                placeholder="ระบุอาการเสีย หรือรายละเอียดการปรับแต่ง..."
                value={editJob.Comment || editJob.Details || editJob.details || editJob.Problem || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setEditJob({
                    ...editJob,
                    Comment: val,
                    Details: val,
                    details: val,
                    Problem: val,
                    Detail: val,
                  })
                }}
                className="input"
              />
            </div>

            {/* Technicians Checklist */}
            <div className="space-y-1.5">
              <label className="label">ช่างปรับผู้ปฏิบัติงาน</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                {technicians.map((t, idx) => {
                  const isChecked = editTechs.includes(t.Name)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEditTechSelection(t.Name)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                        isChecked
                          ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{t.Name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleEditJob}
                disabled={editSubmitting}
                className="btn-primary"
              >
                <Check size={14} />
                <span>{editSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
