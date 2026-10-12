import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'

/**
 * Standardized Headless Data Table Hook using TanStack Table v8
 * Provides headless state (sorting, filtering, pagination) for Tri-View tables
 * @param {object} options - Table configuration options
 */
export function useDataTable({
  data = [],
  columns = [],
  initialPageSize = 20,
  enablePagination = true,
  manualPagination = false,
  pageCount,
  onPaginationChange,
}) {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const memoizedData = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const memoizedColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns])

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: onPaginationChange || setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enablePagination && !manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    manualPagination,
    pageCount,
  })

  return {
    table,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    pagination,
    setPagination,
    rows: table.getRowModel().rows,
  }
}

export default useDataTable
