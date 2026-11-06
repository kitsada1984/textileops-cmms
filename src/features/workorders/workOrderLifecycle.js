import { useEffect } from 'react'
import { db } from '../../api/dbClient'

// Component lifecycle effects moved verbatim out of the WorkOrders
// component as custom hooks (Rules of Hooks: each wraps exactly one
// useEffect with identical deps, called unconditionally at the same
// position in the component). No logic change.

// Was the `useEffect(..., [defaultTab])` after the Tabs state.
export function useDefaultTabSync(defaultTab, setCurrentTab) {
  useEffect(() => {
    if (defaultTab) setCurrentTab(defaultTab)
  }, [defaultTab])
}

// Was the `// Deep Link support` effect.
export function useDeepLinkSearch(setSearch) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search)
        const jobParam = params.get('job') || params.get('wo') || params.get('id')
        if (jobParam) {
          setSearch(jobParam)
        }
      }
    } catch {}
  }, [])
}

// Was the `useEffect(..., [currentTab])` after loadTechsAndSettings.
export function useTechLoader(currentTab, loadTechsAndSettings) {
  useEffect(() => {
    loadTechsAndSettings()
  }, [currentTab])
}

// Was the `// Real-time & Window Focus Sync ...` effect.
export function useTechRealtimeSync(loadTechsAndSettings) {
  useEffect(() => {
    let lastSync = Date.now()
    const handleFocusSync = () => {
      if (Date.now() - lastSync > 3000) {
        lastSync = Date.now()
        loadTechsAndSettings()
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocusSync()
    }

    window.addEventListener('focus', handleFocusSync)
    document.addEventListener('visibilitychange', handleVisibility)

    let channel = null
    try {
      if (db && typeof db.channel === 'function') {
        channel = db
          .channel('workorders_tech_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appconfigs' }, () => {
            loadTechsAndSettings()
          })
          .subscribe()
      }
    } catch {}

    return () => {
      window.removeEventListener('focus', handleFocusSync)
      document.removeEventListener('visibilitychange', handleVisibility)
      try {
        if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe()
      } catch {}
    }
  }, [])
}
