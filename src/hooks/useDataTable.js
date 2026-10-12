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
 * Provides headless state (sorting, filtering, pagination, selection, visibility)
 * Fully compatible with Tri-View design, TanStack Query, and Cloudflare D1
 *
 * @param {object} options - Table configuration options
 * @param {Array} options.data - Array of row data
 * @param {Array} options.columns - Array of column definitions
 * @param {number} [options.initialPageSize=20] - Default items per page
 * @param {number} [options.initialPageIndex=0] - Initial page index
 * @param {Array} [options.initialSorting=[]] - Initial sorting state
 * @param {object} [options.initialColumnVisibility={}] - Initial column visibility map
 * @param {boolean} [options.enablePagination=true] - Enable pagination model
 * @param {boolean} [options.manualPagination=false] - True if server handles pagination
 * @param {number} [options.pageCount] - Total page count for manual pagination
 * @param {Function} [options.onPaginationChange] - Controlled pagination callback
 * @param {boolean} [options.enableRowSelection=false] - Enable row selection model
 * @param {Function} [options.onRowSelectionChange] - Controlled row selection callback
 */
export function useDataTable({
  data = [],
  columns = [],
  initialPageSize = 20,
  initialPageIndex = 0,
  initialSorting = [],
  initialColumnVisibility = {},
  enablePagination = true,
  manualPagination = false,
  pageCount,
  onPaginationChange,
  enableRowSelection = false,
  onRowSelectionChange,
}) {
  const [sorting, setSorting] = useState(initialSorting)
  const [columnFilters, setColumnFilters] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility)
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
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
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange || setRowSelection,
    onPaginationChange: onPaginationChange || setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enablePagination && !manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    manualPagination,
    pageCount,
  })

  const state = table.getState()
  const currentPagination = state.pagination || pagination

  return {
    table,
    // State
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    pagination: currentPagination,
    setPagination,

    // Row Models
    rows: table.getRowModel().rows,
    headerGroups: table.getHeaderGroups(),

    // Pagination Helpers
    pageIndex: currentPagination.pageIndex,
    pageSize: currentPagination.pageSize,
    pageCount: table.getPageCount(),
    canPreviousPage: table.getCanPreviousPage(),
    canNextPage: table.getCanNextPage(),
    previousPage: () => table.previousPage(),
    nextPage: () => table.nextPage(),
    setPageIndex: (idx) => table.setPageIndex(idx),
    setPageSize: (size) => table.setPageSize(size),
    totalRows: table.getCoreRowModel().rows.length,
    filteredRowsCount: table.getFilteredRowModel().rows.length,

    // Row Selection Helpers
    selectedRows: table.getSelectedRowModel().rows,
    selectedFlatRows: table.getSelectedRowModel().flatRows.map((r) => r.original),
    isAllRowsSelected: table.getIsAllRowsSelected(),
    isSomeRowsSelected: table.getIsSomeRowsSelected(),
    toggleAllRowsSelected: (val) => table.toggleAllRowsSelected(val),
  }
}

export default useDataTable
