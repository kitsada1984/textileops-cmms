import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeQuotaItem, QUOTA_LIMITS, onRequestGet, onRequestPost } from './quota'

describe('functions/api/d1/quota.js - Quota & Telemetry Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates quota percentages and assigns correct risk levels', () => {
    // Normal (< 70%)
    const normal = computeQuotaItem(1000, 100000, 'items')
    expect(normal.percent).toBe(1.0)
    expect(normal.level).toBe('normal')

    // Warning (70% - 85%)
    const warning = computeQuotaItem(75000, 100000, 'items')
    expect(warning.percent).toBe(75.0)
    expect(warning.level).toBe('warning')

    // Critical (>= 85%) - Like the current 4.43M / 5M rows read (88.6%)
    const critical = computeQuotaItem(4431650, 5000000, 'แถว/วัน')
    expect(critical.percent).toBe(88.63)
    expect(critical.level).toBe('critical')
  })

  it('returns fallback specifications when no Cloudflare token is provided', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 19 }),
      }),
    }

    const response = await onRequestGet({ env: { DB: mockDb } })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(data.source).toBe('d1_direct')
    expect(data.plan).toBe('Cloudflare Free Plan')
    expect(data.quotas.rows_read.limit).toBe(5000000)
    expect(data.quotas.rows_written.limit).toBe(100000)
    expect(data.quotas.storage.limit).toBe(QUOTA_LIMITS.storage_bytes)
    expect(data.quotas.functions_requests.limit).toBe(100000)
  })

  it('aggregates 24h GraphQL & REST metrics and flags warning when near limit', async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    }

    // Mock global fetch for Cloudflare API
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/graphql')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            data: {
              viewer: {
                accounts: [
                  {
                    d1AnalyticsAdaptiveGroups: [
                      {
                        sum: {
                          rowsRead: 4431650,
                          rowsWritten: 685,
                          readQueries: 49919,
                          writeQueries: 111,
                        },
                      },
                    ],
                    pagesFunctionsInvocationsAdaptiveGroups: [
                      {
                        sum: {
                          requests: 4937,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          }),
        })
      }
      // REST API
      return Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          result: {
            database_size: 2351104,
            num_tables: 19,
            name: 'textileops-db',
          },
        }),
      })
    })

    const response = await onRequestGet({
      env: {
        DB: mockDb,
        CLOUDFLARE_API_TOKEN: 'test-token',
      },
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.ok).toBe(true)
    expect(data.source).toBe('cloudflare_api')
    expect(data.has_warning).toBe(true)
    expect(data.quotas.rows_read.percent).toBe(88.63)
    expect(data.quotas.rows_read.level).toBe('critical')
    expect(data.quotas.rows_written.percent).toBe(0.69)
    expect(data.quotas.rows_written.level).toBe('normal')
    expect(data.activity_24h.read_queries).toBe(49919)
    expect(data.activity_24h.write_queries).toBe(111)
  })

  it('saves API token to appconfigs via POST', async () => {
    const mockRun = vi.fn().mockResolvedValue({})
    const mockBind = vi.fn().mockReturnValue({ run: mockRun })
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })

    const mockDb = { prepare: mockPrepare }

    const request = new Request('https://test/api/d1/quota', {
      method: 'POST',
      body: JSON.stringify({ api_token: 'cf-secret-123' }),
    })

    const response = await onRequestPost({ request, env: { DB: mockDb } })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.ok).toBe(true)
    expect(mockBind).toHaveBeenCalledWith('cf-secret-123')
  })
})
