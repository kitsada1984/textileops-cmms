import { CalendarClock, CheckCircle2, Clock, Pause, Pencil, Printer, Trash2 } from 'lucide-react'

export function WorkOrderCardActions({ job, sla, isCompleted, dailyLogs, canEdit, canDelete, onInterruption, onComplete, onPrint, onEdit, onDelete, onDailyLog }) {
  return (
      <div
        className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-mono text-slate-400">
          {job.StartDate ? `${job.StartDate} ${job.StartTime || ''}` : ''}
        </span>

        <div className="flex items-center gap-1">
          {/* Interruption / Lost Time */}
          {!job.IsDeleted && (
            <button
              type="button"
              onClick={() => onInterruption(job)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 min-h-[44px] ${
                sla.activeInterruption
                  ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-500/30'
                  : sla.lostHoursDecimal > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600'
              }`}
              title={sla.activeInterruption ? 'คลิกเพื่อจบงานแทรก' : 'บันทึกงานแทรก'}
            >
              {sla.activeInterruption ? <Pause size={14} /> : <Clock size={14} />}
              {sla.activeInterruption && <span className="text-[11px]">พักงาน</span>}
            </button>
          )}

          {/* Complete Job */}
          {!isCompleted && !job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onComplete(job)}
              className="btn-success px-3 py-1.5 text-xs font-bold flex items-center gap-1 rounded-xl min-h-[44px]"
              title="บันทึกจบงาน"
            >
              <CheckCircle2 size={14} />
              <span>จบงาน</span>
            </button>
          )}

          {/* Daily Work Progress Update Button */}
          {!job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onDailyLog?.(job)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 min-h-[44px] ${
                dailyLogs.length > 0
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600'
              }`}
              title="อัปเดตงานแต่ละวัน / บันทึกจบวัน (ความคืบหน้า & สถานะ)"
            >
              <CalendarClock size={15} />
              {dailyLogs.length > 0 && (
                <span className="text-[10px] font-mono px-1 rounded-full bg-indigo-600 text-white">
                  {dailyLogs.length}
                </span>
              )}
            </button>
          )}

          {/* Print PDF */}
          <button
            type="button"
            onClick={() => onPrint(job)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 min-h-[44px]"
            title="พิมพ์ใบสั่งงาน A4"
          >
            <Printer size={15} />
          </button>

          {/* Edit */}
          {!job.IsDeleted && canEdit && (
            <button
              type="button"
              onClick={() => onEdit(job)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 min-h-[44px]"
              title="แก้ไข"
            >
              <Pencil size={15} />
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 min-h-[44px]"
              title="ลบ"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
  )
}
