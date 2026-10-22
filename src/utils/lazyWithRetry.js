import { lazy } from 'react'

/**
 * Checks if an error is caused by a missing dynamic import chunk
 * (common after new deployments when chunk hashes change)
 */
export function isChunkLoadError(error) {
  if (!error) return false
  const msg = (error.message || String(error)).toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk') ||
    msg.includes('loading dynamic module')
  )
}

/**
 * Safely clears Service Worker caches when a chunk load error is detected
 */
export async function clearAppCaches() {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((k) => window.caches.delete(k)))
    } catch (e) {
      console.warn('Failed to clear caches:', e)
    }
  }
}

/**
 * Executes dynamic import with retry and automatic version reload on chunk hash mismatch
 */
export async function retryImport(importFn, name = 'module') {
  try {
    return await importFn()
  } catch (firstError) {
    console.warn(`[lazyWithRetry] Initial load failed for ${name}:`, firstError?.message || firstError)

    // If it's not a chunk load error, retry once immediately after short delay
    if (!isChunkLoadError(firstError)) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return await importFn()
    }

    // If it is a chunk load error, check if we already reloaded to prevent infinite loop
    const reloadKey = `textileops_chunk_reload_${name}`
    const hasReloaded = typeof window !== 'undefined' && sessionStorage.getItem(reloadKey)

    if (!hasReloaded && typeof window !== 'undefined') {
      sessionStorage.setItem(reloadKey, 'true')
      await clearAppCaches()
      console.warn(`[lazyWithRetry] Chunk hash mismatch detected for ${name}. Reloading page to fetch latest version...`)
      if (typeof window.location?.reload === 'function') {
        window.location.reload()
      }
      // Return a pending promise while the browser reloads
      return new Promise(() => {})
    }

    // If already reloaded once and still failed, clear key and throw error so ErrorBoundary catches it
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(reloadKey)
    }
    throw firstError
  }
}

/**
 * React.lazy wrapper with automatic retry and version-reload on chunk hash mismatch
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} importFn
 * @param {string} [name='module'] - Optional identifier for logging
 */
export function lazyWithRetry(importFn, name = 'module') {
  return lazy(() => retryImport(importFn, name))
}
