// src/api/realtimeSync.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { subscribeToTables, triggerLocalTableChange } from './realtimeSync'

describe('realtimeSync Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to specific table and receives notification after debounce', () => {
    const callback = vi.fn()
    const unsub = subscribeToTables(['machines'], callback, { debounceMs: 100 })

    triggerLocalTableChange('machines', { eventType: 'INSERT', new: { id: 'M-1' } })

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({ table: 'machines', eventType: 'INSERT' })
    ])

    unsub()
  })

  it('coalesces rapid burst changes on the same table into a single call', () => {
    const callback = vi.fn()
    const unsub = subscribeToTables(['cylinders'], callback, { debounceMs: 150 })

    triggerLocalTableChange('cylinders', { eventType: 'UPDATE', new: { id: 'C-1' } })
    triggerLocalTableChange('cylinders', { eventType: 'UPDATE', new: { id: 'C-2' } })
    triggerLocalTableChange('cylinders', { eventType: 'UPDATE', new: { id: 'C-3' } })

    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0]).toHaveLength(3)

    unsub()
  })

  it('ignores changes from non-subscribed tables', () => {
    const callback = vi.fn()
    const unsub = subscribeToTables(['workorders'], callback, { debounceMs: 50 })

    triggerLocalTableChange('spareparts', { eventType: 'UPDATE' })

    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()

    unsub()
  })

  it('subscribes to wildcard table changes', () => {
    const callback = vi.fn()
    const unsub = subscribeToTables('*', callback, { debounceMs: 50 })

    triggerLocalTableChange('appconfigs', { eventType: 'UPDATE' })

    vi.advanceTimersByTime(60)
    expect(callback).toHaveBeenCalledTimes(1)

    unsub()
  })

  it('does not fire callback after unsubscribe', () => {
    const callback = vi.fn()
    const unsub = subscribeToTables(['machines'], callback, { debounceMs: 50 })

    unsub()
    triggerLocalTableChange('machines', { eventType: 'DELETE' })

    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
  })
})
