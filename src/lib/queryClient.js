import { QueryClient } from '@tanstack/react-query'

/**
 * Global TanStack Query Client for TextileOps
 * Follows v5 standards: 5-minute staleTime, 1-hour gcTime, deduplication
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes fresh
      gcTime: 1000 * 60 * 60,   // 1 hour cache lifetime
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

export default queryClient
