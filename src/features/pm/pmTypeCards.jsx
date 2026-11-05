import { Disc, Layers, Sparkles, Target } from 'lucide-react'

export function PMTypeCards({ filterSort, setFilterSort, typeSummary }) {
  return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* ทั้งหมด */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => {
                  const nextFilters = { ...p.filters }
                  delete nextFilters.Type
                  return { ...p, filters: nextFilters }
                })
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                !filterSort.filters?.Type
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-500" />
                  <span>ประเภททั้งหมด</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.total} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                !filterSort.filters?.Type ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                ALL
              </span>
            </button>

            {/* Single Jersey (S) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'S' ? '' : 'S',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'S'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Disc size={13} />
                  <span>Single Jersey</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.S} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                S
              </span>
            </button>

            {/* Double Jersey (D) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'D' ? '' : 'D',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'D'
                  ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Target size={13} />
                  <span>Double Jersey</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.D} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                D
              </span>
            </button>

            {/* Jacquard (Jac.) */}
            <button
              type="button"
              onClick={() => {
                setFilterSort((p) => ({
                  ...p,
                  filters: {
                    ...p.filters,
                    Type: p.filters?.Type === 'Jac.' ? '' : 'Jac.',
                  },
                }))
              }}
              className={`p-3 rounded-2xl flex items-center justify-between text-left transition-all border ${
                filterSort.filters?.Type === 'Jac.'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Jacquard</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {typeSummary.Jac} <span className="text-xs font-semibold text-slate-500">เครื่อง</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Jac.
              </span>
            </button>
          </div>
  )
}
