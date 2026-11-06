import { format } from 'date-fns'
import { getWorkOrderStatusMeta } from './workOrderNormalize.js'
import { generateJobId } from '../../api/entities'
import { syncPMWorkOrderToMonthlySchedule } from '../../components/pm/PMMonthlyScheduleView'
import { notifyLineWorkOrderAssigned } from '../../utils/line'

// Stateful submit handlers moved verbatim out of the WorkOrders component.
// Every free variable of the original closure is an explicit deps field;
// bodies run at call time exactly as before.

// Was `const handleStartJob = async (e) => {...}`.
export async function startJob({
  e, submittingStart, mc, ki, selectedTechs, status, comment, design, rollNo, jobType, problemCause,
  allJobs, user, saveJob, setSubmittingStart, technicians, systemUsers, cylinders,
  setMc, setKi, setDesign, setRollNo, setJobType, setProblemCause, setSelectedTechs,
  setComment, setStatus, setCreateModalOpen, toast,
}) {
  e?.preventDefault()
  if (submittingStart) return
  if (!mc.trim()) { toast.error('กรุณาระบุรหัสเครื่อง (M/C)'); return }
  if (!ki.trim()) { toast.error('กรุณาระบุรหัสงาน (KI)'); return }
  if (selectedTechs.length === 0) { toast.error('กรุณาเลือกช่างผู้ปฏิบัติงานอย่างน้อย 1 คน'); return }

  setSubmittingStart(true)
  try {
    const now = new Date()
    const startDate = format(now, 'yyyy-MM-dd')
    const startTime = format(now, 'HH:mm:ss')
    const startTimestamp = now.toISOString()
    const jobId = generateJobId(allJobs)

    const isComp = status === 'COMPLETED'
    const detailText = comment.trim() || 'เปิดใบสั่งงาน'

    const payload = {
      // Modern CMMS columns
      Job_ID: jobId,
      StartDate: startDate,
      StartTime: startTimestamp,
      StartTimestamp: startTimestamp,
      MC: mc.trim(),
      KI: ki.trim(),
      Design: design.trim(),
      RollNo: rollNo.trim(),
      roll_no: rollNo.trim(),
      JobType: jobType,
      ProblemCause: problemCause || '',
      Technicians: selectedTechs.join(', '),
      Comment: detailText,
      Details: detailText,
      details: detailText,
      Status: status,
      IsDeleted: false,
      CreatedBy: user?.username || user?.full_name || 'ช่างประจำกะ',

      // If created directly as completed
      ...(isComp ? {
        EndDate: startDate,
        EndTime: startTimestamp,
        EndTimestamp: startTimestamp,
        DateEnd: startTimestamp,
        WorkingDurationText: '0 ชม.',
        WorkingHoursDecimal: 0,
        CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
      } : {}),

      // Legacy compatibility columns
      WO_ID: jobId,
      DateStart: startTimestamp,
      Tech: selectedTechs.join(', '),
      Problem: detailText,
      Detail: detailText,
      Priority: 'MEDIUM',
    }

    await saveJob(payload)
    toast.success('เปิดใบสั่งงานสำเร็จ', `${jobId} (${mc} - ${ki})`)

    // Auto-sync PM work orders to Monthly PM Schedule (non-blocking async)
    if (String(payload.JobType || '').toUpperCase() === 'PM') {
      syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
        console.warn('[WorkOrders] Failed to sync new PM work order to monthly schedule:', e)
      })
    }

    // Notify assigned technicians via LINE (Non-blocking async background)
    try {
      notifyLineWorkOrderAssigned(payload, selectedTechs, { technicians, systemUsers })
        .then((res) => {
          if (res?.ok && res.sentCount > 0) {
            toast.success('แจ้งเตือน LINE สำเร็จ 📲', `ส่งไปยัง ${res.recipientsText}`)
            if (res.techsWithoutLine?.length > 0) {
              toast.info('ช่างบางท่านยังไม่ได้ผูก LINE ID', res.techsWithoutLine.join(', '))
            }
          } else if (res?.reason === 'no_line_id') {
            toast.info('บันทึกใบสั่งงานแล้ว', `ช่างที่เลือก (${res.techsWithoutLine?.join(', ') || ''}) ยังไม่ได้ผูก LINE ID`)
          } else if (res && !res.ok && !res.skipped) {
            toast.error('ส่งแจ้งเตือน LINE ไม่สำเร็จ', res.errors?.[0] || res.error || 'กรุณาตรวจสอบการตั้งค่า LINE OA')
          }
        })
        .catch((err) => {
          console.warn('[WorkOrders] LINE notification background error:', err)
        })
    } catch (e) {
      console.warn('[WorkOrders] LINE notification trigger error:', e)
    }

    // Reset form
    setMc('')
    setKi('')
    setDesign('')
    setRollNo('')
    setJobType('REPAIR')
    setProblemCause('')
    setSelectedTechs([])
    setComment('')
    setStatus('IN_PROGRESS')
    setCreateModalOpen(false)
  } catch (err) {
    toast.error('ไม่สามารถเปิดใบสั่งงานได้', err.message)
  } finally {
    setSubmittingStart(false)
  }
}

