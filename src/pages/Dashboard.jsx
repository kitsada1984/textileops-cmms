import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Cpu,
  Disc,
  ClipboardList,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  Wrench,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  MachineAPI,
  CylinderAPI,
  WorkOrderAPI,
  PMPlanAPI,
  SparePartAPI,
  PurchaseOrderAPI,
  StockTxnAPI,
  RepairRequestAPI,
  DesignBomAPI,
} from '../api/entities'
import { useT } from '../contexts/LanguageContext'
import { useToast } from '../components/ui/Toast'
import { syncRowsToGoogleSheet } from '../utils/googleSheetsSync'
import { SHEET_EXPORTS } from '../utils/sheetExportConfigs'
import { getAppBaseUrl } from '../utils/telegram'
import DetailDrawer from '../components/ui/DetailDrawer'

const ICON_BG = {
  slate:   'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  red:     'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  blue:    'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  amber:   'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  orange:  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  emerald: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  rose:    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
  violet:  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
}

const STATUS_LABELS = {
  BREAKDOWN: 'เครื่องเสีย',
  RUNNING: 'เดินเครื่อง',
  OVERDUE: 'เกินกำหนด',
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'กลาง',
  LOW: 'ต่ำ',
  OPEN: 'เปิด',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จแล้ว',
}

const statusLabel = (value) => STATUS_LABELS[value] || value

const SHEET_APIS = {
  machines: MachineAPI,
  cylinders: CylinderAPI,
  workorders: WorkOrderAPI,
  pmplans: PMPlanAPI,
  designBom: DesignBomAPI,
  repairRequests: RepairRequestAPI,
  spareparts: SparePartAPI,
  purchaseorders: PurchaseOrderAPI,
  stocktransactions: StockTxnAPI,
}

