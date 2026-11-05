import { MapPin } from 'lucide-react'
import { SCHEDULE_STATUS_OPTIONS, AVAILABLE_LOCATIONS, matchesLocation } from './monthlyPlanGenerate'

// Status + location filters moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyFilterBar({ statusFilter, setStatusFilter, viewLocationFilter, setViewLocationFilter, currentItems }) {
  return (
    <>
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({currentItems.length})
                </button>
                {SCHEDULE_STATUS_OPTIONS.map(opt => {
                  const count = currentItems.filter(i => i.status === opt.value).length
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
                        statusFilter === opt.value
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Location Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 pl-1 pr-0.5 shrink-0 flex items-center gap-1">
                  <MapPin size={11} />
                  <span>โรงงาน:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setViewLocationFilter(['ALL'])}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[44px] ${
                    viewLocationFilter.includes('ALL')
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                  title="แสดงเครื่องจักรทุกโรงงาน"
                >
                  ทั้งหมด
                </button>
                {AVAILABLE_LOCATIONS.map(loc => {
                  const isSelected = !viewLocationFilter.includes('ALL') && viewLocationFilter.includes(loc.id)
                  const count = currentItems.filter(i => matchesLocation(i.location, [loc.id])).length
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setViewLocationFilter(prev => {
                          if (prev.includes('ALL')) return [loc.id]
                          if (prev.includes(loc.id)) {
                            const next = prev.filter(x => x !== loc.id)
                            return next.length === 0 ? ['ALL'] : next
                          }
                          return [...prev, loc.id]
                        })
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 min-h-[44px] ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                      title={`คลิกเพื่อเลือก/ยกเลิก ${loc.label}`}
                    >
                      <span>{loc.id}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  )
                })}
              </div>
    </>
  )
}
