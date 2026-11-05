import { useEffect, useState, useCallback } from 'react'
import { DashboardStats } from './dashboardStats.jsx'
import { DashboardRepairs } from './dashboardRepairs.jsx'
import { DashboardWorkOrders } from './dashboardWorkOrders.jsx'
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
      <DashboardRepairs stats={stats} t={t} setSelectedRepair={setSelectedRepair} baseUrl={baseUrl} />


      {/* ── RECENT WORK ORDERS SECTION (CLICKABLE ROWS) ───────────────────────── */}
      <DashboardWorkOrders stats={stats} t={t} setSelectedWO={setSelectedWO} getWorkOrderDetails={getWorkOrderDetails} statusLabel={statusLabel} />


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
