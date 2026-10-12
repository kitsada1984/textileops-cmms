import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useDataTable } from './useDataTable'

const testColumns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Machine Name' },
  { accessorKey: 'status', header: 'Status' },
]

const testData = [
  { id: '1', name: 'MC-101', status: 'RUNNING' },
  { id: '2', name: 'MC-102', status: 'STOPPED' },
  { id: '3', name: 'MC-103', status: 'RUNNING' },
]

describe('useDataTable Hook - TanStack Table v8', () => {
  it('initializes table row models and column headers correctly', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
        initialPageSize: 10,
      })
    )

    expect(result.current.rows).toHaveLength(3)
    expect(result.current.rows[0].original.name).toBe('MC-101')
    expect(result.current.table.getHeaderGroups()[0].headers).toHaveLength(3)
  })

  it('updates sorting state correctly', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
      })
    )

    act(() => {
      result.current.setSorting([{ id: 'name', desc: true }])
    })

    expect(result.current.sorting).toEqual([{ id: 'name', desc: true }])
    expect(result.current.rows[0].original.name).toBe('MC-103')
  })

  it('handles client-side pagination correctly', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
        initialPageSize: 2,
      })
    )

    expect(result.current.rows).toHaveLength(2)
    expect(result.current.table.getPageCount()).toBe(2)

    act(() => {
      result.current.table.nextPage()
    })

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].original.name).toBe('MC-103')
  })
})
