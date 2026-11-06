import { describe, it, expect, vi } from 'vitest'
import { buildEditJobPayload, resolveNewlyAddedTechs, notifyAddedTechs, confirmAndRemoveJob, saveEditJob } from './workOrderEdit'

// Characterization: lock edit-job shaping before extracting it out of
// the submit handler (behavior-preserving restructure, grill-approved).
describe('workOrderEdit characterization', () => {
  const user = { username: 'admin', full_name: 'Admin' }

  it('syncs the detail text across all comment aliases', () => {
    const p = buildEditJobPayload(
      { Job_ID: 'J1', Status: 'IN_PROGRESS', Comment: 'ซ่อมมอเตอร์' },
      ['ช่างA'],
      user
    )

    expect(p.Comment).toBe('ซ่อมมอเตอร์')
    expect(p.Details).toBe('ซ่อมมอเตอร์')
    expect(p.details).toBe('ซ่อมมอเตอร์')
    expect(p.Problem).toBe('ซ่อมมอเตอร์')
    expect(p.Detail).toBe('ซ่อมมอเตอร์')
    expect(p.Status).toBe('IN_PROGRESS')
    expect(p.Technicians).toBe('ช่างA')
    expect(p.UpdatedBy).toBe('admin')
  })

  it('stamps completion dates when a completed job lacks EndDate', () => {
    const p = buildEditJobPayload({ Job_ID: 'J2', Status: 'COMPLETED', Details: 'เสร็จ' }, [], user)

    expect(p.EndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(p.CompletedBy).toBe('admin')
  })

  it('keeps an existing EndDate untouched', () => {
    const p = buildEditJobPayload(
      { Job_ID: 'J3', Status: 'COMPLETED', Details: 'x', EndDate: '2026-01-05' },
      [],
      user
    )

    expect(p.EndDate).toBe('2026-01-05')
    expect(p.CompletedBy).toBeUndefined()
  })

  it('diffs newly added technicians against previous assignment', () => {
    expect(
      resolveNewlyAddedTechs({ Technicians: 'ช่างA, ช่างB' }, ['ช่างB', 'ช่างC'])
    ).toEqual(['ช่างC'])
    expect(resolveNewlyAddedTechs({}, [])).toEqual([])
  })

  it('routes LINE notify outcomes to toasts without blocking', async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0))
    const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() }
    const base = { payload: {}, newlyAddedTechs: ['ช่างC'], technicians: [], systemUsers: [], toast }

    notifyAddedTechs({ ...base, notifyFn: async () => ({ ok: true, sentCount: 1, recipientsText: 'ช่างC' }) })
    await flush()
    expect(toast.success).toHaveBeenCalled()

    const toast2 = { success: vi.fn(), info: vi.fn(), error: vi.fn() }
    notifyAddedTechs({ ...base, toast: toast2, notifyFn: async () => ({ ok: false, reason: 'no_line_id', techsWithoutLine: ['ช่างC'] }) })
    await flush()
    expect(toast2.info).toHaveBeenCalled()

    // empty tech list never calls the notifier
    const notifyFn = vi.fn()
    notifyAddedTechs({ ...base, newlyAddedTechs: [], notifyFn, toast: toast2 })
    await flush()
    expect(notifyFn).not.toHaveBeenCalled()
  })

  it('confirmAndRemoveJob guards, confirms, syncs PM, and toasts', async () => {
    const toast = { success: vi.fn(), error: vi.fn() }

    // missing id → error, no confirm
    const confirmFn = vi.fn(() => true)
    const removeJob = vi.fn()
    await confirmAndRemoveJob({ job: {}, confirmFn, removeJob, syncRemoveFn: vi.fn(), cylinders: [], toast })
    expect(toast.error).toHaveBeenCalled()
    expect(confirmFn).not.toHaveBeenCalled()

    // confirm cancelled → no removal
    const confirmNo = vi.fn(() => false)
    await confirmAndRemoveJob({ job: { id: '1', Job_ID: 'J1' }, confirmFn: confirmNo, removeJob, syncRemoveFn: vi.fn(), cylinders: [], toast })
    expect(removeJob).not.toHaveBeenCalled()

    // PM job → removes, syncs monthly plan, toasts success with returned tech notice
    const syncRemoveFn = vi.fn(() => Promise.resolve())
    await confirmAndRemoveJob({
      job: { id: '1', Job_ID: 'J1', JobType: 'PM', Technicians: 'ช่าง1' },
      confirmFn, removeJob, syncRemoveFn, cylinders: [], toast,
    })
    expect(removeJob).toHaveBeenCalledWith('1')
    expect(syncRemoveFn).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith(
      'ลบใบสั่งงานสำเร็จ',
      expect.stringContaining('คืนช่าง ช่าง1 สู่ส่วนกลาง')
    )

    // removal failure → error toast
    const toast2 = { success: vi.fn(), error: vi.fn() }
    await confirmAndRemoveJob({
      job: { id: '2', Job_ID: 'J2' },
      confirmFn, removeJob: vi.fn(async () => { throw new Error('db down') }),
      syncRemoveFn: vi.fn(), cylinders: [], toast: toast2,
    })
    expect(toast2.error).toHaveBeenCalled()
  })

  it('saveEditJob: no-ops without a job, saves and closes on success', async () => {
    const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
    const saveJob = vi.fn().mockResolvedValue({})
    const base = {
      editTechs: ['ช่างA'], user, saveJob,
      setEditSubmitting: vi.fn(), setEditModalOpen: vi.fn(), setEditJob: vi.fn(),
      technicians: [], systemUsers: [], notifyFn: vi.fn().mockResolvedValue({}), cylinders: [], toast,
    }

    await saveEditJob({ ...base, editJob: null })
    expect(saveJob).not.toHaveBeenCalled()

    const editJob = { Job_ID: 'JOB-001', Status: 'IN_PROGRESS', Comment: 'ซ่อม', Technicians: '' }
    await saveEditJob({ ...base, editJob })
    expect(saveJob).toHaveBeenCalled()
    expect(base.setEditModalOpen).toHaveBeenCalledWith(false)
    expect(base.setEditJob).toHaveBeenCalledWith(null)
    expect(base.setEditSubmitting).toHaveBeenLastCalledWith(false)
    expect(toast.success).toHaveBeenCalled()
  })
})
