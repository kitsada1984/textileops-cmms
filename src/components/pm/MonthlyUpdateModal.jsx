import Modal from '../ui/Modal'
import { Check, ExternalLink } from 'lucide-react'
import { SCHEDULE_STATUS_OPTIONS } from './monthlyPlanGenerate'

// Update-actual modal moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyUpdateModal({ updateModalOpen, setUpdateModalOpen, selectedItem, actualForm, setActualForm, handleSaveActual, daysPerMachine }) {
  return (
      <Modal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`อัปเดตงานทำจริง: ${selectedItem?.mc || ''}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveActual}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึกผลงานจริง</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveActual} className="space-y-4 text-xs">
          {/* Target Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">เครื่องจักร:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5">
                {selectedItem?.mc} {selectedItem?.ki ? `(${selectedItem?.ki})` : ''}
                {selectedItem?.isUnplanned && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    นอกแผน
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>ตำแหน่ง / ประเภท:</span>
              <span>{selectedItem?.location || '—'} · {selectedItem?.type || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>กำหนดตามแผน ({selectedItem?.workingDays || daysPerMachine} วัน):</span>
              <span className="font-mono">{selectedItem?.plannedStartDate ? `${selectedItem.plannedStartDate} → ${selectedItem.plannedEndDate}` : '— (ไม่มีแผนล่วงหน้า)'}</span>
            </div>
            {selectedItem?.workOrderId && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">ใบสั่งงาน PM:</span>
                <a
                  href={`/workorders?search=${encodeURIComponent(selectedItem.workOrderId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  title="คลิกเพื่อเปิดดูใบสั่งงานฉบับเต็ม"
                >
                  <span>{selectedItem.workOrderId}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Actual Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันที่เริ่มทำจริง (Actual Start)</label>
              <input
                type="date"
                value={actualForm.actualStartDate}
                onChange={(e) => setActualForm({ ...actualForm, actualStartDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">
                {actualForm.status === 'COMPLETED' ? 'วันที่เสร็จจริง (Actual End)' : 'วันที่คืบหน้าล่าสุด (Progress Date)'}
              </label>
              <input
                type="date"
                value={actualForm.actualEndDate}
                onChange={(e) => setActualForm({ ...actualForm, actualEndDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
              />
              {actualForm.status === 'IN_PROGRESS' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1 font-medium">
                  * กำลังดำเนินการ: ระบบจะอัปเดตความคืบหน้าตามวันที่อัตโนมัติจนกว่าจะจบงาน
                </span>
              )}
            </div>
          </div>

          {selectedItem?.latestDailyLog && (
            <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold">
                <span>บันทึกความคืบหน้ารายวันล่าสุด</span>
                <span className="font-mono text-[11px]">{selectedItem.latestDailyLog.date}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{selectedItem.latestDailyLog.details}</p>
            </div>
          )}

          {/* Actual Tech & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ช่างผู้ปฏิบัติงานจริง</label>
              <input
                type="text"
                placeholder="ระบุชื่อช่าง..."
                value={actualForm.actualTech}
                onChange={(e) => setActualForm({ ...actualForm, actualTech: e.target.value })}
                className="input text-xs font-semibold"
              />
            </div>
            <div>
              <label className="label">สถานะการทำงาน</label>
              <select
                value={actualForm.status}
                onChange={(e) => setActualForm({ ...actualForm, status: e.target.value })}
                className="select text-xs font-semibold"
              >
                {SCHEDULE_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">ปัญหาที่พบ / รายละเอียดการซ่อมบำรุง</label>
            <textarea
              rows={3}
              placeholder="ระบุปัญหาที่พบ อะไหล่ที่เปลี่ยน หรือหมายเหตุเพิ่มเติม..."
              value={actualForm.notes}
              onChange={(e) => setActualForm({ ...actualForm, notes: e.target.value })}
              className="textarea text-xs"
            />
          </div>
        </form>
      </Modal>
  )
}
