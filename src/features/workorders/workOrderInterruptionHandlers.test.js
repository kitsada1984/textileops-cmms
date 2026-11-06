import { describe, it, expect, vi } from 'vitest'
import {
  startInterruption,
  stopInterruption,
  addManualInterruption,
  deleteInterruption,
} from './workOrderInterruptionHandlers'

// Behavior locks: the moved handlers must act exactly as the in-component
// versions did — same guards, same payloads, same setter/toast sequences.
const job = { id: 'job-1', Job_ID: 'JOB-001', Interruption_Logs: [] }

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

  it('start: records selectedTechs and noTechRemaining flag properly', async () => {
    const d = deps({ interruptionTaskName: 'ไปช่วยเครื่อง 102', setInterruptionTaskName: vi.fn() })

    await startInterruption({
      ...d,
      taskName: 'ไปช่วยเครื่อง 102',
      selectedTechs: ['ช่างสมชาย', 'ช่างวิชัย'],
      noTechRemaining: true,
    })

    expect(d.saveJob).toHaveBeenCalled()
    const saved = d.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs[0].technicians).toEqual(['ช่างสมชาย', 'ช่างวิชัย'])
    expect(saved.Interruption_Logs[0].no_tech_remaining).toBe(true)
  })

  it('start: reports save failures without touching state', async () => {
    const d = deps({ interruptionTaskName: 'x', setInterruptionTaskName: vi.fn() })
    d.saveJob.mockRejectedValueOnce(new Error('boom'))

    await startInterruption({ ...d, taskName: undefined })
    expect(d.toast.error).toHaveBeenCalled()
    expect(d.setInterruptionJob).not.toHaveBeenCalled()
  })

  it('stop: closes the active log and records resumed_at and duration', async () => {
    const active = {
      id: 'INT-1',
      task_name: 't',
      technicians: ['ช่างสมชาย'],
      start_time: new Date(Date.now() - 60000).toISOString(),
      is_active: true,
    }
    const d = deps({ interruptionJob: { ...job, Interruption_Logs: [active] } })

    await stopInterruption({ ...d, logId: 'INT-1' })
    const saved = d.saveJob.mock.calls[0][0]
    expect(saved.Interruption_Logs[0].is_active).toBe(false)
    expect(saved.Interruption_Logs[0].end_time).toBeTruthy()
    expect(saved.Interruption_Logs[0].resumed_at).toBeTruthy()
    expect(saved.Interruption_Logs[0].duration_minutes).toBeGreaterThanOrEqual(1)
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

  it('delete: removes the log and saves', async () => {
    const d = deps({ interruptionJob: { ...job, Interruption_Logs: [{ id: 'INT-9' }] } })

    await deleteInterruption({ ...d, logId: 'INT-9' })
    expect(d.saveJob.mock.calls[0][0].Interruption_Logs).toEqual([])
    expect(d.toast.success).toHaveBeenCalled()
  })
})
