import { format } from 'date-fns'
import { getJobDailyLogs, getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { syncPMWorkOrderToMonthlySchedule } from '../../components/pm/PMMonthlyScheduleView'
import { buildCancelJobPayload } from './WorkOrders.jsx'

// Stateful daily-log handlers moved verbatim out of the WorkOrders
// component. Every free variable of the original closure is an explicit
// deps field; bodies run at call time exactly as before.

// Shared fresh-job lookup, identical in all three handlers below
// (deduplicated with output-identical behavior — same expression).
export function resolveDailyLogJob(allJobs, dailyLogJob) {
  return (
    allJobs.find(
      (j) =>
        (j.id && j.id === dailyLogJob.id) ||
        (j.WO_ID && j.WO_ID === (dailyLogJob.WO_ID || dailyLogJob.Job_ID)) ||
        (j.Job_ID && j.Job_ID === (dailyLogJob.Job_ID || dailyLogJob.WO_ID))
    ) || dailyLogJob
  )
}

// Was `const handleSaveDailyLog = async () => {...}`.
export async function saveDailyLog({
  dailyLogJob, dailyLogDetails, dailyLogDate, dailyLogStatus, dailyLogHours, dailyLogTechs,
  allJobs, saveJob, setDailyLogSubmitting, setDailyLogModalOpen, setDailyLogJob,
  toast, user, cylinders,
}) {
  if (!dailyLogJob) return
  const details = dailyLogDetails.trim()
  if (!details) {
    toast.warning('กรุณาระบุรายละเอียดงานประจำวัน / สิ่งที่ทำได้ในวันนี้')
    return
  }
  setDailyLogSubmitting(true)
  try {
    const currentJob = resolveDailyLogJob(allJobs, dailyLogJob)

    const existingLogs = getJobDailyLogs(currentJob)
    const newEntry = {
      id: `DLOG-${Date.now()}`,
      date: dailyLogDate || format(new Date(), 'yyyy-MM-dd'),
      timestamp: new Date().toISOString(),
      status: dailyLogStatus,
      details,
      hours: dailyLogHours ? parseFloat(dailyLogHours) : null,
      techs: dailyLogTechs,
      recorded_by: user?.username || user?.full_name || 'ช่างประจำกะ',
    }
    const updatedLogs = [...existingLogs, newEntry]
    const nextMeta = getWorkOrderStatusMeta(dailyLogStatus)
    const logsJson = JSON.stringify(updatedLogs)
    const techStr = Array.isArray(dailyLogTechs) && dailyLogTechs.length > 0 ? dailyLogTechs.join(', ') : (currentJob.Technicians || currentJob.Tech || '')

    const payload = {
      ...currentJob,
      DailyLogs: logsJson,
      daily_logs: logsJson,
      Status: nextMeta.value,
      Tech: techStr,
      Technicians: techStr,
      UpdatedBy: user?.username || user?.full_name || 'ผู้บันทึกรายวัน',
      updated_at: new Date().toISOString(),
    }

    await saveJob(payload)
    toast.success(
      'บันทึกความคืบหน้ารายวันสำเร็จ',
      `${currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID} • สถานะ: ${nextMeta.label}`
    )

    // Auto-sync daily log PM work order to Monthly PM Schedule
    if (String(payload.JobType || currentJob?.JobType || '').toUpperCase() === 'PM') {
      syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
        console.warn('[WorkOrders] Failed to sync daily log to monthly schedule:', e)
      })
    }
    setDailyLogModalOpen(false)
    setDailyLogJob(null)
  } catch (err) {
    toast.error('บันทึกความคืบหน้าไม่สำเร็จ', err.message)
  } finally {
    setDailyLogSubmitting(false)
  }
}

// Was `const handleConfirmCancelJob = async () => {...}`.
export async function confirmCancelJob({
  dailyLogJob, cancelJobReason, allJobs, user,
  saveJob, setCancellingJobSubmitting, setCancelJobModalOpen, setDailyLogModalOpen, setDailyLogJob,
  toast,
}) {
  if (!dailyLogJob) return
  const reason = cancelJobReason.trim()
  if (!reason) {
    toast.warning('กรุณาระบุเหตุผล', 'กรุณาระบุเหตุผลในการยกเลิกใบสั่งงาน')
    return
  }

  setCancellingJobSubmitting(true)
  try {
    const currentJob = resolveDailyLogJob(allJobs, dailyLogJob)

    const userName = user?.full_name || user?.line_display_name || user?.username || user?.Name || 'ช่างผู้ใช้งาน'
    const payload = buildCancelJobPayload({
      job: currentJob,
      cancelDate: format(new Date(), 'yyyy-MM-dd'),
      reason,
      technician: userName,
    })

    await saveJob(payload)

    toast.success(
      'ยกเลิกใบสั่งงานสำเร็จ',
      `${currentJob.Job_ID || currentJob['Job ID'] || currentJob.WO_ID} • สถานะ: ยกเลิก`
    )

    setCancelJobModalOpen(false)
    setDailyLogModalOpen(false)
    setDailyLogJob(null)
  } catch (err) {
    toast.error('ยกเลิกใบสั่งงานไม่สำเร็จ', err.message)
  } finally {
    setCancellingJobSubmitting(false)
  }
}

// Was `const handleDeleteDailyLog = async (logId) => {...}`.
export async function deleteDailyLog({
  dailyLogJob, canDelete, allJobs, logId,
  saveJob, setDailyLogJob, toast, user,
}) {
  if (!dailyLogJob || !canDelete) return
  const currentJob = resolveDailyLogJob(allJobs, dailyLogJob)
  const existingLogs = getJobDailyLogs(currentJob)
  const updatedLogs = existingLogs.filter((l) => l.id !== logId)
  const logsJson = JSON.stringify(updatedLogs)
  const payload = {
    ...currentJob,
    DailyLogs: logsJson,
    daily_logs: logsJson,
    UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
    updated_at: new Date().toISOString(),
  }
  try {
    await saveJob(payload)
    setDailyLogJob(payload)
    toast.success('ลบรายการบันทึกรายวันเรียบร้อย')
  } catch (err) {
    toast.error('ลบรายการไม่สำเร็จ', err.message)
  }
}
