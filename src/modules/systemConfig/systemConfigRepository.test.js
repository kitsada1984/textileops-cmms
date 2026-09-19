import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSystemConfig, saveSystemConfig, deleteSystemConfig } from './index'
import { supabase } from '../../supabase'

describe('System Configuration Repository & Seam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('reads configuration from appconfigs table first', async () => {
    const mockData = [{ id: 'tech_1', name: 'ช่างทดสอบ' }]

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'appconfigs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { value: JSON.stringify(mockData) },
                error: null,
              }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const result = await getSystemConfig('technicians', {
      legacyWorkOrderId: 'SYS_TECHNICIANS',
      localCacheKey: 'txops_tbl_technicians',
      defaultValue: [],
    })

    expect(result).toEqual(mockData)
    expect(localStorage.getItem('txops_tbl_technicians')).toBe(JSON.stringify(mockData))
  })

  it('falls back to legacy workorders.Comment if appconfigs is empty, and caches to localStorage', async () => {
    const legacyData = [{ no: 1, item: 'กลม cylinder', std: '0.03' }]

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'appconfigs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'workorders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { Comment: JSON.stringify(legacyData) },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const result = await getSystemConfig('center_check_standards', {
      legacyWorkOrderId: 'SYS_CENTER_CHECK_STANDARDS',
      localCacheKey: 'txops_center_check_standards',
      defaultValue: null,
    })

    expect(result).toEqual(legacyData)
    expect(localStorage.getItem('txops_center_check_standards')).toBe(JSON.stringify(legacyData))
  })

  it('falls back to localStorage if network / cloud throws error', async () => {
    const cachedData = ['Tech A', 'Tech B']
    localStorage.setItem('txops_tbl_technicians', JSON.stringify(cachedData))

    vi.spyOn(supabase, 'from').mockImplementation(() => {
      throw new Error('Network offline')
    })

    const result = await getSystemConfig('technicians', {
      legacyWorkOrderId: 'SYS_TECHNICIANS',
      localCacheKey: 'txops_tbl_technicians',
      defaultValue: [],
    })

    expect(result).toEqual(cachedData)
  })

  it('returns defaultValue if not found anywhere', async () => {
    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }))

    const result = await getSystemConfig('non_existent', {
      defaultValue: 'DEFAULT_VAL',
    })

    expect(result).toBe('DEFAULT_VAL')
  })

  it('saveSystemConfig dual-writes to localStorage, appconfigs, and legacy workorders', async () => {
    const payload = [{ id: 'tech_1', name: 'สมชาย' }]
    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })

    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      if (table === 'appconfigs') {
        return { upsert: upsertSpy }
      }
      if (table === 'workorders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'wo_sys_1' }], error: null }),
            }),
          }),
          update: updateSpy,
        }
      }
      return {}
    })

    const res = await saveSystemConfig('technicians', payload, {
      legacyWorkOrderId: 'SYS_TECHNICIANS',
      localCacheKey: 'txops_tbl_technicians',
    })

    expect(res).toEqual(payload)
    expect(localStorage.getItem('txops_tbl_technicians')).toBe(JSON.stringify(payload))
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'technicians', value: JSON.stringify(payload) }),
      expect.anything()
    )
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ Comment: JSON.stringify(payload) })
    )
  })

  it('deleteSystemConfig deletes from appconfigs, legacy workorders, and localStorage', async () => {
    localStorage.setItem('txops_key', 'some_val')
    const deleteSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })

    vi.spyOn(supabase, 'from').mockImplementation(() => ({
      delete: deleteSpy,
    }))

    await deleteSystemConfig('test_key', {
      legacyWorkOrderId: 'SYS_TEST',
      localCacheKey: 'txops_key',
    })

    expect(localStorage.getItem('txops_key')).toBeNull()
    expect(deleteSpy).toHaveBeenCalled()
  })
})
