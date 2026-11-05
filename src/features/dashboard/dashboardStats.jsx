import { AlertTriangle, Calendar, ClipboardList, Cpu, Disc, Package, TrendingUp, Wrench } from 'lucide-react'
import { StatCard } from './dashboardHelpers.jsx'

export function DashboardStats({ stats, t, statusLabel }) {
  return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          icon={Cpu}
          label={t('dash_total_mc')}
          value={stats.totalMachines}
          sub={`${stats.running} ${t('dash_running_sub')}`}
          color="slate"
          to="/machines"
        />
        <StatCard
          icon={AlertTriangle}
          label={t('dash_breakdown')}
          value={stats.breakdown}
          sub={statusLabel('BREAKDOWN')}
          color="red"
          to="/machines"
        />
        <StatCard
          icon={Wrench}
          label="งานแจ้งซ่อมค้าง"
          value={stats.pendingRepairsCount ?? 0}
          sub={`${stats.pendingApprove || 0} รออนุมัติ · ${stats.inProgressRepairs || 0} กำลังซ่อม`}
          color="amber"
          to="/repair-requests"
        />
        <StatCard
          icon={ClipboardList}
          label={t('dash_open_wo')}
          value={stats.openWO}
          sub={`${stats.overdueWO} ${t('dash_overdue_sub')}`}
          color="blue"
          to="/workorders"
        />
        <StatCard
          icon={Calendar}
          label={t('dash_pm_sched')}
          value={stats.pmScheduled}
          sub={`${stats.pmOverdue} ${t('dash_overdue_sub')}`}
          color="orange"
          to="/pm"
        />
        <StatCard
          icon={Package}
          label={t('dash_low_stock')}
          value={stats.lowStock}
          sub={`${stats.outOfStock} ${t('dash_out_sub')}`}
          color="orange"
          to="/spareparts"
        />
        <StatCard
          icon={Disc}
          label={t('dash_pm_overdue')}
          value={stats.pmOverdue}
          sub={statusLabel('OVERDUE')}
          color="rose"
          to="/pm"
        />
        <StatCard
          icon={TrendingUp}
          label={t('dash_recent_wo')}
          value={stats.recentWO?.length || 0}
          sub={t('dash_latest_sub')}
          color="violet"
          to="/workorders"
        />
      </div>
  )
}
