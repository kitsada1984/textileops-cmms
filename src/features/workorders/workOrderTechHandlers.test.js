import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./workOrderTechSync.js', () => ({
  syncTechToNotifications: vi.fn().mockResolvedValue(undefined),
}))

const { TechnicianAPI, KpiSettingsAPI, UserAPI, CylinderAPI } = await import('../../api/entities')

import {
  buildAddTechForm,
  buildEditTechForm,
  selectUserForTech,
  saveTech,
  deleteTech,
  loadTechData,
  drilldownByCause,
} from './workOrderTechHandlers'
import { syncTechToNotifications } from './workOrderTechSync.js'

// Behavior locks: the moved tech handlers must act exactly as the
// in-component versions did — same guards, payloads, setter sequences.
function toast() {
  return { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }
}

describe('workOrderTechHandlers behavior', () => {
  it('buildAddTechForm: next TECH id and prefill', () => {
    const a = buildAddTechForm([{ Technician_ID: 'TECH-007' }])
    expect(a.editingTechId).toBeNull()
    expect(a.form.Technician_ID).toBe('TECH-008')
    expect(a.selectedUserId).toBe('')

    const b = buildAddTechForm([], { id: 'u1', full_name: 'สมชาย', line_user_id: 'L1' })
    expect(b.selectedUserId).toBe('u1')
    expect(b.form.Name).toBe('สมชาย')
    expect(b.form.Line_ID).toBe('L1')
  })

  it('buildEditTechForm: maps fields and matches LINE user', () => {
    const tech = { id: 't1', Name: 'ช่างA', Line_ID: 'L1' }
    const r = buildEditTechForm(tech, [{ id: 'u9', line_user_id: 'L1', line_picture_url: 'pic' }])

    expect(r.techId).toBe('t1')
    expect(r.selectedUserId).toBe('u9')
    expect(r.form.SkillLevel).toBe('Senior')
    expect(r.form.Avatar_URL).toBe('pic')
  })

  it('selectUserForTech: sets id, fills form, guards missing', () => {
    const setSelectedUserId = vi.fn()
    const setTechForm = vi.fn()

    selectUserForTech({ userId: '', systemUsers: [], setSelectedUserId, setTechForm })
    expect(setSelectedUserId).toHaveBeenCalledWith('')
    expect(setTechForm).not.toHaveBeenCalled()

    selectUserForTech({ userId: 'u1', systemUsers: [{ id: 'u1', full_name: 'N' }], setSelectedUserId, setTechForm })
    expect(setTechForm).toHaveBeenCalled()
  })

  it('drilldownByCause: sets filter and jumps to records', () => {
    const setCauseFilter = vi.fn()
    const setCurrentTab = vi.fn()

    drilldownByCause({ causeKey: 'คน', setCauseFilter, setCurrentTab })
    expect(setCauseFilter).toHaveBeenCalledWith('คน')
    expect(setCurrentTab).toHaveBeenCalledWith('records')
  })

  it('saveTech: validates name, creates and updates', async () => {
    const t = toast()
    const base = {
      technicians: [], saveTechFn: TechnicianAPI, setTechnicians: vi.fn(),
      setTechModalOpen: vi.fn(), reloadFn: vi.fn(), toast: t,
    }
    await saveTech({ ...base, techForm: { Name: '  ' }, editingTechId: null })
    expect(t.error).toHaveBeenCalled()

    const created = { id: 'TECH-001', Name: 'ช่างใหม่' }
    TechnicianAPI.create = vi.fn().mockResolvedValue(created)
    await saveTech({ ...base, techForm: { Name: 'ช่างใหม่' }, editingTechId: null })
    expect(base.setTechnicians).toHaveBeenCalledWith([created])
    expect(base.setTechModalOpen).toHaveBeenCalledWith(false)
    expect(base.reloadFn).toHaveBeenCalled()
    expect(syncTechToNotifications).toHaveBeenCalled()

    TechnicianAPI.update = vi.fn().mockResolvedValue({})
    const techs = [{ id: 'TECH-001', Technician_ID: 'TECH-001', Name: 'old' }]
    await saveTech({ ...base, technicians: techs, techForm: { Name: 'new' }, editingTechId: 'TECH-001' })
    expect(TechnicianAPI.update).toHaveBeenCalled()
    const lastList = base.setTechnicians.mock.calls.at(-1)[0]
    expect(lastList[0].Name).toBe('new')
  })

  it('deleteTech: confirms, removes, reloads', async () => {
    const t = toast()
    TechnicianAPI.delete = vi.fn().mockResolvedValue({})
    const d = {
      tech: { id: 'TECH-001', Technician_ID: 'TECH-001', Name: 'ช่างA' },
      confirmFn: vi.fn().mockReturnValue(false), deleteTechFn: TechnicianAPI,
      technicians: [{ id: 'TECH-001', Technician_ID: 'TECH-001' }],
      setTechnicians: vi.fn(), reloadFn: vi.fn(), toast: t,
    }
    await deleteTech(d)
    expect(TechnicianAPI.delete).not.toHaveBeenCalled()

    await deleteTech({ ...d, confirmFn: vi.fn().mockReturnValue(true) })
    expect(TechnicianAPI.delete).toHaveBeenCalledWith('TECH-001')
    expect(d.setTechnicians).toHaveBeenCalledWith([])
    expect(t.success).toHaveBeenCalled()
  })

  it('loadTechData: fills state from APIs and parses KPI map', async () => {
    TechnicianAPI.list = vi.fn().mockResolvedValue([{ id: 't1' }])
    UserAPI.list = vi.fn().mockResolvedValue([{ id: 'u1' }])
    CylinderAPI.list = vi.fn().mockResolvedValue([{ NewMC: 'GK1-01' }])
    KpiSettingsAPI.list = vi.fn().mockResolvedValue([
      { Key: 'kpi_target_repair', Value: '2' },
      { Key: 'kpi_target_bogus', Value: 'x' },
    ])
    const d = {
      setTechLoading: vi.fn(), setSystemUsers: vi.fn(), setCylinders: vi.fn(),
      setTechnicians: vi.fn(), setKpiTargets: vi.fn(), setDraftKpi: vi.fn(),
      defaultKpiTargets: { REPAIR: 1, DESIGN: 3, PM: 2, SETUP: 1 }, defaultTechs: [],
    }
    await loadTechData(d)

    expect(d.setSystemUsers).toHaveBeenCalledWith([{ id: 'u1' }])
    expect(d.setCylinders).toHaveBeenCalledWith([{ NewMC: 'GK1-01' }])
    expect(d.setTechnicians).toHaveBeenCalledWith([{ id: 't1' }])
    expect(d.setKpiTargets).toHaveBeenCalledWith({ REPAIR: 2, DESIGN: 3, PM: 2, SETUP: 1 })
    expect(d.setTechLoading.mock.calls[0][0]).toBe(true)
    expect(d.setTechLoading).toHaveBeenLastCalledWith(false)
  })

  it('loadTechData: falls back to localStorage when APIs fail', async () => {
    TechnicianAPI.list = vi.fn().mockRejectedValue(new Error('down'))
    UserAPI.list = vi.fn().mockResolvedValue([])
    CylinderAPI.list = vi.fn().mockResolvedValue([])
    KpiSettingsAPI.list = vi.fn().mockResolvedValue([])
    localStorage.setItem('txops_tbl_technicians', JSON.stringify([{ id: 'local-1' }]))
    const d = {
      setTechLoading: vi.fn(), setSystemUsers: vi.fn(), setCylinders: vi.fn(),
      setTechnicians: vi.fn(), setKpiTargets: vi.fn(), setDraftKpi: vi.fn(),
      defaultKpiTargets: { REPAIR: 1 }, defaultTechs: [],
    }
    await loadTechData(d)

    expect(d.setTechnicians).toHaveBeenCalledWith([{ id: 'local-1' }])
    // empty fulfilled KPI list keeps defaults
    expect(d.setKpiTargets).toHaveBeenCalledWith({ REPAIR: 1 })
    localStorage.removeItem('txops_tbl_technicians')
  })
})
