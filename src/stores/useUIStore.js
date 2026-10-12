import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global UI & Device Preferences Store using Zustand
 * Optimized for selector-based subscriptions and zero unnecessary re-renders
 */
export const useUIStore = create(
  persist(
    (set, get) => ({
      // Device simulator mode: 'auto' | 'desktop' | 'tablet' | 'mobile'
      simulatorMode: 'auto',
      setSimulatorMode: (mode) => {
        if (['auto', 'desktop', 'tablet', 'mobile'].includes(mode)) {
          set({ simulatorMode: mode })
          // Synchronize legacy key for backward compatibility
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_device_view_mode', mode)
          }
        }
      },

      // Mobile / Sidebar drawer state
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: Boolean(open) }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Table Density preference: 'comfortable' | 'compact'
      tableDensity: 'comfortable',
      setTableDensity: (density) => set({ tableDensity: density }),

      // Active tab memory per page (e.g., PMPlan, WorkOrders)
      pageTabs: {},
      setPageTab: (pageKey, tab) =>
        set((state) => ({
          pageTabs: { ...state.pageTabs, [pageKey]: tab },
        })),
    }),
    {
      name: 'textileops_ui_store',
      partialize: (state) => ({
        simulatorMode: state.simulatorMode,
        tableDensity: state.tableDensity,
        pageTabs: state.pageTabs,
      }),
    }
  )
)

export default useUIStore
