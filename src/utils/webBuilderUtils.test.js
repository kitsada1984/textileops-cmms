import { describe, it, expect } from 'vitest'
import { uid, col, sel, moveItem, validateMenu, validateCol } from './webBuilderUtils'

// ─── uid ─────────────────────────────────────────────────────
describe('uid', () => {
  it('generates a non-empty string', () => {
    expect(typeof uid()).toBe('string')
    expect(uid().length).toBeGreaterThan(0)
  })

  it('generates unique values each call', () => {
    const ids = Array.from({ length: 100 }, uid)
    const unique = new Set(ids)
    expect(unique.size).toBe(100)
  })
})

// ─── col ─────────────────────────────────────────────────────
describe('col', () => {
  it('creates a column with required fields', () => {
    const c = col('machine_code', 'รหัสเครื่อง')
    expect(c.field).toBe('machine_code')
    expect(c.label).toBe('รหัสเครื่อง')
    expect(c.type).toBe('text')
    expect(c.width).toBe('150px')
    expect(c.height).toBe('1')
    expect(c.required).toBe(false)
    expect(c.order).toBe(0)
    expect(Array.isArray(c.options)).toBe(true)
    expect(typeof c.id).toBe('string')
  })

  it('accepts custom type and width', () => {
    const c = col('qty', 'จำนวน', 'number', '80px')
    expect(c.type).toBe('number')
    expect(c.width).toBe('80px')
  })

  it('merges extra properties', () => {
    const c = col('note', 'หมายเหตุ', 'textarea', '200px', { height: '3', required: true })
    expect(c.height).toBe('3')
    expect(c.required).toBe(true)
  })

  it('generates a unique id per call', () => {
    const c1 = col('f1', 'L1')
    const c2 = col('f2', 'L2')
    expect(c1.id).not.toBe(c2.id)
  })
})

// ─── sel ─────────────────────────────────────────────────────
describe('sel', () => {
  const opts = ['RUNNING', 'IDLE', 'BREAKDOWN']

  it('creates a select column', () => {
    const c = sel('status', 'สถานะ', opts)
    expect(c.type).toBe('select')
    expect(c.field).toBe('status')
  })

  it('maps opts to {id, label, value} objects', () => {
    const c = sel('status', 'สถานะ', opts)
    expect(c.options).toHaveLength(3)
    c.options.forEach((o, i) => {
      expect(o.label).toBe(opts[i])
      expect(o.value).toBe(opts[i])
      expect(typeof o.id).toBe('string')
    })
  })

  it('uses custom width', () => {
    const c = sel('status', 'สถานะ', opts, '180px')
    expect(c.width).toBe('180px')
  })

  it('merges extra params (bug fix: required:true must not be lost)', () => {
    const c = sel('txn_type', 'ประเภท', opts, '130px', { required: true })
    expect(c.required).toBe(true)
  })

  it('extra does not override built-in options', () => {
    const c = sel('status', 'สถานะ', opts, '130px', { required: true })
    expect(c.options).toHaveLength(3)
  })

  it('option ids are unique', () => {
    const c = sel('status', 'สถานะ', opts)
    const ids = c.options.map(o => o.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

// ─── moveItem ────────────────────────────────────────────────
describe('moveItem', () => {
  const arr = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ]

  it('moves item down (+1)', () => {
    const result = moveItem(arr, 0, 1)
    expect(result[0].id).toBe('b')
    expect(result[1].id).toBe('a')
    expect(result[2].id).toBe('c')
  })

  it('moves item up (-1)', () => {
    const result = moveItem(arr, 2, -1)
    expect(result[1].id).toBe('c')
    expect(result[2].id).toBe('b')
  })

  it('does nothing at upper boundary (idx=0, dir=-1)', () => {
    const result = moveItem(arr, 0, -1)
    expect(result).toEqual(arr)
  })

  it('does nothing at lower boundary (idx=last, dir=+1)', () => {
    const result = moveItem(arr, arr.length - 1, 1)
    expect(result).toEqual(arr)
  })

  it('returns a new array (does not mutate original)', () => {
    const original = [...arr]
    const result = moveItem(arr, 0, 1)
    expect(result).not.toBe(arr)
    expect(arr[0].id).toBe('a')
  })

  it('handles single-element array', () => {
    const single = [{ id: 'x' }]
    expect(moveItem(single, 0, 1)).toEqual(single)
    expect(moveItem(single, 0, -1)).toEqual(single)
  })
})

// ─── validateMenu ────────────────────────────────────────────
describe('validateMenu', () => {
  it('returns null when both label and route are present', () => {
    expect(validateMenu({ label: 'Machines', route: '/machines' })).toBeNull()
  })

  it('returns error when label is empty', () => {
    const err = validateMenu({ label: '', route: '/machines' })
    expect(err).toBeTruthy()
  })

  it('returns error when label is whitespace only', () => {
    const err = validateMenu({ label: '   ', route: '/machines' })
    expect(err).toBeTruthy()
  })

  it('returns error when route is empty', () => {
    const err = validateMenu({ label: 'Machines', route: '' })
    expect(err).toBeTruthy()
  })

  it('returns error when route is whitespace only', () => {
    const err = validateMenu({ label: 'Machines', route: '   ' })
    expect(err).toBeTruthy()
  })

  it('returns error when both are missing', () => {
    const err = validateMenu({ label: '', route: '' })
    expect(err).toBeTruthy()
  })
})

// ─── validateCol ─────────────────────────────────────────────
describe('validateCol', () => {
  const existing = [
    { id: 'col-1', field: 'machine_code', label: 'รหัส' },
    { id: 'col-2', field: 'location',     label: 'ตำแหน่ง' },
  ]

  it('returns null for valid new column with unique field', () => {
    const form = { id: 'col-new', field: 'serial_no', label: 'Serial' }
    expect(validateCol(form, existing)).toBeNull()
  })

  it('returns null when editing existing column (same field, same id)', () => {
    const form = { id: 'col-1', field: 'machine_code', label: 'รหัสเครื่อง (แก้ไข)' }
    expect(validateCol(form, existing)).toBeNull()
  })

  it('returns error when field is empty', () => {
    const form = { id: 'col-new', field: '', label: 'Some Label' }
    expect(validateCol(form, existing)).toBeTruthy()
  })

  it('returns error when field is whitespace only', () => {
    const form = { id: 'col-new', field: '  ', label: 'Some Label' }
    expect(validateCol(form, existing)).toBeTruthy()
  })

  it('returns error when label is empty', () => {
    const form = { id: 'col-new', field: 'new_field', label: '' }
    expect(validateCol(form, existing)).toBeTruthy()
  })

  it('returns duplicate-field error when adding column with existing field name', () => {
    const form = { id: 'col-new', field: 'machine_code', label: 'Duplicate' }
    const err = validateCol(form, existing)
    expect(err).toBeTruthy()
    expect(err).toContain('machine_code')
  })

  it('allows same field name when editing (not a new column)', () => {
    const form = { id: 'col-1', field: 'machine_code', label: 'Updated' }
    expect(validateCol(form, existing)).toBeNull()
  })

  it('handles empty existing columns', () => {
    const form = { id: 'col-new', field: 'any_field', label: 'Any' }
    expect(validateCol(form, [])).toBeNull()
  })
})
