import { useState, useMemo } from 'react'
import { Search, Wrench, Clock, AlertCircle, ArrowRight, Layers, Sparkles } from 'lucide-react'
import { filterPendingTasks, buildInterruptionTaskNameFromPending } from './workOrderPendingMachines'

export function InterruptionPendingMachinesList({
  pendingTasks = [],
  onSelectPendingTask,
  onStartImmediate,
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const filtered = useMemo(() => {
    return filterPendingTasks(pendingTasks, search, typeFilter)
  }, [pendingTasks, search, typeFilter])

  const counts = useMemo(() => {
    return {
      all: pendingTasks.length,
      repair: pendingTasks.filter((t) => t.jobType === 'REPAIR').length,
      pm: pendingTasks.filter((t) => t.jobType === 'PM').length,
      waitParts: pendingTasks.filter((t) => String(t.status || '').toUpperCase().includes('PARTS') || String(t.status || '').includes('อะไหล่')).length,
    }
  }, [pendingTasks])

  return (
    <div className="space-y-2.5">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัสเครื่อง, เลขที่ใบงาน, รายละเอียด..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[10.5px]">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
              typeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('REPAIR')}
            className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
              typeFilter === 'REPAIR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            🛠️ งานซ่อม ({counts.repair})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('PM')}
            className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
              typeFilter === 'PM'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            🧹 PM ({counts.pm})
          </button>
          {counts.waitParts > 0 && (
            <button
              type="button"
              onClick={() => setTypeFilter('WAIT_PARTS')}
              className={`px-2 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                typeFilter === 'WAIT_PARTS'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              📦 รออะไหล่ ({counts.waitParts})
            </button>
          )}
        </div>
      </div>

      {/* List of Pending Tasks */}
      {filtered.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          <AlertCircle size={20} className="mx-auto mb-1.5 text-slate-400 opacity-60" />
          <span>ไม่พบรายการงานค้างที่ตรงกับเงื่อนไขการค้นหา</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {filtered.map((item) => {
            const taskTitle = buildInterruptionTaskNameFromPending(item)
            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
              >
                {/* Task Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      {item.mc}
                    </span>
                    <span className="font-semibold text-[10.5px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.sourceLabel}: {item.refId}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      {item.status}
                    </span>
                    {item.technicians && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        • ช่าง: {item.technicians}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {item.details || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectPendingTask(taskTitle)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="เลือกข้อความนี้ลงในช่องชื่องานแทรก"
                  >
                    เลือกชื่อ
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartImmediate(taskTitle)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-xs flex items-center gap-1"
                  >
                    <Clock size={12} />
                    <span>เริ่มจับเวลาทันที</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