// Was `const handleCompleteJob = async () => {...}`.
export async function completeJob({
  compSubmitting, compJob, compEndDate, compEndTime, compCalcDuration,
  saveJob, setCompSubmitting, setCompleteModalOpen, setCompJob, toast, user, cylinders,
}) {
  if (compSubmitting) return
  if (!compJob || !compEndDate || !compEndTime) return
  setCompSubmitting(true)
  try {
    const endTimestamp = new Date(`${compEndDate}T${compEndTime}:00`).toISOString()
    const durationResult = compCalcDuration

    const payload = {
      ...compJob,
      EndDate: compEndDate,
      EndTime: endTimestamp,
      EndTimestamp: endTimestamp,
      DateEnd: endTimestamp,
      Duration: durationResult.netHoursDecimal,
      WorkingHoursDecimal: durationResult.netHoursDecimal,
      WorkingDurationText: durationResult.netDurationText,
      GrossDurationHours: durationResult.grossHoursDecimal,
      GrossDurationText: durationResult.grossDurationText,
      OffShiftDurationHours: durationResult.offShiftHoursDecimal,
      OffShiftDurationText: durationResult.offShiftDurationText,
      SundayDurationHours: durationResult.sundayHoursDecimal,
      SundayDurationText: durationResult.sundayDurationText,
      LostDurationHours: durationResult.lostHoursDecimal,
      LostDurationText: durationResult.lostDurationText,
      Status: 'COMPLETED',
      CompletedBy: user?.username || user?.full_name || 'ช่างประจำกะ',
    }

    await saveJob(payload)
    toast.success('บันทึกจบงานสำเร็จ', `${compJob.Job_ID || compJob['Job ID']} (${durationResult.netDurationText})`)

    // Auto-sync PM work order completion to Monthly PM Schedule (non-blocking async)
    if (String(payload.JobType || compJob?.JobType || '').toUpperCase() === 'PM') {
      syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
        console.warn('[WorkOrders] Failed to sync completed PM work order to monthly schedule:', e)
      })
    }
    setCompleteModalOpen(false)
    setCompJob(null)
  } catch (err) {
    toast.error('ไม่สามารถบันทึกจบงานได้', err.message)
  } finally {
    setCompSubmitting(false)
  }
}

// Was `const handleQuickStatusChange = async (job, nextStatusCode) => {...}`.
export async function quickStatusChange({
  job, nextStatusCode, canEdit, openCompleteModal,
  saveJob, toast, user, cylinders,
}) {
  if (!job || !canEdit) return
  const nextMeta = getWorkOrderStatusMeta(nextStatusCode)
  const currentMeta = getWorkOrderStatusMeta(job.Status)
  if (nextMeta.value === currentMeta.value) return

  if (nextMeta.isCompleted && !currentMeta.isCompleted) {
    openCompleteModal(job)
    return
  }

  try {
    const payload = {
      ...job,
      Status: nextMeta.value,
      UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
    }
    await saveJob(payload)
    toast.success(`อัปเดตสถานะเป็น "${nextMeta.label}" สำเร็จ`, job.Job_ID || job['Job ID'])

    // Auto-sync status change to Monthly PM Schedule
    if (String(payload.JobType || job?.JobType || '').toUpperCase() === 'PM') {
      syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
        console.warn('[WorkOrders] Failed to sync status change to monthly schedule:', e)
      })
    }
  } catch (err) {
    toast.error('ไม่สามารถอัปเดตสถานะใบสั่งงานได้', err.message)
  }
}
