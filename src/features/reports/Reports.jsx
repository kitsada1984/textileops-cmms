import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cpu,
  ClipboardList,
  Calendar,
  Package,
  AlertTriangle,
  Printer,
  RefreshCw,
  ExternalLink,
  X,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { th } from 'date-fns/locale'
import { MachineAPI, WorkOrderAPI, PMPlanAPI, SparePartAPI, isSystemWorkOrder } from '../../api/entities'
import { useRealtimeTables } from '../../api/realtimeSync'
import { useT } from '../../contexts/LanguageContext'

/* ─────────────────────────────────────────────────────────────
   SEMANTIC STATUS SYSTEM & TOKENS (Standard CMMS Color Protocol)
   ───────────────────────────────────────────────────────────── */
import { getStatusMeta, matchesTimeFilter, StatusAnalyticsCard, DrilldownModal } from './reportParts.jsx'

/* ─────────────────────────────────────────────────────────────
   MAIN REPORTS PAGE COMPONENT
   ───────────────────────────────────────────────────────────── */
export default function Reports() {
  const { t } = useT()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeFilter, setTimeFilter] = useState('all') // 'all' | 'today' | 'week' | 'month'

  const [rawData, setRawData] = useState({
    machines: [],
    workorders: [],
    pmplans: [],
    spareparts: [],
  })

  // Drilldown Modal State
  const [drilldown, setDrilldown] = useState({
    isOpen: false,
    category: '', // 'machines' | 'workorders' | 'pmplans' | 'spareparts'
    statusKey: '',
    items: [],
  })

  // Fetch Data function
  const fetchData = async (isManualRefresh = false, { silent = false } = {}) => {
    if (isManualRefresh) setRefreshing(true)
    else if (!silent) setLoading(true)

    try {
      const [m, w, p, s] = await Promise.allSettled([
        MachineAPI.list(),
        WorkOrderAPI.list(),
        PMPlanAPI.list(),
        SparePartAPI.list(),
      ])

      const machines = m.status === 'fulfilled' ? (m.value?.data || m.value || []) : []
      const rawWO = w.status === 'fulfilled' ? (w.value?.data || w.value || []) : []
      const workorders = rawWO.filter((x) => !isSystemWorkOrder(x))
      const pmplans = p.status === 'fulfilled' ? (p.value?.data || p.value || []) : []
      const spareparts = s.status === 'fulfilled' ? (s.value?.data || s.value || []) : []

      setRawData({ machines, workorders, pmplans, spareparts })
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }

  useRealtimeTables(['machines', 'workorders', 'pmplans', 'spareparts'], () => {
    fetchData(false, { silent: true })
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered Work Orders & PM Plans by selected time frame
  const filteredWorkOrders = useMemo(() => {
    return rawData.workorders.filter((w) =>
      matchesTimeFilter(w.Date || w.created_at || w.CreatedAt, timeFilter)
    )
  }, [rawData.workorders, timeFilter])

  const filteredPMPLans = useMemo(() => {
    return rawData.pmplans.filter((p) =>
      matchesTimeFilter(p.PlanDate || p.DueDate || p.created_at, timeFilter)
    )
  }, [rawData.pmplans, timeFilter])

  // Computed Status Slices
  const machineSlices = useMemo(() => {
    const list = rawData.machines
    const statuses = ['RUNNING', 'BREAKDOWN', 'MAINTENANCE', 'IDLE', 'DECOMMISSIONED']
    return statuses
      .map((st) => {
        const meta = getStatusMeta(st)
        return {
          key: st,
          label: meta.label,
          color: meta.color,
          value: list.filter((m) => m.Status === st).length,
        }
      })
      .filter((d) => d.value > 0)
  }, [rawData.machines])

  const woSlices = useMemo(() => {
    const list = filteredWorkOrders
    const statuses = ['COMPLETED', 'IN_PROGRESS', 'OPEN', 'CANCELLED']
    return statuses
      .map((st) => {
        const meta = getStatusMeta(st)
        return {
          key: st,
          label: meta.label,
          color: meta.color,
          value: list.filter((w) => w.Status === st).length,
        }
      })
      .filter((d) => d.value > 0)
  }, [filteredWorkOrders])

  const pmSlices = useMemo(() => {
    const list = filteredPMPLans
    const statuses = ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'OVERDUE']
    return statuses
      .map((st) => {
        const meta = getStatusMeta(st)
        return {
          key: st,
          label: meta.label,
          color: meta.color,
          value: list.filter((p) => p.Status === st).length,
        }
      })
      .filter((d) => d.value > 0)
  }, [filteredPMPLans])

  const partSlices = useMemo(() => {
    const list = rawData.spareparts
    const statuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']
    return statuses
      .map((st) => {
        const meta = getStatusMeta(st)
        return {
          key: st,
          label: meta.label,
          color: meta.color,
          value: list.filter((s) => s.Status === st).length,
        }
      })
      .filter((d) => d.value > 0)
  }, [rawData.spareparts])

  // Key KPI Rates
  const totalMC = rawData.machines.length
  const runningMC = rawData.machines.filter((m) => m.Status === 'RUNNING').length
  const mcAvailRate = totalMC > 0 ? ((runningMC / totalMC) * 100).toFixed(0) : '0'

  const totalWO = filteredWorkOrders.length
  const doneWO = filteredWorkOrders.filter((w) => w.Status === 'COMPLETED').length
  const woDoneRate = totalWO > 0 ? ((doneWO / totalWO) * 100).toFixed(0) : '0'

  const totalPM = filteredPMPLans.length
  const onTimePM = filteredPMPLans.filter((p) => p.Status === 'COMPLETED' || p.Status === 'SCHEDULED').length
  const pmRate = totalPM > 0 ? ((onTimePM / totalPM) * 100).toFixed(0) : '0'

  const totalParts = rawData.spareparts.length
  const inStockParts = rawData.spareparts.filter((s) => s.Status === 'IN_STOCK').length
  const partHealthRate = totalParts > 0 ? ((inStockParts / totalParts) * 100).toFixed(0) : '0'

  // Critical Attention Items
  const breakdownCount = rawData.machines.filter((m) => m.Status === 'BREAKDOWN').length
  const overduePMCount = filteredPMPLans.filter((p) => p.Status === 'OVERDUE').length
  const outOfStockCount = rawData.spareparts.filter((s) => s.Status === 'OUT_OF_STOCK').length
  const hasCriticalItems = breakdownCount > 0 || overduePMCount > 0 || outOfStockCount > 0

  // Open Drilldown Handler
  const handleOpenDrilldown = (category, statusKey) => {
    let items = []
    if (category === 'machines') {
      items = rawData.machines.filter((m) => m.Status === statusKey)
    } else if (category === 'workorders') {
      items = filteredWorkOrders.filter((w) => w.Status === statusKey)
    } else if (category === 'pmplans') {
      items = filteredPMPLans.filter((p) => p.Status === statusKey)
    } else if (category === 'spareparts') {
      items = rawData.spareparts.filter((s) => s.Status === statusKey)
    }

    setDrilldown({
      isOpen: true,
      category,
      statusKey,
      items,
    })
  }

  // Handle Print Action
  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner-gemini" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <span className="text-sm font-medium text-slate-400">{t('loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & ACTION CONTROLS BAR (Hidden on Print)
         ───────────────────────────────────────────────────────────── */}
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

      {/* Printable Document Header (Only shows in Print Mode) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              รายงานสรุปผลการดำเนินงาน CMMS (Executive Report)
            </h1>
            <p className="text-xs text-slate-600">
              พิมพ์เมื่อวันที่: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: th })} | ข้อมูลช่วงเวลา: {timeFilter === 'all' ? 'ทั้งหมด' : timeFilter}
            </p>
          </div>
          <div className="text-right font-mono text-xs font-bold text-slate-700">
            TextileOps Platform
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXECUTIVE KPI CARDS (Top Priority Visual Hierarchy)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
        {/* KPI 1: Machine Availability */}
        <div
          className="card p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01]"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderColor: 'var(--border-subtle, #e2e8f0)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Cpu size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {mcAvailRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {runningMC} <span className="text-xs font-normal text-slate-400">/ {totalMC}</span>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
              {t('rpt_kpi_mc_avail') || 'ความพร้อมเครื่องจักร'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">เดินเครื่องปกติ</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${mcAvailRate}%` }} />
          </div>
        </div>

        {/* KPI 2: WO Completion Rate */}
        <div
          className="card p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01]"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderColor: 'var(--border-subtle, #e2e8f0)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ClipboardList size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {woDoneRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {doneWO} <span className="text-xs font-normal text-slate-400">/ {totalWO}</span>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
              {t('rpt_kpi_wo_rate') || 'อัตราปิดงานซ่อม'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">งานที่ปิดเสร็จแล้ว</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${woDoneRate}%` }} />
          </div>
        </div>

        {/* KPI 3: PM Performance Rate */}
        <div
          className="card p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01]"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderColor: 'var(--border-subtle, #e2e8f0)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {pmRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {onTimePM} <span className="text-xs font-normal text-slate-400">/ {totalPM}</span>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
              {t('rpt_kpi_pm_rate') || 'ประสิทธิภาพแผน PM'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">เสร็จสิ้น & ตามแผน</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pmRate}%` }} />
          </div>
        </div>

        {/* KPI 4: Stock Health */}
        <div
          className="card p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01]"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderColor: 'var(--border-subtle, #e2e8f0)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {partHealthRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              {inStockParts} <span className="text-xs font-normal text-slate-400">/ {totalParts}</span>
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
              {t('rpt_kpi_stock_health') || 'ความพร้อมสต็อกอะไหล่'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">มีของพร้อมใช้งาน</div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full" style={{ width: `${partHealthRate}%` }} />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ATTENTION REQUIRED BANNER (When Critical Issues Exist)
         ───────────────────────────────────────────────────────────── */}
      {hasCriticalItems && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 text-red-900 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">
                {t('rpt_attention_title') || 'รายการที่ต้องติดตามเร่งด่วน'}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300/80 mt-0.5">
                พบรายการที่อาจกระทบต่อสายการผลิตและการบำรุงรักษา
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            {breakdownCount > 0 && (
              <button
                type="button"
                onClick={() => handleOpenDrilldown('machines', 'BREAKDOWN')}
                className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>เครื่องเสีย: {breakdownCount} เครื่อง</span>
                <ChevronRight size={13} />
              </button>
            )}

            {overduePMCount > 0 && (
              <button
                type="button"
                onClick={() => handleOpenDrilldown('pmplans', 'OVERDUE')}
                className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>PM เกินกำหนด: {overduePMCount} งาน</span>
                <ChevronRight size={13} />
              </button>
            )}

            {outOfStockCount > 0 && (
              <button
                type="button"
                onClick={() => handleOpenDrilldown('spareparts', 'OUT_OF_STOCK')}
                className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>อะไหล่หมด: {outOfStockCount} รายการ</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. 4 DETAILED STATUS ANALYTICS CARDS (Modern Donut + Progress)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Machine Status */}
        <StatusAnalyticsCard
          title={t('rpt_mc_status') || 'สถานะเครื่องจักร'}
          icon={Cpu}
          accentColor="#2563eb"
          data={machineSlices}
          total={totalMC}
          centerMetric={`${mcAvailRate}%`}
          centerLabel="ความพร้อมเดินเครื่อง"
          onOpenDrilldown={(key) => handleOpenDrilldown('machines', key)}
        />

        {/* Card 2: Work Order Status */}
        <StatusAnalyticsCard
          title={t('rpt_wo_status') || 'สถานะใบสั่งงาน'}
          icon={ClipboardList}
          accentColor="#059669"
          data={woSlices}
          total={totalWO}
          centerMetric={`${woDoneRate}%`}
          centerLabel="อัตราปิดงานสำเร็จ"
          onOpenDrilldown={(key) => handleOpenDrilldown('workorders', key)}
        />

        {/* Card 3: PM Plan Status */}
        <StatusAnalyticsCard
          title={t('rpt_pm_status') || 'สถานะแผน PM'}
          icon={Calendar}
          accentColor="#6366f1"
          data={pmSlices}
          total={totalPM}
          centerMetric={`${pmRate}%`}
          centerLabel="เสร็จสิ้น & ตามแผน"
          onOpenDrilldown={(key) => handleOpenDrilldown('pmplans', key)}
        />

        {/* Card 4: Spare Part Status */}
        <StatusAnalyticsCard
          title={t('rpt_sp_status') || 'สถานะคลังอะไหล่'}
          icon={Package}
          accentColor="#0d9488"
          data={partSlices}
          total={totalParts}
          centerMetric={`${partHealthRate}%`}
          centerLabel="มีของพร้อมใช้"
          onOpenDrilldown={(key) => handleOpenDrilldown('spareparts', key)}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DRILLDOWN SLIDE-OVER / MODAL
         ───────────────────────────────────────────────────────────── */}
      <DrilldownModal
        isOpen={drilldown.isOpen}
        onClose={() => setDrilldown({ ...drilldown, isOpen: false })}
        category={drilldown.category}
        statusKey={drilldown.statusKey}
        items={drilldown.items}
        navigate={navigate}
      />
    </div>
  )
}
