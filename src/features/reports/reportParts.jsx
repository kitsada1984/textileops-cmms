import { ChevronRight, ExternalLink, X } from 'lucide-react'
import { format } from 'date-fns'

export const STATUS_CONFIG = {
  // Machine Statuses
  RUNNING: {
    label: 'เดินเครื่องปกติ',
    enLabel: 'Running',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    darkText: '#34d399',
  },
  BREAKDOWN: {
    label: 'เครื่องเสีย',
    enLabel: 'Breakdown',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#dc2626',
    darkText: '#f87171',
  },
  MAINTENANCE: {
    label: 'ซ่อมบำรุง',
    enLabel: 'Maintenance',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#d97706',
    darkText: '#fbbf24',
  },
  IDLE: {
    label: 'เครื่องว่าง',
    enLabel: 'Idle',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#475569',
    darkText: '#94a3b8',
  },
  DECOMMISSIONED: {
    label: 'เลิกใช้งาน',
    enLabel: 'Decommissioned',
    color: '#334155',
    bg: 'rgba(51, 65, 85, 0.12)',
    border: 'rgba(51, 65, 85, 0.3)',
    text: '#334155',
    darkText: '#64748b',
  },

  // Work Order Statuses
  COMPLETED: {
    label: 'เสร็จสิ้น',
    enLabel: 'Completed',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    darkText: '#34d399',
  },
  IN_PROGRESS: {
    label: 'กำลังดำเนินการ',
    enLabel: 'In Progress',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    text: '#2563eb',
    darkText: '#60a5fa',
  },
  OPEN: {
    label: 'รอดำเนินการ',
    enLabel: 'Open',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#d97706',
    darkText: '#fbbf24',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    enLabel: 'Cancelled',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#475569',
    darkText: '#94a3b8',
  },

  // PM Plan Statuses
  SCHEDULED: {
    label: 'ตามแผน',
    enLabel: 'Scheduled',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
    text: '#4f46e5',
    darkText: '#818cf8',
  },
  OVERDUE: {
    label: 'เกินกำหนด',
    enLabel: 'Overdue',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#dc2626',
    darkText: '#f87171',
  },

  // Spare Part Statuses
  IN_STOCK: {
    label: 'มีของพร้อมใช้',
    enLabel: 'In Stock',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    text: '#059669',
    darkText: '#34d399',
  },
  LOW_STOCK: {
    label: 'สต็อกต่ำ',
    enLabel: 'Low Stock',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.3)',
    text: '#ea580c',
    darkText: '#fb923c',
  },
  OUT_OF_STOCK: {
    label: 'หมดสต็อก',
    enLabel: 'Out of Stock',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#dc2626',
    darkText: '#f87171',
  },
}

export const getStatusMeta = (key) =>
  STATUS_CONFIG[key] || {
    label: key || '—',
    enLabel: key || '—',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.25)',
    text: '#475569',
    darkText: '#94a3b8',
  }

/* ─────────────────────────────────────────────────────────────
   DATE MATCHING HELPER
   ───────────────────────────────────────────────────────────── */
export function matchesTimeFilter(itemDateStr, filter) {
  if (filter === 'all') return true
  if (!itemDateStr) return false

  let dateObj = null
  if (typeof itemDateStr === 'string') {
    const raw = itemDateStr.trim().split('T')[0]
    dateObj = new Date(raw)
  } else if (itemDateStr instanceof Date) {
    dateObj = itemDateStr
  }

  if (!dateObj || isNaN(dateObj.getTime())) return false

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const itemStr = format(dateObj, 'yyyy-MM-dd')

  if (filter === 'today') {
    return itemStr === todayStr
  }

  if (filter === 'week') {
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)
    return dateObj >= oneWeekAgo && dateObj <= now
  }

  if (filter === 'month') {
    return (
      dateObj.getFullYear() === now.getFullYear() &&
      dateObj.getMonth() === now.getMonth()
    )
  }

  return true
}

/* ─────────────────────────────────────────────────────────────
   MODERN SVG DONUT CHART (Zero Bug with 100% Single Slices)
   ───────────────────────────────────────────────────────────── */