function StatCard({ icon: Icon, label, value, sub, color = 'slate', to, onClick }) {
  const content = (
    <div
      className={`stat-card transition-all duration-200 ${
        to || onClick
          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] border-transparent hover:border-blue-500/40 group'
          : ''
      }`}
    >
      <div
        className="stat-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ background: ICON_BG[color], boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="stat-val text-xl sm:text-2xl font-black leading-tight truncate flex items-center justify-between"
          style={{ color: 'var(--text-900)' }}
        >
          <span>{value ?? '—'}</span>
          {(to || onClick) && (
            <ArrowUpRight
              size={14}
              className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
        <div
          className="stat-label text-xs sm:text-sm font-semibold mt-0.5 truncate group-hover:text-blue-500 transition-colors"
          style={{ color: 'var(--text-600)' }}
          title={label}
        >
          {label}
        </div>
        {sub && (
          <div className="stat-sub text-[10.5px] sm:text-xs mt-0.5 truncate text-slate-500" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <div onClick={onClick} role="button" tabIndex={0} className="w-full text-left">
        {content}
      </div>
    )
  }
  return content
}

function RepairStatusBadge({ status }) {
  const cfg = {
    PENDING: { label: 'รอการอนุมัติ', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    IN_PROGRESS: { label: 'กำลังซ่อม', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    WAIT_PARTS: { label: 'รออะไหล่', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    COMPLETED: { label: 'ซ่อมเสร็จ', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  }[status] || { label: status || '—', bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${cfg.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{cfg.label}</span>
    </span>
  )
}

function formatDateTime(val) {
  if (!val) return '—'
  try {
    return format(new Date(val), 'dd/MM/yy HH:mm')
  } catch {
    return String(val)
  }
}

export default function Dashboard() {
  const { t } = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState(null)
  const [selectedWO, setSelectedWO] = useState(null)

  useEffect(() => {
    Promise.allSettled([
      MachineAPI.list(),
      WorkOrderAPI.list(),
      PMPlanAPI.list(),
      SparePartAPI.list(),
      RepairRequestAPI.list(),
    ]).then(([m, w, p, s, r]) => {
      const machines       = m.status === 'fulfilled' ? (m.value?.data || m.value || []) : []
      const workorders     = w.status === 'fulfilled' ? (w.value?.data || w.value || []) : []
      const pm             = p.status === 'fulfilled' ? (p.value?.data || p.value || []) : []
      const parts          = s.status === 'fulfilled' ? (s.value?.data || s.value || []) : []
      const repairRequests = r.status === 'fulfilled' ? (r.value?.data || r.value || []) : []

      const pendingRepairs = repairRequests
        .filter((x) => x.status !== 'COMPLETED' && x.status !== 'REJECTED')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

      const pendingApprove = repairRequests.filter((x) => x.status === 'PENDING').length
      const inProgressRepairs = repairRequests.filter((x) => x.status === 'IN_PROGRESS').length
      const waitPartsRepairs = repairRequests.filter((x) => x.status === 'WAIT_PARTS').length

      setStats({
        totalMachines: machines.length,
        breakdown: machines.filter((x) => x.Status === 'BREAKDOWN').length,
        running: machines.filter((x) => x.Status === 'RUNNING').length,
        openWO: workorders.filter((x) => ['OPEN', 'IN_PROGRESS'].includes(x.Status)).length,
        overdueWO: workorders.filter((x) => x.Status === 'OVERDUE').length,
        pmScheduled: pm.filter((x) => x.Status === 'SCHEDULED').length,
        pmOverdue: pm.filter((x) => x.Status === 'OVERDUE').length,
        lowStock: parts.filter((x) => x.Status === 'LOW_STOCK').length,
        outOfStock: parts.filter((x) => x.Status === 'OUT_OF_STOCK').length,
        pendingRepairsCount: pendingRepairs.length,
        pendingApprove,
        inProgressRepairs,
        waitPartsRepairs,
        pendingRepairsList: pendingRepairs,
        recentWO: workorders.slice(0, 5),
      })
      setLoading(false)
    })
  }, [])

  const syncAllSheets = async () => {
    setSyncingAll(true)
    try {
      const results = await Promise.allSettled(
        SHEET_EXPORTS.map(async (config) => {
          const rows = await SHEET_APIS[config.key].list()
          const result = await syncRowsToGoogleSheet({
            sheetName: config.sheetName,
            columns: config.columns,
            rows: rows?.data || rows || [],
            valueGetters: config.valueGetters,
          })
          return {
            sheetName: config.sheetName,
            rowCount: result.rowCount ?? rows?.length ?? 0,
          }
        })
      )

      const passed = results
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value)
      const failed = results
        .map((item, index) => ({ item, config: SHEET_EXPORTS[index] }))
        .filter(({ item }) => item.status === 'rejected')

      if (failed.length) {
        toast.warning(
          'อัปเดต Sheet บางเมนูไม่สำเร็จ',
          failed.map(({ config }) => config.sheetName).join(', ')
        )
        return
      }

      const totalRows = passed.reduce((sum, item) => sum + (Number(item.rowCount) || 0), 0)
      toast.success('อัปเดต Sheet ALL สำเร็จ', `${passed.length} ชีต, ${totalRows} รายการ`)
    } catch (error) {
      toast.error('อัปเดต Sheet ALL ไม่สำเร็จ', error.message)
    } finally {
      setSyncingAll(false)
    }
  }

  const baseUrl = getAppBaseUrl()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner-gemini" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-400)' }}>{t('loading')}</span>
      </div>
    </div>
  )

  // Groups for Repair Request Detail Drawer
  const repairDrawerGroups = selectedRepair ? [
    {
      title: 'ข้อมูลการแจ้งซ่อม',
      items: [
        { label: 'เลขที่แจ้งซ่อม', value: selectedRepair.request_no || (selectedRepair.id ? `REQ-${selectedRepair.id.slice(0, 8)}` : '—') },
        { label: 'เครื่องจักร (M/C)', value: selectedRepair.machine_mc || '—' },
        { label: 'ซีเรียลกระบอก', value: selectedRepair.cylinder_serial || '—' },
        { label: 'ตำแหน่งติดตั้ง', value: selectedRepair.cylinder_location || '—' },
        { label: 'สถานะ', value: <RepairStatusBadge status={selectedRepair.status} /> },
      ],
    },
    {
      title: 'รายละเอียดและผู้รับผิดชอบ',
      items: [
        { label: 'อาการเสีย / ปัญหา', value: selectedRepair.problem_description || '—' },
        { label: 'ผู้แจ้งซ่อม', value: selectedRepair.reported_by || '—' },
        { label: 'วันที่แจ้ง', value: formatDateTime(selectedRepair.created_at) },
        { label: 'ช่างผู้รับผิดชอบ', value: selectedRepair.technician_name || 'ยังไม่มอบหมาย' },
        { label: 'รายละเอียดการซ่อม', value: selectedRepair.repair_details || '—' },
        { label: 'อะไหล่ที่ใช้', value: selectedRepair.parts_used || '—' },
      ],
    },
  ] : []

  // Groups for Work Order Detail Drawer
  const woDrawerGroups = selectedWO ? [
    {
      title: 'ข้อมูลใบสั่งงาน',
      items: [
        { label: 'Job ID / WO ID', value: selectedWO.Job_ID || selectedWO['Job ID'] || selectedWO.WO_ID || '—' },
        { label: 'รหัสเครื่อง (M/C)', value: selectedWO.MC || '—' },
        { label: 'รหัสงาน (KI)', value: selectedWO.KI || '—' },
        { label: 'ลายผ้า / Design', value: selectedWO.Design || '—' },
        { label: 'ประเภทงาน', value: selectedWO.JobType || selectedWO.Priority || '—' },
        { label: 'สถานะ', value: statusLabel(selectedWO.Status) || selectedWO.Status },
      ],
    },
    {
      title: 'รายละเอียดและเวลาปฏิบัติงาน',
      items: [
        { label: 'หมายเหตุ / ปัญหา', value: selectedWO.Comment || selectedWO.Problem || selectedWO.Detail || '—' },
        { label: 'ช่างผู้ปฏิบัติงาน', value: selectedWO.Technicians || selectedWO.Tech || '—' },
        { label: 'วันที่เริ่มงาน', value: selectedWO.StartDate || selectedWO.DateStart || '—' },
        { label: 'วันที่เสร็จสิ้น', value: selectedWO.EndDate || selectedWO.DateEnd || '—' },
        { label: 'ผู้เปิดงาน', value: selectedWO.CreatedBy || '—' },
      ],
    },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          className="btn-outline"
          onClick={syncAllSheets}
          disabled={syncingAll}
          title="อัปเดต Google Sheet ทุกเมนู"
        >
          <FileSpreadsheet size={14} />
          {syncingAll ? 'กำลังอัปเดต Sheet ALL...' : 'อัปเดต Sheet ALL'}
        </button>
      </div>

      {/* ── 8-STAT CARDS SUMMARY (CLICKABLE TO RESPECTIVE PAGES) ───────────────── */}
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

      {/* ── PENDING REPAIR REQUESTS SECTION (CLICKABLE ROWS) ──────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="card-header flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
              <Wrench size={16} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>งานแจ้งซ่อมที่ค้างในระบบ (Pending Repair Requests)</span>
                <span className="badge badge-yellow font-bold text-xs px-2 py-0.5">
                  {stats.pendingRepairsList?.length || 0} รายการ
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                คลิกที่รายการเพื่อดูรายละเอียด หรือกดเปิดดูงานซ่อม
              </p>
            </div>
          </div>
          <Link
            to="/repair-requests"
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-blue-600 transition-colors"
          >
            <span>จัดการงานแจ้งซ่อมทั้งหมด</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-left whitespace-nowrap">เลขที่แจ้งซ่อม</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">เครื่องจักร</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ซีเรียล</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ตำแหน่ง</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">อาการเสีย / ปัญหา</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ผู้แจ้ง</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ช่างผู้รับผิดชอบ</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">วันที่แจ้ง</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">ดูงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(stats.pendingRepairsList || []).map((req, i) => (
                <tr
                  key={req.id || req._id || i}
                  onClick={() => setSelectedRepair(req)}
                  className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap group-hover:underline">
                    {req.request_no || (req.id ? `REQ-${req.id.slice(0, 8)}` : '—')}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {req.machine_mc || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {req.cylinder_serial || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {req.cylinder_location ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                        {req.cylinder_location}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-slate-700 dark:text-slate-300 font-medium" title={req.problem_description}>
                    {req.problem_description || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {req.reported_by || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {req.technician_name || <span className="text-slate-400 font-normal italic">ยังไม่มอบหมาย</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDateTime(req.created_at)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <RepairStatusBadge status={req.status} />
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`${baseUrl}/repair/${encodeURIComponent(req.cylinder_serial || '')}?req=${encodeURIComponent(req.id || req._id || '')}&step=view`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-700 transition-all"
                      title="เปิดดูหน้าแจ้งซ่อม"
                    >
                      <ArrowUpRight size={13} />
                    </a>
                  </td>
                </tr>
              ))}
              {!stats.pendingRepairsList?.length && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">ไม่มีงานแจ้งซ่อมค้างในระบบ</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">ทุกรายการได้รับการซ่อมเสร็จสิ้นเรียบร้อยแล้ว</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECENT WORK ORDERS SECTION (CLICKABLE ROWS) ───────────────────────── */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="card-header flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('dash_wo_table')}</h2>
              <p className="text-[11px] text-slate-500">คลิกที่รายการเพื่อดูรายละเอียดใบสั่งงาน</p>
            </div>
          </div>
          <Link
            to="/workorders"
            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-blue-600 transition-colors"
          >
            <span>จัดการใบสั่งงานทั้งหมด</span>
            <ArrowRight size={13} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-left whitespace-nowrap">{t('wo_th_id')}</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">{t('wo_th_machine')}</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">{t('wo_th_problem')}</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">{t('priority')}</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(stats.recentWO || []).map((wo, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedWO(wo)}
                  className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap group-hover:underline">
                    {wo.Job_ID || wo['Job ID'] || wo.WO_ID || (wo.id ? `JOB-${wo.id.slice(0, 8)}` : '—')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{wo.MC}</td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300">{wo.Comment || wo.Problem || wo.Design || '—'}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`badge ${wo.JobType==='DESIGN'?'badge-purple':wo.JobType==='PM'?'badge-yellow':'badge-blue'}`}>
                      {wo.JobType==='DESIGN'?'🎨 ปรับแบบ':wo.JobType==='PM'?'🧹 PM':wo.JobType==='REPAIR'?'🛠️ แก้ไข':(statusLabel(wo.Priority) || '🛠️ แก้ไข')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`badge ${wo.Status==='COMPLETED'?'badge-green':wo.Status==='IN_PROGRESS'?'badge-orange':wo.Status==='OPEN'?'badge-blue':'badge-gray'}`}>
                      {wo.Status==='COMPLETED'?'เสร็จสิ้น':wo.Status==='IN_PROGRESS'?'กำลังทำ':(statusLabel(wo.Status) || wo.Status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats.recentWO?.length && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    {t('no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL DRAWER: REPAIR REQUEST ──────────────────────────────────── */}
      {selectedRepair && (
        <DetailDrawer
          open={!!selectedRepair}
          onClose={() => setSelectedRepair(null)}
          title={`งานแจ้งซ่อม: ${selectedRepair.request_no || (selectedRepair.id ? `REQ-${selectedRepair.id.slice(0, 8)}` : '—')}`}
          subtitle={`${selectedRepair.machine_mc || ''} ${selectedRepair.cylinder_serial ? `(ซีเรียล: ${selectedRepair.cylinder_serial})` : ''}`}
          icon={Wrench}
          iconBg="rgba(245, 158, 11, 0.15)"
          iconColor="#f59e0b"
          accentColor="#f59e0b"
          badge={<RepairStatusBadge status={selectedRepair.status} />}
          groups={repairDrawerGroups}
          canEdit={false}
          canDelete={false}
          extraActions={
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`${baseUrl}/repair/${encodeURIComponent(selectedRepair.cylinder_serial || '')}?req=${encodeURIComponent(selectedRepair.id || selectedRepair._id || '')}&step=view`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
              >
                <ExternalLink size={13} />
                <span>เปิดหน้าใบแจ้งซ่อม</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setSelectedRepair(null)
                  navigate('/repair-requests')
                }}
                className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
              >
                <span>ไปที่หน้าจัดการแจ้งซ่อม</span>
                <ArrowRight size={13} />
              </button>
            </div>
          }
        />
      )}

      {/* ── DETAIL DRAWER: WORK ORDER ──────────────────────────────────────── */}
      {selectedWO && (
        <DetailDrawer
          open={!!selectedWO}
          onClose={() => setSelectedWO(null)}
          title={`ใบสั่งงาน: ${selectedWO.Job_ID || selectedWO['Job ID'] || selectedWO.WO_ID || '—'}`}
          subtitle={`เครื่องจักร: ${selectedWO.MC || '—'} · รหัสงาน: ${selectedWO.KI || '—'}`}
          icon={ClipboardList}
          iconBg="rgba(59, 130, 246, 0.15)"
          iconColor="#3b82f6"
          accentColor="#3b82f6"
          badge={
            <span className={`badge ${selectedWO.Status==='COMPLETED'?'badge-green':selectedWO.Status==='IN_PROGRESS'?'badge-orange':selectedWO.Status==='OPEN'?'badge-blue':'badge-gray'}`}>
              {selectedWO.Status==='COMPLETED'?'เสร็จสิ้น':selectedWO.Status==='IN_PROGRESS'?'กำลังทำ':(statusLabel(selectedWO.Status) || selectedWO.Status)}
            </span>
          }
          groups={woDrawerGroups}
          canEdit={false}
          canDelete={false}
          extraActions={
            <button
              type="button"
              onClick={() => {
                setSelectedWO(null)
                navigate('/workorders')
              }}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
            >
              <span>ไปที่หน้าจัดการใบสั่งงาน</span>
              <ArrowRight size={13} />
            </button>
          }
        />
      )}
    </div>
  )
}
