import { FileText, CheckCircle2 } from 'lucide-react'

export function CenterCheckStats({ stats }) {
  return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500">ประวัติการตรวจทั้งหมด</div>
            <div className="text-xl font-black mt-0.5" style={{ color: 'var(--text-900)' }}>
              {stats.total} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <FileText size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Single Jersey</div>
            <div className="text-xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
              {stats.singleCount} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
            1-Cy
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Double Jersey</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {stats.doubleCount} <span className="text-xs font-normal text-slate-400">ใบ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
            2-Cy
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-[11px] font-bold text-slate-500">อัตราผ่านเกณฑ์มาตรฐาน</div>
            <div className="text-xl font-black mt-0.5 text-teal-600 dark:text-teal-400">
              {stats.passRate}% <span className="text-xs font-normal text-slate-400">({stats.passedCount}/{stats.total})</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>
  )
}
