import { useEffect, useState } from 'react'
import { MachineAPI, WorkOrderAPI, PMPlanAPI, SparePartAPI } from '../api/entities'
import { useT } from '../contexts/LanguageContext'

const STATUS_LABELS = {
  RUNNING: 'เดินเครื่อง',
  BREAKDOWN: 'เครื่องเสีย',
  MAINTENANCE: 'ซ่อมบำรุง',
  IDLE: 'ว่าง',
  DECOMMISSIONED: 'เลิกใช้งาน',
  OPEN: 'เปิด',
  IN_PROGRESS: 'กำลังดำเนินการ',
  COMPLETED: 'เสร็จแล้ว',
  CANCELLED: 'ยกเลิก',
  SCHEDULED: 'ตามแผน',
  OVERDUE: 'เกินกำหนด',
  IN_STOCK: 'มีของ',
  LOW_STOCK: 'สต็อกต่ำ',
  OUT_OF_STOCK: 'หมดสต็อก',
}

const statusLabel = (value) => STATUS_LABELS[value] || value

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <div className="text-center py-8" style={{color:'var(--text-400)',fontSize:'14px'}}>—</div>
  let offset = 0
  const COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']
  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {data.map((d, i) => {
          const pct = d.value / total
          const angle = pct * 360
          const start = offset; offset += angle
          const r = 70, cx = 80, cy = 80
          const startRad = (start - 90) * Math.PI / 180
          const endRad   = (start + angle - 90) * Math.PI / 180
          const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad)
          const x2 = cx + r * Math.cos(endRad),   y2 = cy + r * Math.sin(endRad)
          const large = angle > 180 ? 1 : 0
          return (
            <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
              fill={COLORS[i % COLORS.length]} />
          )
        })}
      </svg>
      <div className="space-y-1 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background: COLORS[i % COLORS.length]}} />
            <span style={{color:'var(--text-600)'}}>{d.label}</span>
            <span className="font-semibold ml-auto pl-2" style={{color:'var(--text-900)'}}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Reports() {
  const { t } = useT()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.allSettled([MachineAPI.list(), WorkOrderAPI.list(), PMPlanAPI.list(), SparePartAPI.list()])
      .then(([m, w, p, s]) => {
        const machines   = m.status === 'fulfilled' ? (m.value?.data || m.value || []) : []
        const workorders = w.status === 'fulfilled' ? (w.value?.data || w.value || []) : []
        const pm         = p.status === 'fulfilled' ? (p.value?.data || p.value || []) : []
        const parts      = s.status === 'fulfilled' ? (s.value?.data || s.value || []) : []

        const mcStatus   = ['RUNNING','BREAKDOWN','MAINTENANCE','IDLE','DECOMMISSIONED'].map(s => ({label:statusLabel(s), value:machines.filter(m=>m.Status===s).length})).filter(d=>d.value>0)
        const woStatus   = ['OPEN','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => ({label:statusLabel(s), value:workorders.filter(w=>w.Status===s).length})).filter(d=>d.value>0)
        const pmStatus   = ['SCHEDULED','IN_PROGRESS','COMPLETED','OVERDUE'].map(s => ({label:statusLabel(s), value:pm.filter(p=>p.Status===s).length})).filter(d=>d.value>0)
        const partStatus = ['IN_STOCK','LOW_STOCK','OUT_OF_STOCK'].map(s => ({label:statusLabel(s), value:parts.filter(p=>p.Status===s).length})).filter(d=>d.value>0)

        setStats({ mcStatus, woStatus, pmStatus, partStatus, machines, workorders })
      })
  }, [])

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner-gemini" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span className="text-sm font-medium" style={{color:'var(--text-400)'}}>{t('loading')}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          [t('rpt_mc_status'),  stats.mcStatus],
          [t('rpt_wo_status'),  stats.woStatus],
          [t('rpt_pm_status'),  stats.pmStatus],
          [t('rpt_sp_status'),  stats.partStatus],
        ].map(([title, data]) => (
          <div key={title} className="card p-5">
            <h3 className="font-semibold mb-4 text-sm" style={{color:'var(--text-900)'}}>{title}</h3>
            <PieChart data={data} />
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-sm" style={{color:'var(--text-900)'}}>{t('rpt_summary')}</h3>
        </div>
        <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            [t('rpt_total_mc'),   stats.machines.length],
            [t('rpt_running'),    stats.machines.filter(m=>m.Status==='RUNNING').length],
            [t('rpt_total_wo'),   stats.workorders.length],
            [t('rpt_done_wo'),    stats.workorders.filter(w=>w.Status==='COMPLETED').length],
          ].map(([label, value]) => (
            <div key={label} className="text-center p-4 rounded-2xl"
              style={{background:'var(--bg-thead)',border:'1px solid var(--border-subtle)'}}>
              <div className="text-2xl font-bold" style={{color:'var(--text-900)'}}>{value}</div>
              <div className="text-xs mt-1" style={{color:'var(--text-500)'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
