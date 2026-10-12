import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './useUIStore'

describe('useUIStore - Zustand State Management', () => {
  beforeEach(() => {
    useUIStore.setState({
      simulatorMode: 'auto',
      sidebarOpen: false,
      tableDensity: 'comfortable',
      pageTabs: {},
    })
  })

  it('initializes with default state values', () => {
    const state = useUIStore.getState()
    expect(state.simulatorMode).toBe('auto')
    expect(state.sidebarOpen).toBe(false)
    expect(state.tableDensity).toBe('comfortable')
  })

  it('updates simulator mode and syncs legacy localStorage', () => {
    useUIStore.getState().setSimulatorMode('mobile')
    expect(useUIStore.getState().simulatorMode).toBe('mobile')
    expect(localStorage.getItem('app_device_view_mode')).toBe('mobile')

    useUIStore.getState().setSimulatorMode('tablet')
    expect(useUIStore.getState().simulatorMode).toBe('tablet')

    // Disallows invalid mode
    useUIStore.getState().setSimulatorMode('invalid_mode')
    expect(useUIStore.getState().simulatorMode).toBe('tablet')
  })

  it('toggles and sets sidebar state', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(false)

    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)

    useUIStore.getState().setSidebarOpen(false)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })

  it('manages page tab memory per pageKey', () => {
    useUIStore.getState().setPageTab('pm', 'log')
    useUIStore.getState().setPageTab('workorders', 'repair_requests')

    const { pageTabs } = useUIStore.getState()
    expect(pageTabs.pm).toBe('log')
    expect(pageTabs.workorders).toBe('repair_requests')
  })
})
