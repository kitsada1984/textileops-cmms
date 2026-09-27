// src/api/dbClient.js
// Universal Database Switcher: Provides seamless switching between Supabase and Cloudflare D1

import { supabase } from '../supabase'
import { d1 } from './d1Client'

export function getActiveDbProvider() {
  if (typeof window !== 'undefined') {
    // 1. URL parameter override (e.g. ?db=d1 or ?db=supabase)
    const params = new URLSearchParams(window.location.search)
    const urlDb = params.get('db')
    if (urlDb === 'd1' || urlDb === 'supabase') {
      sessionStorage.setItem('textileops_db_provider', urlDb)
      return urlDb
    }

    // 2. Session / LocalStorage override
    const stored = sessionStorage.getItem('textileops_db_provider') || localStorage.getItem('textileops_db_provider')
    if (stored === 'd1' || stored === 'supabase') {
      return stored
    }
  }

  // 3. Default to env var or fallback to supabase for production safety
  return import.meta.env.VITE_DB_PROVIDER === 'd1' ? 'd1' : 'supabase'
}

export function setDbProvider(provider) {
  if (typeof window !== 'undefined') {
    if (provider === 'd1' || provider === 'supabase') {
      localStorage.setItem('textileops_db_provider', provider)
      sessionStorage.setItem('textileops_db_provider', provider)
      window.location.reload()
    }
  }
}

// Active client proxy: transparently delegates calls to Supabase or D1
export const db = new Proxy({}, {
  get(target, prop) {
    const provider = getActiveDbProvider()
    const activeClient = provider === 'd1' ? d1 : supabase
    const value = activeClient[prop]
    return typeof value === 'function' ? value.bind(activeClient) : value
  }
})

export default db
