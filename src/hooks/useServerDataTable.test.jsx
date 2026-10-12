import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { useServerDataTable } from './useServerDataTable'

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: 'Title' },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useServerDataTable Hook - TanStack Table v8 + TanStack Query v5', () => {
  it('fetches server paginated data and initializes table', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      data: [
        { id: '1', title: 'Work Order 1' },
        { id: '2', title: 'Work Order 2' },
      ],
      totalCount: 10,
    })

    const { result } = renderHook(
      () =>
        useServerDataTable({
          queryKey: ['test_server_table'],
          queryFn: mockFetcher,
          columns,
          initialPageSize: 2,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.totalCount).toBe(10)
    expect(result.current.pageCount).toBe(5)
    expect(mockFetcher).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 2,
      sorting: [],
      columnFilters: [],
    })
  })

  it('triggers query refetch when table pagination changes', async () => {
    const mockFetcher = vi.fn().mockImplementation(({ pageIndex }) =>
      Promise.resolve({
        data: [{ id: String(pageIndex + 1), title: `Page ${pageIndex + 1}` }],
        totalCount: 4,
      })
    )

    const { result } = renderHook(
      () =>
        useServerDataTable({
          queryKey: ['test_paginated_server'],
          queryFn: mockFetcher,
          columns,
          initialPageSize: 1,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.data[0]?.id).toBe('1')
    })

    act(() => {
      result.current.table.nextPage()
    })

    await waitFor(() => {
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 1,
        })
      )
    })
  })

  it('triggers query refetch when table sorting changes', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1', title: 'A' }],
      totalCount: 1,
    })

    const { result } = renderHook(
      () =>
        useServerDataTable({
          queryKey: ['test_sorted_server'],
          queryFn: mockFetcher,
          columns,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setSorting([{ id: 'title', desc: true }])
    })

    await waitFor(() => {
      expect(mockFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          sorting: [{ id: 'title', desc: true }],
        })
      )
    })
  })
})
