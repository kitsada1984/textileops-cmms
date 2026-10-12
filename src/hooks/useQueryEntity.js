import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Type-safe Entity Hook powered by TanStack Query v5
 * Provides automatic caching, deduplication, and cache invalidation
 * @param {string} queryKey - Unique query key name (e.g., 'machines', 'cylinders')
 * @param {object} api - Entity API client containing list, create, update, delete
 * @param {object} [options] - Optional query options
 */
export function useQueryEntity(queryKey, api, options = {}) {
  const queryClient = useQueryClient()
  const key = Array.isArray(queryKey) ? queryKey : [queryKey]

  const {
    data = [],
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await api.list(options.filters || {})
      return Array.isArray(res) ? res : res.data || res.items || []
    },
    ...options,
  })

  const saveMutation = useMutation({
    mutationFn: async (item) => {
      return item._id || item.id
        ? await api.update(item._id || item.id, item)
        : await api.create(item)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    data,
    loading: isPending || saveMutation.isPending || removeMutation.isPending,
    isFetching,
    error: error?.message || null,
    load: refetch,
    save: (item) => saveMutation.mutateAsync(item),
    remove: (id) => removeMutation.mutateAsync(id),
  }
}

export default useQueryEntity
