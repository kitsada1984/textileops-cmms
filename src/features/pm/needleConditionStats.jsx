import { AlertOctagon, AlertTriangle, Check, CheckCircle2, Clock, Flame, Layers, Sparkles } from 'lucide-react'

export function NeedleConditionStats({ stats }) {
  return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Inspected */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-500" />
              <span>ตรวจสภาพเข็มแล้ว</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {stats.total} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Sparkles size={18} />
          </div>
        </div>

        {/* Normal */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>สึกเล็กน้อย</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.normal} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Check size={18} strokeWidth={2.5} />
          </div>
        </div>

        {/* Watch / Worn */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>สึกปานกลาง - มาก</span>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.watch} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>

        {/* Broken */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertOctagon size={13} />
              <span>สึกมาก (ควรเปลี่ยน)</span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.broken} <span className="text-xs font-semibold text-slate-500">กระบอก</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Flame size={18} />
          </div>
        </div>
      </div>
  )
}
