import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  tableCalls: [],
  result: { data: [], error: null },
}))

vi.mock('./dbClient', () => ({
  db: {
    from: (table) => {
      h.tableCalls.push(table)
      return {
        select: () => Promise.resolve(h.result),
      }
    },
  },
}))

import { createEntityClient } from './supabaseClient'
import { AuditLogAPI } from './entities'

describe('createEntityClient — live data vs local mirror', () => {
  beforeEach(() => {
    h.tableCalls.length = 0
    h.result = { data: [], error: null }
    localStorage.clear()
  })

  it('uses the auditlogs table (matches the D1/Supabase schema name)', async () => {
    await AuditLogAPI.list()
    expect(h.tableCalls).toContain('auditlogs')
    expect(h.tableCalls).not.toContain('audit_logs')
  })

  it('returns live rows and refreshes the local mirror', async () => {
    h.result = { data: [{ id: 'a1', Module: 'CYLINDERS' }], error: null }
    const client = createEntityClient('auditlogs')
    const rows = await client.list()
    expect(rows).toEqual([{ id: 'a1', Module: 'CYLINDERS' }])
    expect(JSON.parse(localStorage.getItem('textileops_tbl_auditlogs'))).toEqual([{ id: 'a1', Module: 'CYLINDERS' }])
  })

  it('does not resurrect cached rows when the table is genuinely empty', async () => {
    localStorage.setItem('textileops_tbl_auditlogs', JSON.stringify([{ id: 'stale-deleted-row' }]))
    h.result = { data: [], error: null }
    const client = createEntityClient('auditlogs')
    const rows = await client.list()
    expect(rows).toEqual([])
    expect(JSON.parse(localStorage.getItem('textileops_tbl_auditlogs'))).toEqual([])
  })

  it('falls back to the local mirror (with a warning) only when the table is missing', async () => {
    localStorage.setItem('textileops_tbl_auditlogs', JSON.stringify([{ id: 'offline-row' }]))
    h.result = { data: null, error: { message: 'no such table: auditlogs' } }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = createEntityClient('auditlogs')
    const rows = await client.list()
    expect(rows).toEqual([{ id: 'offline-row' }])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
