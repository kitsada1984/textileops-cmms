// Mobile/tablet card moved verbatim from WorkOrders (no logic change).
import { getWorkOrderStatusMeta, getWorkOrderDetails, getJobDailyLogs, getLatestDailyLog } from './workOrderNormalize.js'
import { calculateSlaPerformance } from '../../api/entities'
import { getProblemCauseMeta } from '../../constants/problemCause'
import { WorkOrderCardDetails } from './workOrderCardDetails.jsx'
import { WorkOrderCardActions } from './workOrderCardActions.jsx'
import { WorkOrderCardMeta } from './workOrderCardMeta.jsx'

export function WorkOrderCard({
  job,
  kpiTargets,
  canEdit,
  canDelete,
  onInterruption,
  onComplete,
  onPrint,
  onEdit,
  onDelete,
  onDailyLog,
}) {
  const statusMeta = getWorkOrderStatusMeta(job.Status)
  const isCompleted = statusMeta.isCompleted
  const sla = calculateSlaPerformance(job, kpiTargets)
  const jobIdDisplay = job.Job_ID || job['Job ID'] || `JOB-${job.id?.slice(0, 8)}`
  const detailsDisplay = getWorkOrderDetails(job)
  const dailyLogs = getJobDailyLogs(job)
  const latestDailyLog = getLatestDailyLog(job)

  return (
    <div
      className={`card p-3.5 border transition-all active:scale-[0.99] cursor-pointer shadow-xs hover:shadow-md ${
        isCompleted
          ? 'border-emerald-500/30 bg-white dark:bg-slate-900/90'
          : sla.activeInterruption
          ? 'border-amber-500/50 bg-amber-50/20 dark:bg-slate-900/90'
          : 'border-blue-500/30 bg-white dark:bg-slate-900/90'
      }`}
    >
      {/* Header: Job ID + Type Badge + Status Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 tracking-tight truncate">
            {jobIdDisplay}
          </span>
          <span
            className={`badge text-[10px] ${
              job.JobType === 'DESIGN'
                ? 'badge-purple'
                : job.JobType === 'PM'
                ? 'badge-yellow'
                : job.JobType === 'SETUP'
                ? 'badge-indigo'
                : 'badge-blue'
            }`}
          >
            {job.JobType === 'DESIGN' ? '🎨 ปรับแบบ' : job.JobType === 'PM' ? '🧹 PM' : job.JobType === 'SETUP' ? '⚙️ เตรียมเครื่อง' : '🛠️ แก้ไข'}
          </span>
          {(job.ProblemCause || job.problem_cause) && (() => {
            const causeMeta = getProblemCauseMeta(job.ProblemCause || job.problem_cause)
            return (
              <span className={`badge text-[10px] font-bold ${causeMeta.badgeClass}`} title={`สาเหตุปัญหา: ${causeMeta.label}`}>
                {causeMeta.icon} {causeMeta.label}
              </span>
            )
          })()}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`badge text-[10px] ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Machine & Production Info */}
      <div className="flex items-center justify-between gap-2 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
            {job.MC || '—'}
          </span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            KI: {job.KI || '—'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {job.RollNo ? `ม้วน #${job.RollNo}` : ''}
        </div>
      </div>

      {/* Design and Details */}
      <WorkOrderCardDetails job={job} detailsDisplay={detailsDisplay} latestDailyLog={latestDailyLog} dailyLogs={dailyLogs} onDailyLog={onDailyLog} />

      {/* Technicians, Time & SLA */}
      <WorkOrderCardMeta job={job} sla={sla} isCompleted={isCompleted} />

      <WorkOrderCardActions job={job} sla={sla} isCompleted={isCompleted} dailyLogs={dailyLogs} canEdit={canEdit} canDelete={canDelete} onInterruption={onInterruption} onComplete={onComplete} onPrint={onPrint} onEdit={onEdit} onDelete={onDelete} onDailyLog={onDailyLog} />

    </div>
  )

}
