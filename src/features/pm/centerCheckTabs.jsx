import { FileText, Pencil } from 'lucide-react'

export function CenterCheckTabs({ activeSubTab, setActiveSubTab, editingId, formType, count }) {
  return (
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-2 sm:pb-1.5">
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText size={14} />
          <span>ประวัติการตรวจ (History Log)</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
            activeSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {count}
          </span>
        </button>

        {(activeSubTab === 'single_form' || activeSubTab === 'double_form') && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-blue-600 border border-slate-200 dark:border-slate-700">
            <Pencil size={13} />
            <span>{editingId ? 'แก้ไขใบบันทึก' : 'ฟอร์มบันทึกใหม่'} ({formType} Jersey)</span>
          </div>
        )}
      </div>
  )
}
