import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageProvider, useT } from './LanguageContext'

const wrapper = ({ children }) => React.createElement(LanguageProvider, null, children)

beforeEach(() => {
  localStorage.clear()
})

describe('useT Thai locked mode', () => {
  it('uses Thai by default', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    expect(result.current.lang).toBe('th')
    expect(result.current.t('add')).not.toBe('Add')
  })

  it('returns key itself when not found', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    expect(result.current.t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz')
  })

  it('interpolates variables', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    const str = result.current.t('sp_alert', { n: 3 })
    expect(str).toContain('3')
    expect(str).not.toContain('{n}')
  })

  it('toggle does not switch away from Thai', () => {
    const { result } = renderHook(() => useT(), { wrapper })
    act(() => result.current.toggle())
    expect(result.current.lang).toBe('th')
    expect(result.current.t('nav_machines')).not.toBe('Machines')
  })

  it('ignores saved English preference', () => {
    localStorage.setItem('lang', 'en')
    const { result } = renderHook(() => useT(), { wrapper })
    expect(result.current.lang).toBe('th')
    expect(result.current.t('nav_workorders')).not.toBe('Work Orders')
  })
})
