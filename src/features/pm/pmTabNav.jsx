import { Calendar, Target, Sparkles, ScrollText, CalendarRange } from 'lucide-react'

export function PMTabNav({ activeTab, setActiveTab, displayRows }) {
  return (
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-1 sm:flex-none min-w-[44%] sm:min-w-0 whitespace-nowrap ${
            activeTab === 'plan'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Calendar size={15} />
          <span className="sm:hidden">แผน PM</span>
          <span className="hidden sm:inline">แผน PM (PM Plan)</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'plan' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {displayRows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('center_check')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-1 sm:flex-none min-w-[44%] sm:min-w-0 whitespace-nowrap ${
            activeTab === 'center_check'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Target size={15} />
          <span className="sm:hidden">ประวัติเช็คศูนย์</span>
          <span className="hidden sm:inline">ประวัติเช็คศูนย์ (Center Checks)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('needle')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-1 sm:flex-none min-w-[44%] sm:min-w-0 whitespace-nowrap ${
            activeTab === 'needle'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Sparkles size={15} />
          <span className="sm:hidden">สภาพเข็ม</span>
          <span className="hidden sm:inline">สภาพเข็ม (Needle Inspection)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-1 sm:flex-none min-w-[44%] sm:min-w-0 whitespace-nowrap ${
            activeTab === 'log'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ScrollText size={15} />
          <span className="sm:hidden">Log PM</span>
          <span className="hidden sm:inline">ประวัติ Log PM (PM Log)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly_schedule')}
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex-1 sm:flex-none min-w-[44%] sm:min-w-0 whitespace-nowrap ${
            activeTab === 'monthly_schedule'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <CalendarRange size={15} />
          <span className="sm:hidden">แผนรายเดือน</span>
          <span className="hidden sm:inline">จัดทำแผน PM รายเดือน (Monthly Schedule)</span>
        </button>
      </div>
  )
}
