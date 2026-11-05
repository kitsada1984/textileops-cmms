import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react'

export function DashboardWorkOrders({ stats, t, setSelectedWO, getWorkOrderDetails, statusLabel }) {
  return (
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
  )
}
