import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CheckCircle2, Wrench } from 'lucide-react'
import { RepairStatusBadge, formatDateTime } from './dashboardHelpers.jsx'

export function DashboardRepairs({ stats, t, setSelectedRepair, baseUrl }) {
  return (
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
  )
}
