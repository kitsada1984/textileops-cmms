import Modal from '../ui/Modal'
import { Check, ExternalLink, Lock, ShieldCheck, RotateCcw } from 'lucide-react'
import { SCHEDULE_STATUS_OPTIONS } from './monthlyPlanGenerate'

function MachineTargetInfo({ selectedItem, daysPerMachine }) {
  const mc = selectedItem?.mc || ''
  const ki = selectedItem?.ki ? `(${selectedItem.ki})` : ''
  const plannedRange = selectedItem?.plannedStartDate
    ? `${selectedItem.plannedStartDate} → ${selectedItem.plannedEndDate}`
    : '— (ไม่มีแผนล่วงหน้า)'

  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 dark:text-slate-300">เครื่องจักร:</span>
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5">
          {mc} {ki}
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
        <span className="font-mono">{plannedRange}</span>
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
  )
}

function AutoDateAdminBadge({ onResetAutoDate }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-0.5">
        <ShieldCheck size={12} />
        <span>Admin แก้ไขได้</span>
      </span>
      {onResetAutoDate && (
        <button
          type="button"
          onClick={onResetAutoDate}
          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          title="คืนค่าเป็นวันที่คำนวณอัตโนมัติของระบบ"
        >
          <RotateCcw size={10} />
          <span>รีเซ็ต</span>
        </button>
      )}
    </div>
  )
}

function AutoDateNonAdminBadge() {
  return (
    <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-0.5">
      <Lock size={11} className="text-amber-500" />
      <span>เฉพาะ Admin</span>
    </span>
  )
}

function AutoDateInput({ actualForm, setActualForm, isAdmin, onResetAutoDate, isOngoing, isAutoDateDisabled }) {
  const isCompleted = actualForm.status === 'COMPLETED'
  const labelText = isCompleted ? 'วันที่เสร็จจริง (Actual End)' : 'วันที่อัตโนมัติ (Auto Date)'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">{labelText}</label>
        {isOngoing && (isAdmin ? <AutoDateAdminBadge onResetAutoDate={onResetAutoDate} /> : <AutoDateNonAdminBadge />)}
      </div>
      <input
        type="date"
        value={actualForm.actualEndDate}
        onChange={(e) => setActualForm({ ...actualForm, actualEndDate: e.target.value })}
        className={`input font-mono text-xs font-semibold transition-colors ${
          isAutoDateDisabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-dashed opacity-85'
            : ''
        }`}
        disabled={isAutoDateDisabled}
        aria-disabled={isAutoDateDisabled}
        title={isAutoDateDisabled ? 'วันที่อัตโนมัติ: admin สามารถแก้ไขได้คนเดียวเท่านั้น' : ''}
      />
      {isOngoing && (
        <span className={`text-[10px] block mt-1 font-medium ${isAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {isAdmin
            ? '🛡️ สิทธิ์ Admin: สามารถแก้ไขวันที่อัตโนมัตินี้ได้คนเดียวเท่านั้น'
            : '🔒 วันที่อัตโนมัติ: ระบบอัปเดตตามวันต่อเนื่อง (Admin สามารถแก้ไขได้คนเดียวเท่านั้น)'}
        </span>
      )}
    </div>
  )
}

function DailyLogPreview({ log }) {
  if (!log) return null
  return (
    <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1">
      <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold">
        <span>บันทึกความคืบหน้ารายวันล่าสุด</span>
        <span className="font-mono text-[11px]">{log.date}</span>
      </div>
      <p className="text-slate-600 dark:text-slate-300">{log.details}</p>
    </div>
  )
}

// Update-actual modal moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyUpdateModal({
  updateModalOpen,
  setUpdateModalOpen,
  selectedItem,
  actualForm,
  setActualForm,
  handleSaveActual,
  daysPerMachine,
  isAdmin = false,
  onResetAutoDate,
}) {
  const isOngoing = actualForm.status === 'IN_PROGRESS'
  const isAutoDateDisabled = isOngoing && !isAdmin

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
        <MachineTargetInfo selectedItem={selectedItem} daysPerMachine={daysPerMachine} />

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
          <AutoDateInput
            actualForm={actualForm}
            setActualForm={setActualForm}
            isAdmin={isAdmin}
            onResetAutoDate={onResetAutoDate}
            isOngoing={isOngoing}
            isAutoDateDisabled={isAutoDateDisabled}
          />
        </div>

        <DailyLogPreview log={selectedItem?.latestDailyLog} />

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
