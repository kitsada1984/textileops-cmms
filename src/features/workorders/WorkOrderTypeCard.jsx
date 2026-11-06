// Generic job-type KPI card. The four dashboard cards were identical except
// accent color, labels, and stats source — unified with exact same output.
// Class names stay full literals (Tailwind JIT purges dynamic interpolations).
// `optional` preserves Setup's defensive `?.` fallbacks verbatim; other cards
// keep direct access exactly as before (a missing object still throws there).
const ACCENT_STYLES = {
  blue: {
    card: 'border-blue-500/25',
    iconBox: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    label: 'text-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  amber: {
    card: 'border-amber-500/25',
    iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    label: 'text-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  emerald: {
    card: 'border-emerald-500/25',
    iconBox: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  indigo: {
    card: 'border-indigo-500/25',
    iconBox: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    label: 'text-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
  },
}

export function WorkOrderTypeCard({ icon, title, stats, accent, badgeClass, optional = false }) {
  const st = ACCENT_STYLES[accent]
  const targetDays = optional ? (stats?.targetDays || 1.0) : stats.targetDays
  const rate = optional ? (stats?.rate || 0) : stats.rate
  const total = optional ? (stats?.total || 0) : stats.total
  const onTime = optional ? (stats?.onTime || 0) : stats.onTime
  const overdue = optional ? (stats?.overdue || 0) : stats.overdue
  const avgDurationText = optional ? (stats?.avgDurationText || '—') : stats.avgDurationText
  return (
    <div className={`card p-5 space-y-3.5 border ${st.card}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${st.iconBox} flex items-center justify-center font-bold text-base`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
              {title}
            </h3>
            <p className={`text-[11px] font-mono ${st.label} font-semibold`}>
              เป้าหมาย SLA: <b>{targetDays} วัน</b>
            </p>
          </div>
        </div>
        <span className={`badge ${badgeClass} text-xs font-bold`}>
          {rate}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-500)' }}>
          <span>ความสำเร็จทันเป้าหมาย (On-Time)</span>
          <span className={`font-bold font-mono ${st.text}`}>
            {rate}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${st.bar} rounded-full transition-all duration-500`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60">
          <div className="text-[10px]" style={{ color: 'var(--text-400)' }}>ทั้งหมด</div>
          <div className="font-bold text-sm" style={{ color: 'var(--text-900)' }}>
            {total}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <div className="text-[10px]">ทันเป้า</div>
          <div className="font-bold text-sm">{onTime}</div>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <div className="text-[10px]">เกินเป้า</div>
          <div className="font-bold text-sm">{overdue}</div>
        </div>
      </div>

      <div className="flex justify-between text-xs pt-1" style={{ color: 'var(--text-500)' }}>
        <span>ระยะเวลาเฉลี่ย:</span>
        <b className="font-mono" style={{ color: 'var(--text-900)' }}>
          {avgDurationText}
        </b>
      </div>
    </div>
  )
}
