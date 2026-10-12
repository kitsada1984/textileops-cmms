import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table'

/**
 * Standardized Server-Side Data Table Hook using TanStack Table v8 + TanStack Query v5
 * Designed for Cloudflare D1 databases, REST APIs, or large datasets (1000+ rows)
 *
 * @param {object} options
 * @param {string|Array} options.queryKey - Base TanStack Query key
 * @param {Function} options.queryFn - Query function receiving ({ pageIndex, pageSize, sorting, columnFilters }) => { data: Array, totalCount: number }
 * @param {Array} options.columns - Column definitions
 * @param {number} [options.initialPageSize=20] - Page size
 * @param {number} [options.initialPageIndex=0] - Starting page index
 * @param {Array} [options.initialSorting=[]] - Initial sort state
 * @param {object} [options.initialColumnVisibility={}] - Initial column visibility
 * @param {boolean} [options.enableRowSelection=false] - Row selection support
 * @param {Function} [options.onRowSelectionChange] - Row selection callback
 * @param {number} [options.staleTime=60000] - Query cache stale time
 * @param {boolean} [options.enabled=true] - Query enabled flag
 */
export function useServerDataTable({
  queryKey,
  queryFn,
  columns = [],
  initialPageSize = 20,
  initialPageIndex = 0,
  initialSorting = [],
  initialColumnVisibility = {},
  enableRowSelection = false,
  onRowSelectionChange,
  staleTime = 60000,
  enabled = true,
}) {
  const [sorting, setSorting] = useState(initialSorting)
  const [columnFilters, setColumnFilters] = useState([])
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility)
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  })

  const memoizedColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns])
  const baseQueryKey = Array.isArray(queryKey) ? queryKey : [queryKey]

  // Coordinate TanStack Query cache key with full table state (Error #2 prevention)
  const fullQueryKey = [
    ...baseQueryKey,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    columnFilters,
  ]

  const {
    data: queryResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: fullQueryKey,
    queryFn: () =>
      queryFn({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        columnFilters,
      }),
    staleTime,
    enabled,
    placeholderData: (previousData) => previousData, // Smooth page transitions
  })

  const tableData = useMemo(() => {
    if (!queryResult) return []
    if (Array.isArray(queryResult.data)) return queryResult.data
    if (Array.isArray(queryResult)) return queryResult
    return []
  }, [queryResult])

  const totalCount = useMemo(() => {
    if (typeof queryResult?.totalCount === 'number') return queryResult.totalCount
    if (typeof queryResult?.count === 'number') return queryResult.count
    return tableData.length
  }, [queryResult, tableData.length])

  const pageCount = useMemo(() => {
    if (totalCount === 0) return 1
    return Math.ceil(totalCount / pagination.pageSize) || 1
  }, [totalCount, pagination.pageSize])

  const table = useReactTable({
    data: tableData,
    columns: memoizedColumns,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
    // CRITICAL: Tell table pagination, sorting, and filtering are handled by the server (Error #3 prevention)
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange || setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  return {
    table,
    data: tableData,
    totalCount,
    pageCount,
    isLoading,
    isFetching,
    error,
    refetch,
    // State & Setters
    pagination,
    setPagination,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
  }
}

export default useServerDataTable
