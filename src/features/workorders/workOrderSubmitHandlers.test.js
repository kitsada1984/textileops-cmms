import { describe, it, expect, vi } from 'vitest'
import { startJob, completeJob, quickStatusChange } from './workOrderSubmitHandlers'

// Behavior locks: the moved handlers must act exactly as the in-component
// versions did — same guards, same payloads, same setter/toast sequences.
function toast() {
  return { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }
}

function startDeps(over = {}) {
  const setters = {
    setSubmittingStart: vi.fn(), setMc: vi.fn(), setKi: vi.fn(), setDesign: vi.fn(),
    setRollNo: vi.fn(), setJobType: vi.fn(), setProblemCause: vi.fn(), setSelectedTechs: vi.fn(),
    setComment: vi.fn(), setStatus: vi.fn(), setCreateModalOpen: vi.fn(),
  }
  return {
    e: { preventDefault: vi.fn() }, submittingStart: false,
    mc: 'GK1-01', ki: 'KI-1', selectedTechs: ['ช่างA'], status: 'IN_PROGRESS',
    comment: '', design: '', rollNo: '', jobType: 'REPAIR', problemCause: '',
    allJobs: [], user: { username: 'admin' }, saveJob: vi.fn().mockResolvedValue({}),
    technicians: [], systemUsers: [], cylinders: [], toast: toast(), ...setters, ...over,
  }
}

describe('workOrderSubmitHandlers behavior', () => {
  it('start: validates MC/KI/techs before saving', async () => {
    const d = startDeps({ mc: '  ' })
    await startJob(d)
    expect(d.toast.error).toHaveBeenCalled()
    expect(d.saveJob).not.toHaveBeenCalled()
    expect(d.e.preventDefault).toHaveBeenCalled()

    const busy = startDeps({ submittingStart: true })
    await startJob(busy)
    expect(busy.saveJob).not.toHaveBeenCalled()
  })

  it('start: saves the payload and resets the form', async () => {
    const d = startDeps()
    await startJob(d)

    const payload = d.saveJob.mock.calls[0][0]
    expect(payload.MC).toBe('GK1-01')
    expect(payload.Technicians).toBe('ช่างA')
    expect(payload.Status).toBe('IN_PROGRESS')
    expect(payload.Comment).toBe('เปิดใบสั่งงาน')
    expect(d.setJobType).toHaveBeenCalledWith('REPAIR')
    expect(d.setCreateModalOpen).toHaveBeenCalledWith(false)
    expect(d.setSubmittingStart).toHaveBeenLastCalledWith(false)
    expect(d.toast.success).toHaveBeenCalled()
  })

  it('complete: guards, saves with duration fields, closes the modal', async () => {
    const t = toast()
    const base = {
      compSubmitting: false, compEndDate: '2026-11-06', compEndTime: '16:00',
      compCalcDuration: { netHoursDecimal: 8, netDurationText: '8 ชม.' },
      saveJob: vi.fn().mockResolvedValue({}), setCompSubmitting: vi.fn(),
      setCompleteModalOpen: vi.fn(), setCompJob: vi.fn(), toast: t,
      user: { username: 'admin' }, cylinders: [],
    }
    await completeJob({ ...base, compSubmitting: true, compJob: { Job_ID: 'J' } })
    expect(base.saveJob).not.toHaveBeenCalled()

    await completeJob({ ...base, compJob: { Job_ID: 'JOB-001', JobType: 'REPAIR' } })
    const payload = base.saveJob.mock.calls[0][0]
    expect(payload.Status).toBe('COMPLETED')
    expect(payload.WorkingHoursDecimal).toBe(8)
    expect(base.setCompleteModalOpen).toHaveBeenCalledWith(false)
    expect(base.setCompJob).toHaveBeenCalledWith(null)
    expect(t.success).toHaveBeenCalled()
  })

  it('quickStatusChange: no-ops on same status, routes completion to the modal', async () => {
    const t = toast()
    const openCompleteModal = vi.fn()
    const saveJob = vi.fn().mockResolvedValue({})
    const job = { id: '1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', JobType: 'REPAIR' }

    await quickStatusChange({ job: null, nextStatusCode: 'COMPLETED', canEdit: true, openCompleteModal, saveJob, toast: t, user: {}, cylinders: [] })
    expect(saveJob).not.toHaveBeenCalled()

    await quickStatusChange({ job, nextStatusCode: 'IN_PROGRESS', canEdit: true, openCompleteModal, saveJob, toast: t, user: {}, cylinders: [] })
    expect(saveJob).not.toHaveBeenCalled()
    expect(openCompleteModal).not.toHaveBeenCalled()

    await quickStatusChange({ job, nextStatusCode: 'COMPLETED', canEdit: true, openCompleteModal, saveJob, toast: t, user: {}, cylinders: [] })
    expect(openCompleteModal).toHaveBeenCalledWith(job)
    expect(saveJob).not.toHaveBeenCalled()
  })
})
