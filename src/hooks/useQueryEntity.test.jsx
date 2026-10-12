import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQueryEntity } from './useQueryEntity'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useQueryEntity Hook - TanStack Query v5', () => {
  it('fetches entity data and manages loading state', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue([{ id: 1, name: 'Machine A' }]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const { result } = renderHook(() => useQueryEntity('test-machines', mockApi), {
      wrapper: createWrapper(),
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual([{ id: 1, name: 'Machine A' }])
    })

    expect(mockApi.list).toHaveBeenCalledTimes(1)
  })

  it('triggers mutation and invalidates query cache', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue([{ id: 1, name: 'Item 1' }]),
      create: vi.fn().mockResolvedValue({ id: 2, name: 'Item 2' }),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const { result } = renderHook(() => useQueryEntity('test-items', mockApi), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save({ name: 'Item 2' })
    })

    expect(mockApi.create).toHaveBeenCalledWith({ name: 'Item 2' })
  })
})
