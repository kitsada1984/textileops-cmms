import { Pause } from 'lucide-react'

export function WorkOrderCardMeta({ job, sla, isCompleted }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-xs py-1.5 text-slate-600 dark:text-slate-400">
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-medium">ช่างผู้ปฏิบัติงาน:</div>
          <div className="font-semibold truncate text-slate-700 dark:text-slate-300">
            {job.Technicians || '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-medium">ระยะเวลา & SLA:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {job.WorkingDurationText || (isCompleted ? `${job.WorkingHoursDecimal} ชม.` : (sla.durationText && sla.durationText !== '—' ? sla.durationText : 'กำลังทำ...'))}
            </span>
            <span className={`badge text-[9px] px-1.5 py-0 ${sla.badgeClass}`}>
              {sla.label}
            </span>
          </div>
          {(sla.offShiftHoursDecimal > 0 || sla.sundayHoursDecimal > 0) && (
            <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
              {sla.offShiftHoursDecimal > 0 && <span className="text-indigo-600 dark:text-indigo-400">🌙 หักนอกกะ {sla.offShiftDurationText}</span>}
              {sla.sundayHoursDecimal > 0 && <span className="text-sky-600 dark:text-sky-400">🏖️ หักอาทิตย์ {sla.sundayDurationText}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Interruption banner if active */}
      {sla.activeInterruption && (
        <div className="mt-1 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Pause size={12} className="animate-pulse" />
            <span>พักงาน: {sla.activeInterruption.task_name}</span>
          </div>
          <span className="text-[10px] font-mono">กำลังจับเวลาแทรก</span>
        </div>
      )}

    </>
  )
}
