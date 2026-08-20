import { describe, expect, it } from 'vitest'
import { sanitizeForSupabase } from './supabaseClient'

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
