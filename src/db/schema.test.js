import { describe, it, expect, vi } from 'vitest'
import {
  appconfigs,
  auditlogs,
  cylinders,
  design_bom,
  machines,
  needle_configs,
  needle_history_logs,
  needle_sets,
  pmplans,
  purchaseorders,
  repair_requests,
  spare_needle_requests,
  spareparts,
  stocktransactions,
  users,
  workorders,
  needle_conditions,
  d1_change_log,
} from './schema'
import { createDrizzleClient } from './client'
import { getTableName } from 'drizzle-orm'

describe('Drizzle ORM Schema for Cloudflare D1', () => {
  it('exports all 18 database tables with matching SQLite table names', () => {
    expect(getTableName(appconfigs)).toBe('appconfigs')
    expect(getTableName(auditlogs)).toBe('auditlogs')
    expect(getTableName(cylinders)).toBe('cylinders')
    expect(getTableName(design_bom)).toBe('design_bom')
    expect(getTableName(machines)).toBe('machines')
    expect(getTableName(needle_configs)).toBe('needle_configs')
    expect(getTableName(needle_history_logs)).toBe('needle_history_logs')
    expect(getTableName(needle_sets)).toBe('needle_sets')
    expect(getTableName(pmplans)).toBe('pmplans')
    expect(getTableName(purchaseorders)).toBe('purchaseorders')
    expect(getTableName(repair_requests)).toBe('repair_requests')
    expect(getTableName(spare_needle_requests)).toBe('spare_needle_requests')
    expect(getTableName(spareparts)).toBe('spareparts')
    expect(getTableName(stocktransactions)).toBe('stocktransactions')
    expect(getTableName(users)).toBe('users')
    expect(getTableName(workorders)).toBe('workorders')
    expect(getTableName(needle_conditions)).toBe('needle_conditions')
    expect(getTableName(d1_change_log)).toBe('_d1_change_log')
  })

  it('defines essential business columns on core operational tables', () => {
    // machines table
    expect(machines.id).toBeDefined()
    expect(machines.Mc).toBeDefined()
    expect(machines.Location).toBeDefined()
    expect(machines.Status).toBeDefined()

    // cylinders table
    expect(cylinders.id).toBeDefined()
    expect(cylinders.Serial_NOW).toBeDefined()
    expect(cylinders.Last_Check_Date).toBeDefined()

    // workorders table
    expect(workorders.id).toBeDefined()
    expect(workorders.WO_ID).toBeDefined()
    expect(workorders.Status).toBeDefined()
    expect(workorders.Tech).toBeDefined()

    // needle_conditions table
    expect(needle_conditions.id).toBeDefined()
    expect(needle_conditions.serial).toBeDefined()
    expect(needle_conditions.counter_prev).toBeDefined()
    expect(needle_conditions.counter_diff).toBeDefined()

    // _d1_change_log table
    expect(d1_change_log.id).toBeDefined()
    expect(d1_change_log.table_name).toBeDefined()
    expect(d1_change_log.action).toBeDefined()
  })

  it('initializes Drizzle client correctly when given a D1 database mock', () => {
    const mockD1 = {
      prepare: vi.fn(),
      batch: vi.fn(),
      exec: vi.fn(),
      dump: vi.fn(),
    }

    const db = createDrizzleClient(mockD1)
    expect(db).toBeDefined()
    expect(typeof db.select).toBe('function')
    expect(typeof db.insert).toBe('function')
    expect(typeof db.update).toBe('function')
    expect(typeof db.delete).toBe('function')
    expect(typeof db.batch).toBe('function')
  })

  it('throws an error if createDrizzleClient is called without a D1 binding', () => {
    expect(() => createDrizzleClient(null)).toThrow(/D1Database binding is required/)
  })
})
