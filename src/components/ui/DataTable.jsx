import React, { useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  Inbox,
} from 'lucide-react'
import { useUIStore } from '../../stores/useUIStore'
import { useDataTable } from '../../hooks/useDataTable'
import { TableSkeleton } from './Skeleton'

/**
 * Standardized Data Table Component powered by TanStack Table v8
 * Integrates responsive Tri-View layout, Zustand UI Store density,
 * sorting indicators, and full pagination controls.
 *
 * @param {object} props
 * @param {object} [props.table] - Pre-initialized TanStack Table instance (optional)
 * @param {Array} [props.data] - Data array (used if table not provided)
 * @param {Array} [props.columns] - Columns array (used if table not provided)
 * @param {boolean} [props.loading=false] - Loading indicator
 * @param {string} [props.density] - Density override: 'comfortable' | 'compact'
 * @param {Function} [props.onRowClick] - Callback when row is clicked: (item, index, event) => void
 * @param {string} [props.emptyMessage] - Message when table has no rows
 * @param {boolean} [props.showPagination=true] - Whether to show pagination toolbar
 * @param {Array<number>} [props.pageSizeOptions=[10, 20, 50, 100]] - Page size selector options
 * @param {string} [props.className] - Additional wrapper CSS class
 * @param {React.ReactNode} [props.toolbarActions] - Actions to display in toolbar (bulk actions, export, etc.)
 */
export function DataTable({
  table: externalTable,
  data = [],
  columns = [],
  loading = false,
  density: densityProp,
  onRowClick,
  emptyMessage = 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข',
  showPagination = true,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
  toolbarActions = null,
}) {
  const storeDensity = useUIStore((state) => state.tableDensity)
  const density = densityProp || storeDensity || 'comfortable'
  const isCompact = density === 'compact'

  // Internal hook fallback if external table instance not passed
  const internal = useDataTable({
    data: externalTable ? [] : data,
    columns: externalTable ? [] : columns,
    initialPageSize: 20,
    enablePagination: showPagination,
  })

  const table = externalTable || internal.table
  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const leafColumns = table.getVisibleLeafColumns()

  const pagination = table.getState().pagination || { pageIndex: 0, pageSize: 20 }
  const totalCount = table.getFilteredRowModel().rows.length
  const pageIndex = pagination.pageIndex
  const pageSize = pagination.pageSize
  const pageCount = table.getPageCount()

  const startRow = totalCount === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min((pageIndex + 1) * pageSize, totalCount)

  // Density styles
  const thPadding = isCompact ? 'py-2 px-2.5 text-[11px]' : 'py-3 px-3.5 text-xs'
  const tdPadding = isCompact ? 'py-1.5 px-2.5 text-[11px]' : 'py-2.5 px-3.5 text-xs'

  return (
    <div className={`data-table-root card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 ${className}`}>
      {/* Optional Top Toolbar Actions */}
      {toolbarActions && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {toolbarActions}
        </div>
      )}

      {/* Main Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="table w-full border-collapse">
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const isSorted = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`${thPadding} text-left whitespace-nowrap select-none ${
                        canSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors' : ''
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>
                          {header.isPlaceholder
                            ? null
                            : typeof header.column.columnDef.header === 'function'
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        </span>

                        {canSort && (
                          <span className="text-slate-400 dark:text-slate-500">
                            {isSorted === 'asc' ? (
                              <ArrowUp size={13} className="text-blue-600 dark:text-blue-400" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown size={13} className="text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <TableSkeleton
                rows={Math.min(pageSize || 5, 8)}
                cols={leafColumns.length || 4}
                density={density}
              />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={leafColumns.length || 1} className="text-center py-12 text-slate-400">
                  <Inbox size={32} className="mx-auto mb-2 opacity-30" />
                  <span className="text-xs">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={(e) => onRowClick && onRowClick(row.original, i, e)}
                  className={`transition-colors ${
                    onRowClick ? 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  } ${row.getIsSelected() ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`${tdPadding} whitespace-nowrap`}>
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.renderValue()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Toolbar */}
      {showPagination && !loading && totalCount > 0 && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
          {/* Row Counter */}
          <div className="flex items-center gap-2">
            <span>
              แสดง <strong className="font-mono text-slate-900 dark:text-slate-100">{startRow}</strong> -{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">{endRow}</strong> จากทั้งหมด{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">{totalCount}</strong> รายการ
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 ml-3">
              <span className="text-[11px] text-slate-500">แสดงหน้าละ:</span>
              <select
                value={pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="select select-xs select-bordered py-0.5 px-2 rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-mono"
              >
                {pageSizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าแรก"
              aria-label="หน้าแรก"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าก่อนหน้า"
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="px-2 font-mono text-[11px]">
              หน้า <strong className="text-slate-900 dark:text-slate-100">{pageIndex + 1}</strong> / {pageCount || 1}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าถัดไป"
              aria-label="หน้าถัดไป"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="หน้าสุดท้าย"
              aria-label="หน้าสุดท้าย"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