export function ModernDonutChart({ data = [], centerMetric, centerLabel, onSelectSlice }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0)

  // Empty state
  if (!total || total === 0) {
    return (
      <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full">
          <circle
            cx="64"
            cy="64"
            r="48"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="14"
            strokeDasharray="4 4"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-semibold text-slate-400">ไม่มีข้อมูล</span>
        </div>
      </div>
    )
  }

  const radius = 48
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  // If there is only 1 non-zero slice (100% single slice bug fix)
  const nonZero = data.filter((d) => d.value > 0)
  if (nonZero.length === 1) {
    const single = nonZero[0]
    return (
      <div
        className="relative w-36 h-36 flex items-center justify-center flex-shrink-0 cursor-pointer group"
        onClick={() => onSelectSlice && onSelectSlice(single.key)}
        title={`${single.label}: ${single.value} (100%)`}
      >
        <svg viewBox="0 0 128 128" className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={single.color}
            strokeWidth={strokeWidth}
            className="transition-all duration-300 group-hover:stroke-width-[16]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
          <span className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
            {centerMetric || '100%'}
          </span>
          {centerLabel && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {centerLabel}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Multi-slice calculation using strokeDasharray and strokeDashoffset
  let accumulatedPercent = 0
  return (
    <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full transform -rotate-90">
        {data.map((slice) => {
          if (!slice.value || slice.value <= 0) return null
          const pct = slice.value / total
          const strokeDash = pct * circumference
          const strokeOffset = -accumulatedPercent * circumference
          accumulatedPercent += pct

          return (
            <circle
              key={slice.key}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              strokeDashoffset={strokeOffset}
              className="cursor-pointer transition-all duration-200 hover:opacity-85 hover:stroke-[16]"
              onClick={() => onSelectSlice && onSelectSlice(slice.key)}
            >
              <title>{`${slice.label}: ${slice.value} (${(pct * 100).toFixed(1)}%)`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
        <span className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
          {centerMetric || `${total}`}
        </span>
        {centerLabel && (
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STATUS CARD COMPONENT
   ───────────────────────────────────────────────────────────── */
export function StatusAnalyticsCard({
  title,
  icon: Icon,
  accentColor,
  data = [],
  total,
  centerMetric,
  centerLabel,
  onOpenDrilldown,
}) {
  return (
    <div
      className="card p-5 sm:p-6 transition-all duration-200 hover:shadow-md border flex flex-col justify-between"
      style={{
        background: 'var(--bg-card, #ffffff)',
        borderColor: 'var(--border-subtle, #e2e8f0)',
      }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}10 100%)`,
              color: accentColor,
              border: `1px solid ${accentColor}35`,
            }}
          >
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {title}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              รวมทั้งหมด {total.toLocaleString()} รายการ
            </span>
          </div>
        </div>
      </div>

      {/* Donut and Legend Body */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 my-auto py-1">
        {/* Donut Chart */}
        <ModernDonutChart
          data={data}
          centerMetric={centerMetric}
          centerLabel={centerLabel}
          onSelectSlice={(key) => onOpenDrilldown(key)}
        />

        {/* Legend / Breakdown List */}
        <div className="flex-1 w-full space-y-2.5">
          {data.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onOpenDrilldown(item.key)}
                className="w-full text-left p-2 rounded-xl transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/60 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60"
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform"
                      style={{ background: item.color }}
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({pct.toFixed(0)}%)
                    </span>
                    <ChevronRight
                      size={13}
                      className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: item.color }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   DRILLDOWN MODAL / DRAWER
   ───────────────────────────────────────────────────────────── */
export function DrilldownModal({
  isOpen,
  onClose,
  category,
  statusKey,
  items = [],
  navigate,
}) {
  if (!isOpen) return null

  const meta = getStatusMeta(statusKey)
  const categoryNames = {
    machines: 'เครื่องจักร',
    workorders: 'ใบสั่งงาน',
    pmplans: 'แผนบำรุงรักษา (PM)',
    spareparts: 'คลังอะไหล่',
  }

  const categoryRoutes = {
    machines: '/machines',
    workorders: '/workorders',
    pmplans: '/pm',
    spareparts: '/spareparts',
  }

  const route = categoryRoutes[category] || '/'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border animate-scaleUp"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderColor: 'var(--border-subtle, #e2e8f0)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ background: meta.color }}
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                <span>{categoryNames[category]}</span>
                <span className="text-slate-400 font-normal">/</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                พบทั้งหมด {items.length} รายการ
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่พบรายการในสถานะนี้
            </div>
          ) : (
            items.map((item, index) => {
              if (category === 'machines') {
                return (
                  <div
                    key={item.id || item.MC || index}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                          {item.MC || item.Machine_MC}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {item.Brand} {item.Model}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        ประเภท: {item.Type || '—'} | จุดตั้ง: {item.Location || '—'} | RPM: {item.RPM || '—'}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              }

              if (category === 'workorders') {
                const woId = item.Job_ID || item['Job ID'] || item.id || `WO-${index + 1}`
                return (
                  <div
                    key={woId}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                          {woId}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          เครื่อง: {item.MC || '—'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ประเภท: {item.JobType || '—'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                        {item.Details || item.Comment || item.Problem || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        KI: {item.KI || '—'} | แบบ: {item.Design || '—'} | ม้วน: {item.Roll_No || '—'}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold self-start sm:self-center"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              }

              if (category === 'pmplans') {
                const planId = item.Plan_ID || item['Plan ID'] || item.id || `PM-${index + 1}`
                return (
                  <div
                    key={planId}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {planId}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          เครื่อง: {item.MC || '—'}
                        </span>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {item.Title || item.Task || '—'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        กำหนด: {item.DueDate || item.PlanDate || '—'} | ผู้รับผิดชอบ: {item.Technician || '—'}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold self-start sm:self-center"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              }

              if (category === 'spareparts') {
                const partId = item.Part_ID || item['Part ID'] || item.id || `SP-${index + 1}`
                return (
                  <div
                    key={partId}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {partId}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {item.Part_Name || item.Name || '—'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        คลัง: {item.Location || '—'} | คงเหลือ: {item.Stock_Qty ?? 0} {item.Unit || 'ชิ้น'} | ขั้นต่ำ: {item.Min_Stock ?? 0}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                )
              }

              return null
            })
          )}
        </div>

        {/* Modal Footer with Direct Page Link */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            คลิกเพื่อไปยังหน้าระบบหลักสำหรับแก้ไขหรือจัดการข้อมูล
          </span>
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(route)
            }}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-semibold"
          >
            <span>เปิดหน้า {categoryNames[category]}</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

