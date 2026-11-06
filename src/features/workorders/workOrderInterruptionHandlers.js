import { getJobInterruptions } from './workOrderInterruptions.js'

// Stateful interruption handlers moved verbatim out of the WorkOrders
// component to meet the complexity gate. Every free variable of the
// original closure is an explicit deps field; bodies are unchanged and
// run at call time exactly as before (same state snapshot semantics).

// Was `const handleStartInterruption = async (taskName) => {...}`.
export async function startInterruption({
  interruptionJob,
  taskName,
  interruptionTaskName,
  selectedTechs = [],
  noTechRemaining = false,
  saveJob,
  setInterruptionJob,
  setInterruptionTaskName,
  toast,
  user,
}) {
  if (!interruptionJob) return
  const name = (taskName || interruptionTaskName || '').trim()
  if (!name) return toast.warning('กรุณาระบุชื่องานแทรก', 'เช่น ไปขึ้นด้าย เครื่อง 12334')

  const currentLogs = getJobInterruptions(interruptionJob)
  const techList = Array.isArray(selectedTechs) ? selectedTechs : (selectedTechs ? [selectedTechs] : [])

  const newEntry = {
    id: `INT-${Date.now()}`,
    task_name: name,
    technicians: techList,
    pulled_techs: techList,
    no_tech_remaining: Boolean(noTechRemaining),
    start_time: new Date().toISOString(),
    end_time: null,
    is_active: true,
    created_by: user?.full_name || user?.username || 'ช่างประจำกะ',
  }

  const updatedLogs = [...currentLogs, newEntry]
  const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

  try {
    await saveJob(updatedJob)
    setInterruptionJob(updatedJob)
    setInterruptionTaskName('')
    const techNotice = techList.length > 0 ? ` [ดึงช่าง: ${techList.join(', ')}]` : ''
    const noTechNotice = noTechRemaining ? ' (ไม่มีช่างอยู่ - หยุดเวลาชั่วคราว)' : ''
    toast.info('เริ่มจับเวลางานแทรก', `${name}${techNotice}${noTechNotice}`)
  } catch (err) {
    toast.error('บันทึกงานแทรกไม่สำเร็จ', err.message)
  }
}

// Was `const handleStopInterruption = async (logId) => {...}`.
export async function stopInterruption({ interruptionJob, logId, saveJob, setInterruptionJob, toast }) {
  if (!interruptionJob) return
  const currentLogs = getJobInterruptions(interruptionJob)
  const now = new Date()
  const nowIso = now.toISOString()
  let stoppedEntry = null

  const updatedLogs = currentLogs.map((log) => {
    if (log.id === logId || (log.is_active && !log.end_time)) {
      const start = new Date(log.start_time || log.created_at)
      const diffMs = Math.max(0, now.getTime() - start.getTime())
      const duration_minutes = Math.floor(diffMs / (1000 * 60))
      const duration_hours = Math.round((duration_minutes / 60) * 100) / 100
      stoppedEntry = {
        ...log,
        end_time: nowIso,
        resumed_at: nowIso,
        duration_minutes,
        duration_hours,
        is_active: false,
      }
      return stoppedEntry
    }
    return log
  })

  const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }
  try {
    await saveJob(updatedJob)
    setInterruptionJob(updatedJob)
    const techNotice = stoppedEntry?.technicians?.length > 0 ? ` (ช่าง ${stoppedEntry.technicians.join(', ')})` : ''
    const minsText = stoppedEntry?.duration_minutes !== undefined ? ` รวม ${stoppedEntry.duration_minutes} นาที` : ''
    toast.success('ช่างกลับมาทำงานต่อเรียบร้อย', `กลับสู่เวลาทำงานหลัก${techNotice}${minsText}`)
  } catch (err) {
    toast.error('บันทึกจบงานแทรกไม่สำเร็จ', err.message)
  }
}

// Was `const handleAddManualInterruption = async () => {...}`.
export async function addManualInterruption({
  interruptionJob,
  interruptionTaskName,
  interruptionManualMins,
  interruptionManualNotes,
  selectedTechs = [],
  noTechRemaining = false,
  saveJob,
  setInterruptionJob,
  setInterruptionTaskName,
  setInterruptionManualMins,
  setInterruptionManualNotes,
  setShowManualAdd,
  toast,
  user,
}) {
  if (!interruptionJob) return
  const name = interruptionTaskName.trim()
  const mins = parseInt(interruptionManualMins, 10)
  if (!name) return toast.warning('กรุณาระบุชื่องานแทรก', 'เช่น ไปขึ้นด้าย เครื่อง 12334')
  if (!mins || mins <= 0) return toast.warning('กรุณาระบุจำนวนนาทีที่สูญเสียไป', 'เช่น 30 นาที')

  const currentLogs = getJobInterruptions(interruptionJob)
  const duration_hours = Math.round((mins / 60) * 100) / 100
  const now = new Date()
  const start = new Date(now.getTime() - mins * 60000)
  const techList = Array.isArray(selectedTechs) ? selectedTechs : (selectedTechs ? [selectedTechs] : [])

  const newEntry = {
    id: `INT-${Date.now()}`,
    task_name: name,
    technicians: techList,
    pulled_techs: techList,
    no_tech_remaining: Boolean(noTechRemaining),
    start_time: start.toISOString(),
    end_time: now.toISOString(),
    resumed_at: now.toISOString(),
    duration_minutes: mins,
    duration_hours,
    notes: interruptionManualNotes ? interruptionManualNotes.trim() : '',
    is_active: false,
    created_by: user?.full_name || user?.username || 'ช่างประจำกะ',
  }

  const updatedLogs = [...currentLogs, newEntry]
  const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

  try {
    await saveJob(updatedJob)
    setInterruptionJob(updatedJob)
    setInterruptionTaskName('')
    setInterruptionManualMins('')
    setInterruptionManualNotes('')
    setShowManualAdd(false)
    toast.success('เพิ่มบันทึกงานแทรกย้อนหลังสำเร็จ', `${name} (${mins} นาที)`)
  } catch (err) {
    toast.error('บันทึกงานแทรกไม่สำเร็จ', err.message)
  }
}

// Was `const handleDeleteInterruption = async (logId) => {...}`.
export async function deleteInterruption({ interruptionJob, logId, saveJob, setInterruptionJob, toast }) {
  if (!interruptionJob) return
  const currentLogs = getJobInterruptions(interruptionJob)
  const updatedLogs = currentLogs.filter((log) => log.id !== logId)
  const updatedJob = { ...interruptionJob, Interruption_Logs: updatedLogs }

  try {
    await saveJob(updatedJob)
    setInterruptionJob(updatedJob)
    toast.success('ลบรายการงานแทรกแล้ว')
  } catch (err) {
    toast.error('ลบไม่สำเร็จ', err.message)
  }
}
