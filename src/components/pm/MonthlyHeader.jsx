import { CalendarRange, BarChart3, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Save, Trash2, Eye, Printer, Download } from 'lucide-react'
import { THAI_MONTHS, SHORT_THAI_MONTHS } from './monthlyPlanGenerate'

// Monthly header card moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyHeader({ daysPerMachine, viewMode, setViewMode, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, currentMonth, currentYear, savingSchedule, canAdd, canEdit, canDelete, currentItems, handleAutoGenerate, handleExplicitSaveSchedule, setDeleteMonthModalOpen, setPrintModalOpen }) {
  return (
      <div className="card p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Tier 1: Title, Days/MC badge, Description, and View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <CalendarRange size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  จัดทำแผน PM รายเดือน
                </h2>
                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold whitespace-nowrap border border-blue-500/20">
                  {daysPerMachine} วัน/เครื่อง (ไม่รวมอาทิตย์)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                วางแผนและติดตามงาน PM รายเครื่อง ย้อนหลัง/ล่วงหน้า และสรุปผลประจำเดือน-ทั้งปี
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Monthly vs Annual */}
          <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              แผนรายเดือน
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 size={13} />
              <span>สรุปภาพรวมทั้งปี (12 เดือน)</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Date Selector & Quick Actions Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Year & Month Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedYear(y => y - 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="ปีก่อนหน้า"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono font-bold text-xs px-2 text-slate-800 dark:text-slate-200">
                {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear(y => y + 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="ปีถัดไป"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Month Dropdown */}
            {viewMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select font-bold text-xs py-1.5 px-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {THAI_MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name} ({idx + 1})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Right: Quick Action Buttons (Wrapped & Responsive) */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {viewMode === 'monthly' && canAdd && (
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={savingSchedule}
                className="btn-primary text-xs px-3 py-1.5 min-h-[44px] flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                title={`สร้างตารางแผน PM ${daysPerMachine} วันต่อเครื่องให้อัตโนมัติ โดยข้ามวันอาทิตย์`}
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">สร้างแผนอัตโนมัติ ({daysPerMachine} วัน/เครื่อง)</span>
                <span className="sm:hidden">สร้างแผน ({daysPerMachine}ว.)</span>
              </button>
            )}
            {viewMode === 'monthly' && canEdit && (
              <button
                type="button"
                onClick={handleExplicitSaveSchedule}
                disabled={savingSchedule}
                className="px-3 py-1.5 min-h-[44px] rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50 shrink-0"
                title="บันทึกแผนของเดือนนี้ลงฐานข้อมูล"
              >
                {savingSchedule ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>บันทึกแผน</span>
              </button>
            )}
            {viewMode === 'monthly' && canDelete && currentItems.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteMonthModalOpen(true)}
                disabled={savingSchedule}
                className="px-2.5 py-1.5 min-h-[44px] rounded-xl font-bold text-xs border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50 shrink-0"
                title="ลบแผนงานทั้งหมดของเดือนนี้"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">ลบแผนเดือนนี้</span>
                <span className="sm:hidden">ลบแผน</span>
              </button>
            )}
            {/* PDF Actions: View, Print, Download */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="btn-outline text-xs px-2.5 py-1.5 min-h-[44px] flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                title="ดูตัวอย่างเอกสารแผน PM ประจำเดือน (A4)"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">ดูแผน</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="btn-outline text-xs px-2.5 py-1.5 min-h-[44px] flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                title="พิมพ์ตารางแผน PM ขนาด A4"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">พิมพ์</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="px-2.5 py-1.5 min-h-[44px] rounded-xl font-bold text-xs border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                title="ดาวน์โหลดแผน PM เป็นไฟล์ PDF"
              >
                <Download size={14} />
                <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Month Quick Jump Ribbon (Only in Monthly Mode) */}
        {viewMode === 'monthly' && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-bold mr-1 shrink-0">เดือน:</span>
            {SHORT_THAI_MONTHS.map((mName, idx) => {
              const mNum = idx + 1
              const isSelected = selectedMonth === mNum
              const isCurrent = currentMonth === mNum && currentYear === selectedYear
              return (
                <button
                  key={mNum}
                  type="button"
                  onClick={() => setSelectedMonth(mNum)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{mName}</span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
  )
}
