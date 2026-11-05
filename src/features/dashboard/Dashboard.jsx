import { useEffect, useState, useCallback } from 'react'
import { DashboardStats } from './dashboardStats.jsx'
import { useRealtimeTables } from '../../api/realtimeSync'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  CheckCircle,
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
  NeedleConditionAPI,
  NeedleSetAPI,
  NeedleHistoryAPI,
  isSystemWorkOrder,
} from '../../api/entities'
import { useT } from '../../contexts/LanguageContext'
import { useToast } from '../../components/ui/Toast'
import { syncRowsToGoogleSheet } from '../../utils/googleSheetsSync'
import { SHEET_EXPORTS } from '../../utils/sheetExportConfigs'
import { getAppBaseUrl, normalizeRepairRecord } from '../../utils/telegram'
import DetailDrawer from '../../components/ui/DetailDrawer'
import { getWorkOrderDetails } from '../../pages/WorkOrders'

export * from './dashboardHelpers.jsx'
import {
  statusLabel,
  SHEET_APIS,
  RepairStatusBadge,
  formatDateTime,
  isRepairSyncedWorkOrder,
  isPendingWorkOrder,
  isPendingRepairRequest,
} from './dashboardHelpers.jsx'
import { buildRepairDrawerGroups, buildWoDrawerGroups } from './dashboardDrawers.jsx'


export default function Dashboard() {
  const { t } = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [selectedRepair, setSelectedRepair] = useState(null)
  const [selectedWO, setSelectedWO] = useState(null)

  const loadDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [m, w, p, s, r] = await Promise.allSettled([
        MachineAPI.list(),
        WorkOrderAPI.list(),
        PMPlanAPI.list(),
        SparePartAPI.list(),
        RepairRequestAPI.list(),
      ])
      const machines       = m.status === 'fulfilled' ? (m.value?.data || m.value || []) : []
      const rawWO          = w.status === 'fulfilled' ? (w.value?.data || w.value || []) : []
      const validWorkorders = rawWO.filter((x) => !isSystemWorkOrder(x))
      const dashboardWorkorders = validWorkorders.filter((x) => !isRepairSyncedWorkOrder(x))
      const pm             = p.status === 'fulfilled' ? (p.value?.data || p.value || []) : []
      const parts          = s.status === 'fulfilled' ? (s.value?.data || s.value || []) : []
      const rawRepairRequests = r.status === 'fulfilled' ? (r.value?.data || r.value || []) : []
      const repairRequests = rawRepairRequests.map(normalizeRepairRecord)

      const pendingRepairs = repairRequests
        .filter(isPendingRepairRequest)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

      const pendingWorkorders = dashboardWorkorders
        .filter(isPendingWorkOrder)
        .sort((a, b) => new Date(b.StartDate || b.DateStart || b.created_at || 0) - new Date(a.StartDate || a.DateStart || a.created_at || 0))

      const pendingApprove = repairRequests.filter((x) => x.status === 'PENDING').length
      const inProgressRepairs = repairRequests.filter((x) => x.status === 'IN_PROGRESS').length
      const waitPartsRepairs = repairRequests.filter((x) => x.status === 'WAIT_PARTS').length

      setStats({
        totalMachines: machines.length,
        breakdown: machines.filter((x) => x.Status === 'BREAKDOWN').length,
        running: machines.filter((x) => x.Status === 'RUNNING').length,
        openWO: dashboardWorkorders.filter((x) => ['OPEN', 'IN_PROGRESS'].includes(x.Status)).length,
        overdueWO: dashboardWorkorders.filter((x) => x.Status === 'OVERDUE').length,
        pmScheduled: pm.filter((x) => x.Status === 'SCHEDULED').length,
        pmOverdue: pm.filter((x) => x.Status === 'OVERDUE').length,
        lowStock: parts.filter((x) => x.Status === 'LOW_STOCK').length,
        outOfStock: parts.filter((x) => x.Status === 'OUT_OF_STOCK').length,
        pendingRepairsCount: pendingRepairs.length,
        pendingApprove,
        inProgressRepairs,
        waitPartsRepairs,
        pendingRepairsList: pendingRepairs,
        recentWO: pendingWorkorders,
      })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useRealtimeTables(['machines', 'workorders', 'pmplans', 'spareparts', 'repair_requests'], () => {
    loadDashboardData({ silent: true })
  })

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const syncAllSheets = async () => {
    setSyncingAll(true)
    try {
      const results = await Promise.allSettled(
        SHEET_EXPORTS.map(async (config) => {
          const api = SHEET_APIS[config.key]
          if (!api) throw new Error(`ไม่พบ API สำหรับชีท "${config.sheetName}"`)
          const rows = await api.list()
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
        // Show why it failed, not just which sheet (the reason came back from
        // the Google Sheets webhook and used to be swallowed).
        const detail = failed
          .slice(0, 3)
          .map(({ item, config }) => {
            const reason = String(item.reason?.message || item.reason || '').replace(/\s+/g, ' ').slice(0, 120)
            return reason ? `${config.sheetName}: ${reason}` : config.sheetName
          })
          .join(' • ')
        toast.warning(
          `อัปเดต Sheet สำเร็จ ${passed.length}/${SHEET_EXPORTS.length} ชีต`,
          `ไม่สำเร็จ: ${detail}`
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
  const repairDrawerGroups = buildRepairDrawerGroups(selectedRepair)

  // Groups for Work Order Detail Drawer
  const woDrawerGroups = buildWoDrawerGroups(selectedWO)

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
      <DashboardStats stats={stats} t={t} statusLabel={statusLabel} />


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
                <th className="py-3 px-3 text-left whitespace-nowrap">Design</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">KI</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">เลขม้วน</th>
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
                  <td className="py-2.5 px-3 font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {req.Design || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {req.KI !== undefined && req.KI !== null && req.KI !== '' ? req.KI : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {req.roll_no || req.RollNo || req.roll_number || '—'}
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
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{t('dash_wo_table')} (ที่ค้างในระบบ)</span>
                <span className="badge badge-blue font-bold text-xs px-2 py-0.5">
                  {stats.recentWO?.length || 0} รายการ
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">คลิกที่รายการเพื่อดูรายละเอียดใบสั่งงานที่กำลังดำเนินการ</p>
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
                  <td className="py-2.5 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300">{getWorkOrderDetails(wo) || wo.Design || '—'}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`badge ${wo.JobType==='DESIGN'?'badge-purple':wo.JobType==='PM'?'badge-yellow':wo.JobType==='SETUP'?'badge-indigo text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800':'badge-blue'}`}>
                      {wo.JobType==='DESIGN'?'🎨 ปรับแบบ':wo.JobType==='PM'?'🧹 PM':wo.JobType==='SETUP'?'⚙️ เตรียมเครื่อง':wo.JobType==='REPAIR'?'🛠️ แก้ไข':(statusLabel(wo.Priority) || '🛠️ แก้ไข')}
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
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">ไม่มีใบสั่งงานค้างในระบบ</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">ทุกรายการได้รับการดำเนินการเสร็จสิ้นเรียบร้อยแล้ว</p>
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
