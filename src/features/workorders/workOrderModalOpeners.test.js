import { describe, it, expect, vi } from 'vitest'
import { buildCompleteModalState, buildEditModalState, buildDailyLogModalState, fireOpenPrintModal, fireOpenInterruptionModal, resolvePagePerms } from './workOrderModalOpeners'

// Characterization: lock the opener state builders exactly as the
// in-component openers computed them (moved verbatim, params only).
describe('workOrderModalOpeners characterization', () => {
  it('buildCompleteModalState: stamps current-day end fields', () => {
    const job = { Job_ID: 'JOB-001' }
    const s = buildCompleteModalState(job)

    expect(s.compJob).toBe(job)
    expect(s.compEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(s.compEndTime).toMatch(/^\d{2}:\d{2}$/)
  })

  it('buildEditModalState: normalizes details, status, and techs', () => {
    const s = buildEditModalState({
      Job_ID: 'JOB-001', Status: 'IN_PROGRESS', Comment: '', Technicians: 'ช่างA, ช่างB ',
    })

    expect(s.editJob.Status).toBe('IN_PROGRESS')
    expect(s.editTechs).toEqual(['ช่างA', 'ช่างB'])
  })

  it('buildEditModalState: keeps an existing comment', () => {
    const s = buildEditModalState({ Status: 'IN_PROGRESS', Comment: 'ซ่อมมอเตอร์', Technicians: '' })

    expect(s.editJob.Comment).toBe('ซ่อมมอเตอร์')
  })

  it('buildDailyLogModalState: prefers the fresh list copy', () => {
    const fresh = { id: '1', Job_ID: 'JOB-001', Status: 'IN_PROGRESS', Technicians: 'ช่างA' }
    const s = buildDailyLogModalState([fresh], { id: '1', Job_ID: 'JOB-001', Status: 'OPEN' })

    expect(s.freshJob).toBe(fresh)
    expect(s.status).toBe('IN_PROGRESS')
    expect(s.techs).toEqual(['ช่างA'])
    expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('fireOpenPrintModal: sets job and opens', () => {
    const setPrintJob = vi.fn()
    const setPrintModalOpen = vi.fn()
    const job = { Job_ID: 'JOB-001' }

    fireOpenPrintModal(setPrintJob, setPrintModalOpen, job)
    expect(setPrintJob).toHaveBeenCalledWith(job)
    expect(setPrintModalOpen).toHaveBeenCalledWith(true)
  })

  it('fireOpenInterruptionModal: resets fields and opens', () => {
    const setters = {
      setInterruptionJob: vi.fn(), setInterruptionTaskName: vi.fn(), setInterruptionManualMins: vi.fn(),
      setInterruptionManualNotes: vi.fn(), setShowManualAdd: vi.fn(), setInterruptionModalOpen: vi.fn(),
    }
    const job = { Job_ID: 'JOB-001' }

    fireOpenInterruptionModal({ ...setters, job })
    expect(setters.setInterruptionJob).toHaveBeenCalledWith(job)
    expect(setters.setInterruptionTaskName).toHaveBeenCalledWith('')
    expect(setters.setShowManualAdd).toHaveBeenCalledWith(false)
    expect(setters.setInterruptionModalOpen).toHaveBeenCalledWith(true)
  })

  it('resolvePagePerms: defaults missing perms to true', () => {
    expect(resolvePagePerms({})).toEqual({ canAdd: true, canEdit: true, canDelete: true })
    expect(resolvePagePerms({ canAdd: false, canEdit: true, canDelete: false })).toEqual({
      canAdd: false, canEdit: true, canDelete: false,
    })
  })
})
