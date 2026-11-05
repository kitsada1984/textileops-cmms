import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { D1Client } from './d1Client'

describe('d1Client - execute query paths', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  it('short-circuits empty IN() selects without fetching', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy
    const client = new D1Client({ apiUrl: '/api/d1/query' })

    const res = await client.from('machines').select().in('Mc', []).execute()

    expect(res.error).toBeNull()
    expect(res.data).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('runs the head-count branch and returns the count', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 7 }),
    })
    const client = new D1Client({ apiUrl: '/api/d1/query' })

    const res = await client.from('machines').select('*', { count: 'exact' }).execute()

    expect(res.error).toBeNull()
    expect(res.count).toBe(7)
    expect(res.data).toBeNull()
  })

  it(' surfaces server error messages on HTTP failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ error: 'boom' }),
    })
    const client = new D1Client({ apiUrl: '/api/d1/query' })

    const res = await client.from('machines').select().execute()

    expect(res.data).toBeNull()
    expect(res.error.message).toBe('boom')
  })

  it('unwraps single() to the first row', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 1 }, { id: 2 }] }),
    })
    const client = new D1Client({ apiUrl: '/api/d1/query' })

    const res = await client.from('machines').select().single().execute()

    expect(res.error).toBeNull()
    expect(res.data).toEqual({ id: 1 })
  })
})

describe('d1Client - Realtime Channel & Page Visibility Quota Saver', () => {
  let client
  let channel
  let mockEventSourceInstances = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockEventSourceInstances = []

    // Mock global EventSource
    global.EventSource = vi.fn().mockImplementation(function (url) {
      this.url = url
      this.readyState = 1 // OPEN
      this.addEventListener = vi.fn()
      this.close = vi.fn().mockImplementation(() => {
        this.readyState = 2 // CLOSED
      })
      mockEventSourceInstances.push(this)
    })
    global.EventSource.OPEN = 1
    global.EventSource.CLOSED = 2

    client = new D1Client({ realtimeUrl: '/api/d1/realtime' })
    channel = client.channel('test-channel')
  })

  afterEach(() => {
    if (channel) channel.unsubscribe()
  })

  it('subscribes and connects EventSource', () => {
    const statusCb = vi.fn()
    channel.subscribe(statusCb)

    expect(global.EventSource).toHaveBeenCalledWith(expect.stringContaining('/api/d1/realtime?stream=true'))
    expect(channel.isSubscribed).toBe(true)
  })

  it('suspends realtime stream and alerts PAUSED_IDLE when browser tab becomes hidden', () => {
    const statusCb = vi.fn()
    channel.subscribe(statusCb)

    const esInstance = mockEventSourceInstances[0]
    expect(esInstance).toBeDefined()

    // Simulate tab switching to hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // EventSource should be closed to save quota
    expect(esInstance.close).toHaveBeenCalled()
    expect(channel.eventSource).toBeNull()
    expect(statusCb).toHaveBeenCalledWith('PAUSED_IDLE')
  })

  it('resumes realtime stream when browser tab becomes visible again', () => {
    const statusCb = vi.fn()
    channel.subscribe(statusCb)

    // 1. Hide tab
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(channel.eventSource).toBeNull()

    // 2. Re-open / focus tab
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // Should create a new EventSource stream with the latest event id
    expect(channel.eventSource).not.toBeNull()
    expect(global.EventSource).toHaveBeenCalledTimes(2)
  })

  it('cleans up visibility listeners and connections on unsubscribe', () => {
    channel.subscribe()
    const esInstance = mockEventSourceInstances[0]

    channel.unsubscribe()
    expect(esInstance.close).toHaveBeenCalled()
    expect(channel.isSubscribed).toBe(false)
    expect(channel._visibilityHandler).toBeNull()
  })
})
