import { describe, it, expect, vi } from 'vitest'
import {
  startInterruption,
  stopInterruption,
  addManualInterruption,
  deleteInterruption,
  deductTechnicians,
  restoreTechnicians,
} from './workOrderInterruptionHandlers'

// Behavior locks: the moved handlers must act exactly as the in-component
// versions did — same guards, same payloads, same setter/toast sequences.
const job = { id: 'job-1', Job_ID: 'JOB-001', Technicians: 'ช่าง1, ช่าง2, ช่าง3', Interruption_Logs: [] }

function deps(over = {}) {
  return {
    interruptionJob: job,
    saveJob: vi.fn().mockResolvedValue({}),
    setInterruptionJob: vi.fn(),
    toast: { warning: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn() },
    user: { full_name: 'ช่างA' },
    ...over,
  }
}

describe('workOrderInterruptionHandlers behavior', () => {
  it('deductTechnicians removes pulled technicians', () => {
    expect(deductTechnicians(['ช่าง1', 'ช่าง2', 'ช่าง3'], ['ช่าง1'])).toEqual(['ช่าง2', 'ช่าง3'])
    expect(deductTechnicians(['ช่าง1'], ['ช่าง1'])).toEqual([])
  })

  it('restoreTechnicians merges returned technicians without duplicates', () => {
    expect(restoreTechnicians(['ช่าง2', 'ช่าง3'], ['ช่าง1'])).toEqual(['ช่าง2', 'ช่าง3', 'ช่าง1'])
    expect(restoreTechnicians(['ช่าง1'], ['ช่าง1'])).toEqual(['ช่าง1'])
  })

  it('start: no-ops without a job', async () => {
    const d = deps({ interruptionJob: null })

    await startInterruption({ ...d, taskName: 'x', interruptionTaskName: '', setInterruptionTaskName: vi.fn() })
    expect(d.saveJob).not.toHaveBeenCalled()
  })

  it('start: warns on empty name and saves on valid name', async () => {
    const d = deps({ interruptionTaskName: '  ', setInterruptionTaskName: vi.fn() })

    await startInterruption({ ...d, taskName: '' })
    expect(d.toast.warning).toHaveBeenCalled()
    expect(d.saveJob).not.toHaveBeenCalled()

    const ok = deps({ interruptionTaskName: 'ไปขึ้นด้าย', setInterruptionTaskName: vi.fn() })
    await startInterruption({ ...ok, taskName: undefined })
    expect(ok.saveJob).toHaveBeenCalled()
    const saved = ok.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs).toHaveLength(1)
    expect(saved.Interruption_Logs[0].task_name).toBe('ไปขึ้นด้าย')
    expect(saved.Interruption_Logs[0].is_active).toBe(true)
    expect(ok.setInterruptionJob).toHaveBeenCalledWith(saved)
    expect(ok.toast.info).toHaveBeenCalled()
  })

  it('start: removes pulled techs from Job 1 and adds to targetJob', async () => {
    const d = deps({ interruptionTaskName: 'ไปช่วยเครื่อง 102', setInterruptionTaskName: vi.fn() })
    const targetJob = { id: 'job-target', Job_ID: 'JOB-999', Technicians: 'ช่าง4' }

    await startInterruption({
      ...d,
      taskName: 'ไปช่วยเครื่อง 102',
      selectedTechs: ['ช่าง1'],
      targetJob,
    })

    expect(d.saveJob).toHaveBeenCalledTimes(2)
    const savedJob1 = d.saveJob.mock.calls[0][0]
    expect(savedJob1.Technicians).toBe('ช่าง2, ช่าง3')
    expect(savedJob1.Interruption_Logs[0].pulled_techs).toEqual(['ช่าง1'])

    const savedTarget = d.saveJob.mock.calls[1][0]
    expect(savedTarget.Technicians).toBe('ช่าง4, ช่าง1')
  })

  it('start: sets no_tech_remaining when all technicians are pulled', async () => {
    const d = deps({
      interruptionJob: { ...job, Technicians: 'ช่าง1' },
      interruptionTaskName: 'ไปช่วยเครื่อง 102',
      setInterruptionTaskName: vi.fn(),
    })

    await startInterruption({
      ...d,
      taskName: 'ไปช่วยเครื่อง 102',
      selectedTechs: ['ช่าง1'],
    })

    const savedJob1 = d.saveJob.mock.calls[0][0]
    expect(savedJob1.Technicians).toBe('')
    expect(savedJob1.Interruption_Logs[0].no_tech_remaining).toBe(true)
  })

  it('start: reports save failures without touching state', async () => {
    const d = deps({ interruptionTaskName: 'x', setInterruptionTaskName: vi.fn() })
    d.saveJob.mockRejectedValueOnce(new Error('boom'))

    await startInterruption({ ...d, taskName: undefined })
    expect(d.toast.error).toHaveBeenCalled()
    expect(d.setInterruptionJob).not.toHaveBeenCalled()
  })

  it('stop: restores pulled technicians to Job 1 by default', async () => {
    const active = {
      id: 'INT-1',
      task_name: 't',
      pulled_techs: ['ช่าง1'],
      technicians: ['ช่าง1'],
      start_time: new Date(Date.now() - 60000).toISOString(),
      is_active: true,
    }
    const d = deps({ interruptionJob: { ...job, Technicians: 'ช่าง2, ช่าง3', Interruption_Logs: [active] } })

    await stopInterruption({ ...d, logId: 'INT-1', returnTechsToJob: true })
    const saved = d.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs[0].is_active).toBe(false)
    expect(saved.Interruption_Logs[0].end_time).toBeTruthy()
    expect(saved.Interruption_Logs[0].resumed_at).toBeTruthy()
    expect(saved.Technicians).toBe('ช่าง2, ช่าง3, ช่าง1')
    expect(d.toast.success).toHaveBeenCalled()
  })

  it('stop: sends technicians to central pool when returnTechsToJob is false', async () => {
    const active = {
      id: 'INT-1',
      task_name: 't',
      pulled_techs: ['ช่าง1'],
      technicians: ['ช่าง1'],
      start_time: new Date(Date.now() - 60000).toISOString(),
      is_active: true,
    }
    const d = deps({ interruptionJob: { ...job, Technicians: 'ช่าง2, ช่าง3', Interruption_Logs: [active] } })

    await stopInterruption({ ...d, logId: 'INT-1', returnTechsToJob: false })
    const saved = d.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs[0].returned_to_pool).toBe(true)
    expect(saved.Technicians).toBe('ช่าง2, ช่าง3')
    expect(d.toast.success).toHaveBeenCalled()
  })

  it('addManual: validates name and minutes, records technicians on success', async () => {
    const bad = deps({
      interruptionTaskName: '', interruptionManualMins: '', interruptionManualNotes: '',
      setInterruptionTaskName: vi.fn(), setInterruptionManualMins: vi.fn(),
      setInterruptionManualNotes: vi.fn(), setShowManualAdd: vi.fn(),
    })
    await addManualInterruption(bad)
    expect(bad.toast.warning).toHaveBeenCalled()
    expect(bad.saveJob).not.toHaveBeenCalled()

    const ok = deps({
      interruptionTaskName: 'รอวัตถุดิบ', interruptionManualMins: '30', interruptionManualNotes: 'note',
      selectedTechs: ['ช่างสมชาย'], noTechRemaining: true,
      setInterruptionTaskName: vi.fn(), setInterruptionManualMins: vi.fn(),
      setInterruptionManualNotes: vi.fn(), setShowManualAdd: vi.fn(),
    })
    await addManualInterruption(ok)
    const saved = ok.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs[0].duration_minutes).toBe(30)
    expect(saved.Interruption_Logs[0].notes).toBe('note')
    expect(saved.Interruption_Logs[0].technicians).toEqual(['ช่างสมชาย'])
    expect(saved.Interruption_Logs[0].no_tech_remaining).toBe(true)
    expect(ok.setShowManualAdd).toHaveBeenCalledWith(false)
    expect(ok.toast.success).toHaveBeenCalled()
  })

  it('delete: removes the log and toasts return to central pool', async () => {
    const d = deps({
      interruptionJob: {
        ...job,
        Interruption_Logs: [{ id: 'INT-9', pulled_techs: ['ช่าง1'] }],
      },
    })

    await deleteInterruption({ ...d, logId: 'INT-9' })
    expect(d.saveJob.mock.calls[0][0].Interruption_Logs).toEqual([])
    expect(d.toast.success).toHaveBeenCalledWith(
      'ลบรายการงานแทรกแล้ว',
      expect.stringContaining('คืนช่าง ช่าง1 สู่ส่วนกลาง')
    )
  })
})
