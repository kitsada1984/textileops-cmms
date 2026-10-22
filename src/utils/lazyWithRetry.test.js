import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isChunkLoadError, clearAppCaches, retryImport, lazyWithRetry } from './lazyWithRetry'

describe('lazyWithRetry - Dynamic Import Recovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('isChunkLoadError', () => {
    it('detects Failed to fetch dynamically imported module', () => {
      const err = new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/WorkOrders-123.js')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('detects Importing a module script failed', () => {
      const err = new Error('Importing a module script failed.')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('detects error loading dynamically imported module', () => {
      const err = new Error('error loading dynamically imported module: /assets/Login.js')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('detects ChunkLoadError', () => {
      const err = new Error('ChunkLoadError: Loading chunk 45 failed')
      expect(isChunkLoadError(err)).toBe(true)
    })

    it('returns false for unrelated errors', () => {
      expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
      expect(isChunkLoadError(new ReferenceError('x is not defined'))).toBe(false)
      expect(isChunkLoadError(null)).toBe(false)
      expect(isChunkLoadError(undefined)).toBe(false)
    })
  })

  describe('clearAppCaches', () => {
    it('safely attempts to clear window.caches if available', async () => {
      const mockDelete = vi.fn().mockResolvedValue(true)
      const mockKeys = vi.fn().mockResolvedValue(['cache-v1', 'cache-v2'])
      window.caches = {
        keys: mockKeys,
        delete: mockDelete,
      }

      await clearAppCaches()
      expect(mockKeys).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('cache-v1')
      expect(mockDelete).toHaveBeenCalledWith('cache-v2')
    })

    it('does not throw if window.caches is undefined', async () => {
      delete window.caches
      await expect(clearAppCaches()).resolves.not.toThrow()
    })
  })

  describe('retryImport & lazyWithRetry', () => {
    it('creates a lazy component that resolves on success', async () => {
      const mockComponent = () => 'Mock Page'
      const importFn = vi.fn().mockResolvedValue({ default: mockComponent })

      const LazyComp = lazyWithRetry(importFn, 'TestComp')
      expect(LazyComp).toBeDefined()

      const res = await retryImport(importFn, 'TestComp')
      expect(res).toEqual({ default: mockComponent })
    })

    it('triggers reload and sets guard flag when chunk error occurs', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, reload: reloadMock },
      })

      const chunkErr = new TypeError('Failed to fetch dynamically imported module: /assets/test.js')
      const importFn = vi.fn().mockRejectedValue(chunkErr)

      retryImport(importFn, 'WorkOrders')
      // Wait microtasks
      await new Promise((r) => setTimeout(r, 10))

      expect(sessionStorage.getItem('textileops_chunk_reload_WorkOrders')).toBe('true')
      expect(reloadMock).toHaveBeenCalled()
    })

    it('does not infinitely reload if guard flag is already set', async () => {
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, reload: reloadMock },
      })

      sessionStorage.setItem('textileops_chunk_reload_WorkOrders', 'true')

      const chunkErr = new TypeError('Failed to fetch dynamically imported module: /assets/test.js')
      const importFn = vi.fn().mockRejectedValue(chunkErr)

      let caughtError = null
      try {
        await retryImport(importFn, 'WorkOrders')
      } catch (e) {
        caughtError = e
      }

      expect(caughtError).toBe(chunkErr)
      expect(reloadMock).not.toHaveBeenCalled()
      expect(sessionStorage.getItem('textileops_chunk_reload_WorkOrders')).toBeNull()
    })
  })
})
