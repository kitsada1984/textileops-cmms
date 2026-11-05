import { Disc, Cpu, Layers } from 'lucide-react'

// Filter tabs moved verbatim from CylinderHistoryModal (props only).
export function HistoryFilterTabs({ effectiveSerial, effectiveMc, activeTab, setActiveTab }) {
  return (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex-wrap">
              {effectiveSerial && (
                <button
                  type="button"
                  onClick={() => setActiveTab('cylinder')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'cylinder'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Disc size={13} />
                  <span>ตามกระบอกนี้</span>
                </button>
              )}
              {effectiveMc && (
                <button
                  type="button"
                  onClick={() => setActiveTab('machine')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'machine'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Cpu size={13} />
                  <span>ตามเครื่อง ({effectiveMc})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  activeTab === 'all' || activeTab === 'auto'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>ทั้งหมด</span>
              </button>
            </div>
  )
}
