import { describe, it, expect, vi } from 'vitest'
import { saveDailyLog, confirmCancelJob, deleteDailyLog, resolveDailyLogJob } from './workOrderDailyLogHandlers'

// Behavior locks: the moved handlers must act exactly as the in-component
// versions did — same guards, same payloads, same setter/toast sequences.
const job = { id: 'job-1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', Technicians: 'ช่างA' }

function deps(over = {}) {
  return {
    dailyLogJob: job,
    allJobs: [job],
    saveJob: vi.fn().mockResolvedValue({}),
    toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
    user: { username: 'admin' },
    ...over,
  }
}

describe('workOrderDailyLogHandlers behavior', () => {
  it('resolveDailyLogJob prefers the fresh list copy, falls back to the modal job', () => {
    const fresh = { ...job, Status: 'COMPLETED' }

    expect(resolveDailyLogJob([fresh], job)).toBe(fresh)
    expect(resolveDailyLogJob([], job)).toBe(job)
  })

  it('save: warns on empty details and saves with entry + status', async () => {
    const d = deps({
      dailyLogDetails: '  ', dailyLogDate: '', dailyLogStatus: 'IN_PROGRESS',
      dailyLogHours: '', dailyLogTechs: [], setDailyLogSubmitting: vi.fn(),
      setDailyLogModalOpen: vi.fn(), setDailyLogJob: vi.fn(), cylinders: [],
    })
    await saveDailyLog(d)
    expect(d.toast.warning).toHaveBeenCalled()
    expect(d.saveJob).not.toHaveBeenCalled()

    const ok = deps({
      dailyLogDetails: 'ตรวจเครื่อง', dailyLogDate: '2026-11-06', dailyLogStatus: 'IN_PROGRESS',
      dailyLogHours: '2', dailyLogTechs: ['ช่างA'], setDailyLogSubmitting: vi.fn(),
      setDailyLogModalOpen: vi.fn(), setDailyLogJob: vi.fn(), cylinders: [],
    })
    await saveDailyLog(ok)
    const payload = ok.saveJob.mock.calls[0][0]
    expect(JSON.parse(payload.DailyLogs)).toHaveLength(1)
    expect(JSON.parse(payload.DailyLogs)[0].hours).toBe(2)
    expect(payload.Status).toBeTruthy()
    expect(ok.setDailyLogModalOpen).toHaveBeenCalledWith(false)
    expect(ok.setDailyLogJob).toHaveBeenCalledWith(null)
    expect(ok.toast.success).toHaveBeenCalled()
  })

  it('save: reports failures and always resets submitting', async () => {
    const d = deps({
      dailyLogDetails: 'x', dailyLogDate: '', dailyLogStatus: 'IN_PROGRESS',
      dailyLogHours: '', dailyLogTechs: [], setDailyLogSubmitting: vi.fn(),
      setDailyLogModalOpen: vi.fn(), setDailyLogJob: vi.fn(), cylinders: [],
    })
    d.saveJob.mockRejectedValueOnce(new Error('boom'))

    await saveDailyLog(d)
    expect(d.toast.error).toHaveBeenCalled()
    expect(d.setDailyLogSubmitting).toHaveBeenLastCalledWith(false)
  })

  it('confirmCancel: warns on empty reason and cancels with payload', async () => {
    const d = deps({
      cancelJobReason: '  ', setCancellingJobSubmitting: vi.fn(),
      setCancelJobModalOpen: vi.fn(), setDailyLogModalOpen: vi.fn(), setDailyLogJob: vi.fn(),
    })
    await confirmCancelJob(d)
    expect(d.toast.warning).toHaveBeenCalled()
    expect(d.saveJob).not.toHaveBeenCalled()

    const ok = deps({
      cancelJobReason: 'งานซ้ำ', setCancellingJobSubmitting: vi.fn(),
      setCancelJobModalOpen: vi.fn(), setDailyLogModalOpen: vi.fn(), setDailyLogJob: vi.fn(),
    })
    await confirmCancelJob(ok)
    expect(ok.saveJob).toHaveBeenCalled()
    expect(ok.setCancelJobModalOpen).toHaveBeenCalledWith(false)
    expect(ok.setDailyLogModalOpen).toHaveBeenCalledWith(false)
    expect(ok.toast.success).toHaveBeenCalled()
  })

  it('delete: guards permission and removes the entry', async () => {
    const denied = deps({ canDelete: false, logId: 'DLOG-1', setDailyLogJob: vi.fn() })
    await deleteDailyLog(denied)
    expect(denied.saveJob).not.toHaveBeenCalled()

    const entry = { id: 'DLOG-1', details: 'x' }
    const logged = { ...job, DailyLogs: JSON.stringify([entry]) }
    const ok = deps({
      canDelete: true, logId: 'DLOG-1', setDailyLogJob: vi.fn(),
      dailyLogJob: logged, allJobs: [logged],
    })
    await deleteDailyLog(ok)
    expect(JSON.parse(ok.saveJob.mock.calls[0][0].DailyLogs)).toEqual([])
    expect(ok.setDailyLogJob).toHaveBeenCalled()
  })
})
