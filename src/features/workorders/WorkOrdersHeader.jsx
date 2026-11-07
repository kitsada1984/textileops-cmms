import { ClipboardList, Layers, Printer, RefreshCw, Settings as SettingsIcon, Target, UserCheck, Wrench } from 'lucide-react'
import GoogleSheetSyncButton from '../../components/ui/GoogleSheetSyncButton'

// Top header + sub-tabs navigation moved verbatim from WorkOrders (props only).
// `workOrderList` is the WorkOrderAPI list fetcher (passed to the sync button).
export function WorkOrdersHeader({ currentTab, setCurrentTab, exportConfig, filteredJobs, allJobs, technicians, jobsLoading, loadJobs, loadTechsAndSettings, setReportModalOpen, workOrderList }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-900)' }}>
            ระบบบันทึกผลงานช่าง (Work Orders & KPI)
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-500)' }}>
            Gemma Knits Maintenance Management System · Version 55
          </p>
        </div>

        {/* Action Controls & Sync */}
        <div className="flex items-center gap-2">
          {exportConfig && (
            <GoogleSheetSyncButton
              sheetName={exportConfig.sheetName}
              columns={exportConfig.columns}
              fetchRows={workOrderList}
              valueGetters={exportConfig.valueGetters}
            />
          )}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5 shadow-2xs font-bold"
            title="พิมพ์รายงานใบสั่งงานตามตัวกรองที่เลือก"
          >
            <Printer size={14} className="text-blue-500" />
            <span className="hidden sm:inline">พิมพ์รายงาน</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px]">
              {filteredJobs.length}
            </span>
          </button>
          <button
            onClick={() => {
              loadJobs()
              loadTechsAndSettings()
            }}
            className="btn-outline"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={jobsLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* ── 5-Tabs Navigation Bar (Smooth Horizontal Scroll on Mobile) ── */}
      <div
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap pb-2 sm:pb-1.5 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setCurrentTab('records')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'records'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <ClipboardList size={16} />
          <span>รายการใบสั่งงาน & เปิดงาน</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            currentTab === 'records' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {allJobs.filter((j) => !j.IsDeleted).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('unified')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'unified'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Layers size={16} />
          <span>รวมงานค้าง</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('repair_requests')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'repair_requests'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Wrench size={16} />
          <span>แจ้งซ่อม (Repair Requests)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Target size={16} />
          <span>แดชบอร์ด & สรุป KPI</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('technicians')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'technicians'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <UserCheck size={16} />
          <span>ทะเบียนช่าง</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            currentTab === 'technicians' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {technicians.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('settings')}
          className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex-shrink-0 whitespace-nowrap active:scale-95 ${
            currentTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <SettingsIcon size={16} />
          <span>ตั้งค่าเป้าหมาย KPI</span>
        </button>
      </div>
    </>
  )
}
