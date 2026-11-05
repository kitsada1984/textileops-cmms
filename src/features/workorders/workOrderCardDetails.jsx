import { CalendarClock } from 'lucide-react'

export function WorkOrderCardDetails({ job, detailsDisplay, latestDailyLog, dailyLogs, onDailyLog }) {
  return (
    <>
      {(job.Design || detailsDisplay !== '—' || latestDailyLog) && (
        <div className="text-xs space-y-1.5 py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-2">
          {job.Design && (
            <div className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              {job.Design}
            </div>
          )}
          {detailsDisplay !== '—' && (
            <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px]">
              {detailsDisplay}
            </div>
          )}
          {latestDailyLog && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                onDailyLog?.(job)
              }}
              className="mt-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold cursor-pointer active:scale-[0.98] transition-transform"
              title={`อัปเดตงานล่าสุด (${latestDailyLog.date}): ${latestDailyLog.details} (แตะเพื่อดูประวัติหรืออัปเดต)`}
            >
              <CalendarClock size={12} className="flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="flex-shrink-0">ล่าสุด ({latestDailyLog.date}):</span>
              <span className="truncate flex-1 font-normal text-slate-700 dark:text-slate-300">{latestDailyLog.details}</span>
              {dailyLogs.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 dark:bg-indigo-900 text-[10px] flex-shrink-0">
                  +{dailyLogs.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
