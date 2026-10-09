import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequestPost } from './query'
import * as authModule from '../_auth'

describe('functions/api/d1/query.js - D1 & Batch Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(authModule, 'verifyAuthToken').mockResolvedValue({ user: 'admin', role: 'admin' })
  })

  it('rejects unauthenticated requests', async () => {
    vi.spyOn(authModule, 'verifyAuthToken').mockResolvedValueOnce(null)

    const request = new Request('https://test/api/d1/query', {
      method: 'POST',
      body: JSON.stringify({ table: 'machines', action: 'select' }),
    })
    const response = await onRequestPost({ request, env: { DB: {} } })
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toMatch(/Unauthorized/)
  })

  it('executes multi-record insert using db.batch', async () => {
    const mockBatch = vi.fn().mockResolvedValue([
      { results: [{ id: 'm1', Mc: 'MC-01' }] },
      { results: [{ id: 'm2', Mc: 'MC-02' }] },
    ])
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
    })

    const env = {
      DB: {
        batch: mockBatch,
        prepare: mockPrepare,
      },
    }

    const request = new Request('https://test/api/d1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        table: 'machines',
        action: 'insert',
        data: [
          { Mc: 'MC-01', Location: 'A1' },
          { Mc: 'MC-02', Location: 'A2' },
        ],
      }),
    })

    const response = await onRequestPost({ request, env })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.error).toBeNull()
    expect(json.data).toHaveLength(2)
    expect(mockBatch).toHaveBeenCalledTimes(1)
  })

  it('executes multi-record upsert using db.batch', async () => {
    const mockBatch = vi.fn().mockResolvedValue([
      { results: [{ id: 'p1', Part_Code: 'PART-01' }] },
      { results: [{ id: 'p2', Part_Code: 'PART-02' }] },
    ])
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
    })

    const env = {
      DB: {
        batch: mockBatch,
        prepare: mockPrepare,
      },
    }

    const request = new Request('https://test/api/d1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        table: 'spareparts',
        action: 'upsert',
        onConflict: 'Part_Code',
        data: [
          { Part_Code: 'PART-01', Stock_Qty: 10 },
          { Part_Code: 'PART-02', Stock_Qty: 20 },
        ],
      }),
    })

    const response = await onRequestPost({ request, env })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.error).toBeNull()
    expect(json.data).toHaveLength(2)
    expect(mockBatch).toHaveBeenCalledTimes(1)
  })
})
