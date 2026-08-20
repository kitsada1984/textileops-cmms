import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import useFilterSort, { INIT_FS } from './useFilterSort'

const DATA = [
  { id: 1, name: 'Alpha',   qty: 30, status: 'RUNNING' },
  { id: 2, name: 'Beta',    qty: 5,  status: 'IDLE' },
  { id: 3, name: 'Charlie', qty: 15, status: 'RUNNING' },
  { id: 4, name: 'alpha',   qty: 99, status: 'BREAKDOWN' },
]

describe('INIT_FS', () => {
  it('has correct initial shape', () => {
    expect(INIT_FS).toEqual({ sortKey: '', sortDir: 'asc', filters: {} })
  })
})

describe('useFilterSort — no filter/sort', () => {
  it('returns all data unchanged with INIT_FS', () => {
    const { result } = renderHook(() => useFilterSort(DATA, INIT_FS))
    expect(result.current).toHaveLength(4)
  })

  it('handles empty data', () => {
    const { result } = renderHook(() => useFilterSort([], INIT_FS))
    expect(result.current).toEqual([])
  })

  it('does not mutate the original array', () => {
    const original = [...DATA]
    renderHook(() => useFilterSort(DATA, { ...INIT_FS, sortKey: 'name', sortDir: 'asc' }))
    expect(DATA[0].name).toBe(original[0].name)
  })
})

describe('useFilterSort — filtering', () => {
  it('filters by exact match (case-insensitive)', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { status: 'RUNNING' } })
    )
    expect(result.current).toHaveLength(2)
    expect(result.current.every(r => r.status === 'RUNNING')).toBe(true)
  })

  it('filters with lowercase query against uppercase values', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { status: 'running' } })
    )
    expect(result.current).toHaveLength(2)
  })

  it('filters by partial substring', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { name: 'alph' } })
    )
    expect(result.current).toHaveLength(2)
  })

  it('ignores empty-string filter', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { status: '' } })
    )
    expect(result.current).toHaveLength(4)
  })

  it('applies multiple filters (AND logic)', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { status: 'RUNNING', name: 'Charlie' } })
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('Charlie')
  })

  it('returns empty when no rows match', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, filters: { name: 'ZZZNOMATCH' } })
    )
    expect(result.current).toHaveLength(0)
  })

  it('handles null/undefined field values gracefully', () => {
    const data = [{ id: 1, name: null }, { id: 2, name: undefined }, { id: 3, name: 'OK' }]
    const { result } = renderHook(() =>
      useFilterSort(data, { ...INIT_FS, filters: { name: 'ok' } })
    )
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe(3)
  })
})

describe('useFilterSort — sorting', () => {
  it('sorts strings ascending', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, sortKey: 'name', sortDir: 'asc' })
    )
    const names = result.current.map(r => r.name.toLowerCase())
    expect(names[0]).toBe('alpha')
    expect(names[names.length - 1]).toBe('charlie')
  })

  it('sorts strings descending', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, sortKey: 'name', sortDir: 'desc' })
    )
    const names = result.current.map(r => r.name.toLowerCase())
    expect(names[0]).toBe('charlie')
  })

  it('sorts numbers ascending', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, sortKey: 'qty', sortDir: 'asc' })
    )
    const qtys = result.current.map(r => r.qty)
    expect(qtys).toEqual([5, 15, 30, 99])
  })

  it('sorts numbers descending', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { ...INIT_FS, sortKey: 'qty', sortDir: 'desc' })
    )
    const qtys = result.current.map(r => r.qty)
    expect(qtys).toEqual([99, 30, 15, 5])
  })

  it('no sort when sortKey is empty string', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { sortKey: '', sortDir: 'asc', filters: {} })
    )
    expect(result.current.map(r => r.id)).toEqual([1, 2, 3, 4])
  })
})

describe('useFilterSort — filter + sort combined', () => {
  it('filters first then sorts', () => {
    const { result } = renderHook(() =>
      useFilterSort(DATA, { filters: { status: 'RUNNING' }, sortKey: 'qty', sortDir: 'desc' })
    )
    expect(result.current).toHaveLength(2)
    expect(result.current[0].qty).toBeGreaterThan(result.current[1].qty)
  })
})
