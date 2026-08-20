import { useEffect, useState } from 'react'
import { Cpu, Disc, ClipboardList, Package, AlertTriangle, CheckCircle, TrendingUp, Calendar, FileSpreadsheet } from 'lucide-react'
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

function StatCard({ icon: Icon, label, value, sub, color = 'slate' }) {
  return (
    <div className="stat-card">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{background: ICON_BG[color], boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
        <Icon size={19} className="text-white"/>
      </div>
      <div>
        <div className="text-2xl font-bold leading-none" style={{color:'var(--text-900)'}}>{value ?? '—'}</div>
        <div className="text-sm font-medium mt-1" style={{color:'var(--text-600)'}}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{color:'var(--text-400)'}}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useT()
  const toast = useToast()
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      MachineAPI.list(), WorkOrderAPI.list(), PMPlanAPI.list(), SparePartAPI.list(),
    ]).then(([m, w, p, s]) => {
      const machines   = m.status === 'fulfilled' ? (m.value?.data || m.value || []) : []
      const workorders = w.status === 'fulfilled' ? (w.value?.data || w.value || []) : []
      const pm         = p.status === 'fulfilled' ? (p.value?.data || p.value || []) : []
      const parts      = s.status === 'fulfilled' ? (s.value?.data || s.value || []) : []
      setStats({
        totalMachines: machines.length,
        breakdown:     machines.filter(x => x.Status === 'BREAKDOWN').length,
        running:       machines.filter(x => x.Status === 'RUNNING').length,
        openWO:        workorders.filter(x => ['OPEN','IN_PROGRESS'].includes(x.Status)).length,
        overdueWO:     workorders.filter(x => x.Status === 'OVERDUE').length,
        pmScheduled:   pm.filter(x => x.Status === 'SCHEDULED').length,
        pmOverdue:     pm.filter(x => x.Status === 'OVERDUE').length,
        lowStock:      parts.filter(x => x.Status === 'LOW_STOCK').length,
        outOfStock:    parts.filter(x => x.Status === 'OUT_OF_STOCK').length,
        recentWO:      workorders.slice(-5).reverse(),
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner-gemini" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span className="text-sm font-medium" style={{color:'var(--text-400)'}}>{t('loading')}</span>
      </div>
    </div>
  )

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Cpu}           label={t('dash_total_mc')}   value={stats.totalMachines} sub={`${stats.running} ${t('dash_running_sub')}`}    color="slate"   />
        <StatCard icon={AlertTriangle} label={t('dash_breakdown')}  value={stats.breakdown}     sub={statusLabel('BREAKDOWN')}                         color="red"     />
        <StatCard icon={ClipboardList} label={t('dash_open_wo')}    value={stats.openWO}        sub={`${stats.overdueWO} ${t('dash_overdue_sub')}`}   color="blue"    />
        <StatCard icon={Calendar}      label={t('dash_pm_sched')}   value={stats.pmScheduled}   sub={`${stats.pmOverdue} ${t('dash_overdue_sub')}`}   color="amber"   />
        <StatCard icon={Package}       label={t('dash_low_stock')}  value={stats.lowStock}      sub={`${stats.outOfStock} ${t('dash_out_sub')}`}      color="orange"  />
        <StatCard icon={CheckCircle}   label={t('dash_running')}    value={stats.running}       sub={statusLabel('RUNNING')}                           color="emerald" />
        <StatCard icon={Disc}          label={t('dash_pm_overdue')} value={stats.pmOverdue}     sub={statusLabel('OVERDUE')}                           color="rose"    />
        <StatCard icon={TrendingUp}    label={t('dash_recent_wo')}  value={stats.recentWO?.length || 0} sub={t('dash_latest_sub')}                    color="violet"  />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} style={{color:'var(--text-500)'}}/>
            <h2 className="font-semibold" style={{color:'var(--text-900)'}}>{t('dash_wo_table')}</h2>
          </div>
          <span className="badge badge-gray">{stats.recentWO?.length || 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>{t('wo_th_id')}</th>
                <th>{t('wo_th_machine')}</th>
                <th>{t('wo_th_problem')}</th>
                <th>{t('priority')}</th>
                <th>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recentWO || []).map((wo, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {wo.Job_ID || wo['Job ID'] || wo.WO_ID || (wo.id ? `JOB-${wo.id.slice(0, 8)}` : '—')}
                  </td>
                  <td className="font-semibold" style={{color:'var(--text-900)'}}>{wo.MC}</td>
                  <td className="max-w-xs truncate" style={{color:'var(--text-600)'}}>{wo.Comment || wo.Problem || wo.Design || '—'}</td>
                  <td>
                    <span className={`badge ${wo.JobType==='DESIGN'?'badge-purple':wo.JobType==='PM'?'badge-yellow':'badge-blue'}`}>
                      {wo.JobType==='DESIGN'?'🎨 ปรับแบบ':wo.JobType==='PM'?'🧹 PM':wo.JobType==='REPAIR'?'🛠️ แก้ไข':(statusLabel(wo.Priority) || '🛠️ แก้ไข')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${wo.Status==='COMPLETED'?'badge-green':wo.Status==='IN_PROGRESS'?'badge-orange':wo.Status==='OPEN'?'badge-blue':'badge-gray'}`}>
                      {wo.Status==='COMPLETED'?'เสร็จสิ้น':wo.Status==='IN_PROGRESS'?'กำลังทำ':(statusLabel(wo.Status) || wo.Status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!stats.recentWO?.length && (
                <tr><td colSpan={5} className="text-center py-10" style={{color:'var(--text-400)'}}>{t('no_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
