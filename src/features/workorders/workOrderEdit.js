import { format } from 'date-fns'
import { syncPMWorkOrderToMonthlySchedule } from '../../components/pm/PMMonthlyScheduleView'

// Edit-job shaping moved out of the submit handler (grill-approved,
// behavior-preserving restructure: same fields, same fallbacks, same order).

export function buildEditJobPayload(editJob, editTechs, user) {
  const isComp = editJob.Status === 'COMPLETED' || editJob.Status === 'เสร็จสิ้น'
  const detailVal = editJob.Comment || editJob.Details || ''
  return {
    ...editJob,
    Comment: detailVal,
    Details: detailVal,
    details: detailVal,
    Problem: detailVal,
    Detail: detailVal,
    Status: editJob.Status || 'IN_PROGRESS',
    Technicians: editTechs.join(', '),
    Tech: editTechs.join(', '),
    UpdatedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
    ...(isComp && !editJob.EndDate ? {
      EndDate: format(new Date(), 'yyyy-MM-dd'),
      EndTime: new Date().toISOString(),
      EndTimestamp: new Date().toISOString(),
      DateEnd: new Date().toISOString(),
      CompletedBy: user?.username || user?.full_name || 'ผู้แก้ไข',
    } : {}),
  }
}

export function resolveNewlyAddedTechs(editJob, editTechs) {
  const prevTechs = (editJob.Technicians || editJob.Tech || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return editTechs.filter((t) => !prevTechs.includes(t))
}

export function notifyAddedTechs({ payload, newlyAddedTechs, technicians, systemUsers, notifyFn, toast }) {  // Notify newly assigned technicians via LINE (Non-blocking async background)
  if (newlyAddedTechs.length > 0) {
    try {
      notifyFn(payload, newlyAddedTechs, { technicians, systemUsers })
        .then((res) => {
          if (res?.ok && res.sentCount > 0) {
            toast.success('แจ้งเตือน LINE สำเร็จ 📲', `ส่งไปยัง ${res.recipientsText}`)
            if (res.techsWithoutLine?.length > 0) {
              toast.info('ช่างบางท่านยังไม่ได้ผูก LINE ID', res.techsWithoutLine.join(', '))
            }
          } else if (res?.reason === 'no_line_id') {
            toast.info('บันทึกใบสั่งงานแล้ว', `ช่างที่เพิ่ม (${res.techsWithoutLine?.join(', ') || ''}) ยังไม่ได้ผูก LINE ID`)
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
  }
}

export async function confirmAndRemoveJob({ job, confirmFn, removeJob, syncRemoveFn, cylinders, toast }) {
  const id = job.id || job._id
  if (!id) return toast.error('ลบใบสั่งงานไม่สำเร็จ', 'ไม่พบ ID ของรายการ')
  if (!confirmFn(`ยืนยันการลบใบสั่งงาน ${job.Job_ID || job['Job ID'] || id} หรือไม่?`)) return
  try {
    await removeJob(id)

    // Sync deletion with PM Monthly Schedule if it is a PM work order
    const jobType = String(job.JobType || job.Job_Type || job.job_type || job.jobType || '').toUpperCase()
    if (jobType === 'PM') {
      syncRemoveFn(job, cylinders).catch((e) => {
        console.warn('[handleDeleteJob] PM monthly schedule remove sync failed:', e)
      })
    }

    toast.success('ลบใบสั่งงานสำเร็จ', job.Job_ID || job['Job ID'] || id)
  } catch (err) {
    toast.error('ลบใบสั่งงานไม่สำเร็จ', err.message)
  }
}

// Was `const handleEditJob = async () => {...}` in the WorkOrders component.
// Stateful submit moved verbatim; every closure variable is a deps field.
export async function saveEditJob({
  editJob, editTechs, user, saveJob, setEditSubmitting, setEditModalOpen, setEditJob,
  technicians, systemUsers, notifyFn, cylinders, toast,
}) {
  if (!editJob) return
  setEditSubmitting(true)
  try {
    const payload = buildEditJobPayload(editJob, editTechs, user)
    const newlyAddedTechs = resolveNewlyAddedTechs(editJob, editTechs)

    await saveJob(payload)
    toast.success('แก้ไขข้อมูลใบสั่งงานสำเร็จ', editJob.Job_ID || editJob['Job ID'])

    // Auto-sync edited PM work order to Monthly PM Schedule
    if (String(payload.JobType || editJob?.JobType || '').toUpperCase() === 'PM') {
      syncPMWorkOrderToMonthlySchedule(payload, cylinders).catch((e) => {
        console.warn('[WorkOrders] Failed to sync edited PM work order to monthly schedule:', e)
      })
    }

    notifyAddedTechs({ payload, newlyAddedTechs, technicians, systemUsers, notifyFn, toast })

    setEditModalOpen(false)
    setEditJob(null)
  } catch (err) {
    toast.error('ไม่สามารถแก้ไขใบสั่งงานได้', err.message)
  } finally {
    setEditSubmitting(false)
  }
}
