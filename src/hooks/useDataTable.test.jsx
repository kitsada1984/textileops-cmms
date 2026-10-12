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
    expect(result.current.headerGroups[0].headers).toHaveLength(3)
    expect(result.current.totalRows).toBe(3)
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

  it('handles client-side pagination correctly with helper methods', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
        initialPageSize: 2,
      })
    )

    expect(result.current.rows).toHaveLength(2)
    expect(result.current.pageCount).toBe(2)
    expect(result.current.canPreviousPage).toBe(false)
    expect(result.current.canNextPage).toBe(true)

    act(() => {
      result.current.nextPage()
    })

    expect(result.current.pageIndex).toBe(1)
    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].original.name).toBe('MC-103')
    expect(result.current.canPreviousPage).toBe(true)
    expect(result.current.canNextPage).toBe(false)

    act(() => {
      result.current.previousPage()
    })

    expect(result.current.pageIndex).toBe(0)
    expect(result.current.rows[0].original.name).toBe('MC-101')
  })

  it('supports column visibility toggles', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
        initialColumnVisibility: { status: false },
      })
    )

    expect(result.current.columnVisibility).toEqual({ status: false })
    const visibleColumns = result.current.table.getVisibleLeafColumns()
    expect(visibleColumns.map((c) => c.id)).not.toContain('status')

    act(() => {
      result.current.setColumnVisibility({ status: true })
    })

    const updatedVisible = result.current.table.getVisibleLeafColumns()
    expect(updatedVisible.map((c) => c.id)).toContain('status')
  })

  it('supports row selection and bulk actions', () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: testData,
        columns: testColumns,
        enableRowSelection: true,
      })
    )

    expect(result.current.selectedFlatRows).toHaveLength(0)
    expect(result.current.isAllRowsSelected).toBe(false)

    act(() => {
      result.current.toggleAllRowsSelected(true)
    })

    expect(result.current.isAllRowsSelected).toBe(true)
    expect(result.current.selectedFlatRows).toHaveLength(3)

    act(() => {
      result.current.toggleAllRowsSelected(false)
    })

    expect(result.current.isAllRowsSelected).toBe(false)
    expect(result.current.selectedFlatRows).toHaveLength(0)
  })
})
