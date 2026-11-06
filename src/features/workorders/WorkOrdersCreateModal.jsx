import { Check, Plus, Send, Wrench, X } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { WORK_ORDER_STATUS_OPTIONS } from './workOrderNormalize.js'
import { PROBLEM_CAUSE_OPTIONS } from '../../constants/problemCause'

// Create-work-order modal moved verbatim from WorkOrders (props only).
export function WorkOrdersCreateModal({ createModalOpen, setCreateModalOpen, handleStartJob, submittingStart, mc, setMc, ki, setKi, design, setDesign, jobType, setJobType, status, setStatus, problemCause, setProblemCause, rollNo, setRollNo, comment, setComment, selectedTechs, toggleTechSelection, technicians, inUseMachines, matchedActiveMachine, user }) {
  return (
    <>
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          onClose={() => !submittingStart && setCreateModalOpen(false)}
          size="lg"
        >
          <div className="flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2 truncate" style={{ color: 'var(--text-900)' }}>
                  <Plus size={18} className="text-blue-500 shrink-0" />
                  <span className="truncate">บันทึกเริ่มงานซ่อม / เปิดใบสั่งงาน (Create Work Order)</span>
                </h2>
                <div className="text-[11px] sm:text-xs mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                  กรอกข้อมูลเพื่อเริ่มงาน ระบบจะสร้างรหัส Job ID และจับเวลาการทำงานให้อัตโนมัติ
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  ผู้บันทึก: <b className="text-blue-600 dark:text-blue-400 ml-1">{user?.username || user?.full_name || 'admin'}</b>
                </div>
                <button
                  type="button"
                  onClick={() => !submittingStart && setCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ปิดหน้าต่าง"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleStartJob} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* 1. M/C, KI, Design, Roll No */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label flex items-center justify-between">
                      <span>รหัสเครื่อง (M/C) *</span>
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
                      value={mc}
                      onChange={(e) => setMc(e.target.value)}
                      className="input font-mono font-bold uppercase"
                      required
                      autoFocus
                    />
                    {matchedActiveMachine && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50/70 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 animate-fadeIn">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">In-use</span>
                        {matchedActiveMachine.location && (
                          <span>· โซน: <b className="text-slate-800 dark:text-slate-200">{matchedActiveMachine.location}</b></span>
                        )}
                        {matchedActiveMachine.serial && (
                          <span>· ซีเรียล: <span className="font-mono">{matchedActiveMachine.serial}</span></span>
                        )}
                        {(matchedActiveMachine.diameter || matchedActiveMachine.gauge) && (
                          <span>· ขนาด: <span className="font-mono">{matchedActiveMachine.diameter ? `${matchedActiveMachine.diameter}"` : ''} {matchedActiveMachine.gauge ? `${matchedActiveMachine.gauge}G` : ''}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="label">รหัสงาน (KI) *</label>
                    <input
                      type="text"
                      placeholder="เช่น KI-9012"
                      value={ki}
                      onChange={(e) => setKi(e.target.value)}
                      className="input font-mono font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">แบบงาน (DESIGN)</label>
                    <input
                      type="text"
                      placeholder="ระบุแบบงาน / ลายผ้า"
                      value={design}
                      onChange={(e) => setDesign(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">เลขม้วน (ROLL NO)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="ระบุเลขม้วน"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      className="input font-mono"
                    />
                  </div>
                </div>

                {/* 2. ประเภท, สาเหตุปัญหา, รายละเอียด, สถานะ */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="label">ประเภทงาน (JOB TYPE)</label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="select font-semibold"
                    >
                      <option value="REPAIR">🛠️ แก้ไข (Repair)</option>
                      <option value="DESIGN">🎨 ปรับแบบ (Design)</option>
                      <option value="PM">🧹 PM / ล้างเครื่อง</option>
                      <option value="SETUP">⚙️ เตรียมเครื่อง (Setup)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">สาเหตุปัญหา (ROOT CAUSE)</label>
                    <select
                      value={problemCause}
                      onChange={(e) => setProblemCause(e.target.value)}
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
                  <div className="sm:col-span-4">
                    <label className="label">รายละเอียด / อาการเสียงานซ่อม</label>
                    <input
                      type="text"
                      placeholder="ระบุอาการเสีย หรือรายละเอียดการปรับแต่ง..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">สถานะ (STATUS)</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select font-semibold"
                    >
                      {WORK_ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Technicians Multi-Select Checklist */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="label flex items-center gap-1.5">
                      <Wrench size={13} className="text-blue-500" />
                      <span>ช่างปรับผู้ปฏิบัติงาน (เลือกได้มากกว่า 1 คน) *</span>
                    </label>
                    <span className="badge badge-blue text-[11px] font-bold">
                      เลือกแล้ว: {selectedTechs.length} คน
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                    {technicians.filter((t) => t.Status !== 'INACTIVE').map((tech, idx) => {
                      const isChecked = selectedTechs.includes(tech.Name)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTechSelection(tech.Name)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer ${
                            isChecked
                              ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="truncate">{tech.Name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={submittingStart}
                  className="btn-outline px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingStart}
                  className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Send size={14} />
                  <span>{submittingStart ? 'กำลังบันทึก...' : 'ยืนยันเปิดใบสั่งงาน (เริ่มงาน)'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  )
}
