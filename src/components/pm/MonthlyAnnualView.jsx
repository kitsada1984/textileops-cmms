import { BarChart3, CheckCircle2, Play, Clock } from 'lucide-react'

// Annual summary hub content moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyAnnualView({ annualSummary, selectedYear, setSelectedYear, setSelectedMonth, setViewMode, currentMonth, currentYear }) {
  return (
        <div className="space-y-6">
          {/* Annual KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                แผน PM รวมทั้งปี ({annualSummary.year})
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">
                {annualSummary.totalPlanned} <span className="text-sm font-normal text-slate-400">เครื่อง</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                เป้าหมายครอบคลุมเครื่องจักรทั้งหมด
              </div>
            </div>

            <div className="card p-5 border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>เสร็จสมบูรณ์ทั้งปี</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {annualSummary.totalCompleted} <span className="text-sm font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                ความสำเร็จสะสม {annualSummary.annualCompletionRate}%
              </div>
            </div>

            <div className="card p-5 border border-amber-500/20 bg-amber-500/5 shadow-xs">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Play size={14} />
                <span>กำลังทำ / รอดำเนินการ</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">
                {annualSummary.totalInProgress} <span className="text-sm font-normal opacity-75">เครื่อง</span>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ล่าช้าสะสม {annualSummary.totalDelayed} เครื่อง
              </div>
            </div>

            <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={14} />
                <span>อัตราตรงเวลาทั้งปี (On-Time SLA)</span>
              </div>
              <div className="text-2xl font-black mt-1 font-mono text-emerald-600 dark:text-emerald-400">
                {annualSummary.totalCompleted > 0 ? `${annualSummary.annualOnTimeRate}%` : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                ทันกำหนด {annualSummary.totalOnTime}/{annualSummary.totalCompleted} เครื่อง
              </div>
            </div>
          </div>

          {/* 12-Month Table Breakdown */}
          <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>ตารางสรุปแผน PM 12 เดือน ประจำปี {annualSummary.year}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  เปรียบเทียบผลการดำเนินงาน PM ของแต่ละเดือนตลอดทั้งปี
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                ข้อมูล ณ สิ้นปี / อัปเดตล่าสุด Real-time
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-14">เดือน</th>
                    <th className="py-2.5 px-3">ชื่อเดือน</th>
                    <th className="py-2.5 px-3 text-center">แผนทั้งหมด (เครื่อง)</th>
                    <th className="py-2.5 px-3 text-center">เสร็จแล้ว</th>
                    <th className="py-2.5 px-3 text-center">กำลังทำ</th>
                    <th className="py-2.5 px-3 text-center">ล่าช้า</th>
                    <th className="py-2.5 px-3">ความก้าวหน้า (% Completion)</th>
                    <th className="py-2.5 px-3 text-center">ตรงเวลา (On-Time)</th>
                    <th className="py-2.5 px-3 text-right">เปิดดูแผน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {annualSummary.monthsData.map((m) => {
                    const isCurrent = currentMonth === m.monthNumber && currentYear === annualSummary.year
                    return (
                      <tr
                        key={m.monthNumber}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                          isCurrent ? 'bg-blue-500/5 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                          {String(m.monthNumber).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{m.monthName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                เดือนปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {m.total}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {m.completed}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400">
                          {m.inProgress}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-600 dark:text-rose-400">
                          {m.delayed}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={`h-2 rounded-full ${
                                  m.completionRate === 100
                                    ? 'bg-emerald-500'
                                    : m.completionRate > 50
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${m.completionRate}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {m.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {m.completed > 0 ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {m.onTimeRate}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMonth(m.monthNumber)
                              setViewMode('monthly')
                            }}
                            className="btn-outline text-[11px] px-2.5 py-1 cursor-pointer"
                          >
                            เปิดดูแผน
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  )
}
