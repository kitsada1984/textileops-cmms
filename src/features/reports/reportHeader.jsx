import { Printer, RefreshCw } from 'lucide-react'

// 1. HEADER & ACTION CONTROLS BAR (Hidden on Print) — moved verbatim from Reports.jsx
export function ReportHeader({ t, timeFilter, setTimeFilter, refreshing, fetchData, handlePrint }) {
  return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {t('rpt_title') || 'รายงานวิเคราะห์และภาพรวมระบบ'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('rpt_subtitle') || 'สรุปสถานะเครื่องจักร งานซ่อมบำรุง และคลังอะไหล่แบบเรียลไทม์'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Time Filter Pills */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold">
            {[
              ['all', t('rpt_filter_all') || 'ทั้งหมด'],
              ['today', t('rpt_filter_today') || 'วันนี้'],
              ['week', t('rpt_filter_week') || 'สัปดาห์นี้'],
              ['month', t('rpt_filter_month') || 'เดือนนี้'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTimeFilter(val)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeFilter === val
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-500' : ''} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {/* Print / Export PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="พิมพ์หรือส่งออกรายงาน PDF"
          >
            <Printer size={15} />
            <span>พิมพ์รายงาน / PDF</span>
          </button>
        </div>
      </div>
  )
}
