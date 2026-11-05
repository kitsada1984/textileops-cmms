import { describe, expect, it } from 'vitest'
import { sanitizeForSupabase, getBadFieldFromError } from './supabaseClient'

describe('sanitizeForSupabase', () => {
  it('converts empty temporal fields to null', () => {
    expect(sanitizeForSupabase({
      DateStart: '',
      DateEnd: '   ',
      LastUpdated: '',
      Order_Date: '',
      completed_at: '',
    })).toEqual({
      DateStart: null,
      DateEnd: null,
      LastUpdated: null,
      Order_Date: null,
      completed_at: null,
    })
  })

  it('keeps normal empty text fields as empty strings', () => {
    expect(sanitizeForSupabase({
      Design: '',
      Status: '',
      Remark: '',
      Serial_NOW: '',
    })).toEqual({
      Design: '',
      Status: '',
      Remark: '',
      Serial_NOW: '',
    })
  })

  it('keeps filled temporal fields unchanged', () => {
    expect(sanitizeForSupabase({
      DateStart: '2026-05-17',
      updated_at: '2026-05-17T10:00:00.000Z',
    })).toEqual({
      DateStart: '2026-05-17',
      updated_at: '2026-05-17T10:00:00.000Z',
    })
  })
})

describe('getBadFieldFromError', () => {
  it('matches timestamp value back to its payload field', () => {
    const err = { message: 'invalid input syntax for type timestamp: "2026-13-45"' }
    expect(getBadFieldFromError(err, { StartTime: '2026-13-45', MC: 'DA-1' })).toBe('StartTime')
  })

  it('falls back to time-like strings then known time fields', () => {
    const err = { message: 'invalid input syntax for type date: "xx"' }
    expect(getBadFieldFromError(err, { Notes: '12:30', MC: 'DA-1' })).toBe('Notes')
    expect(getBadFieldFromError(err, { MC: 'DA-1', StartTime: 'ok' })).toBe('StartTime')
  })

  it('matches numeric violations to empty or non-numeric known fields', () => {
    const err = { message: 'invalid input syntax for type numeric: "abc"' }
    expect(getBadFieldFromError(err, { Quantity: 'abc', MC: 'DA-1' })).toBe('Quantity')
    expect(getBadFieldFromError({ message: 'invalid input syntax for type integer: "z"' }, { Quantity: '' })).toBe('Quantity')
  })

  it('returns null when nothing matches', () => {
    expect(getBadFieldFromError({ message: 'connection reset' }, { MC: 'DA-1' })).toBeNull()
  })
})
