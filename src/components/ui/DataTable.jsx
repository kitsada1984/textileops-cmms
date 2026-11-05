import React from 'react'
import {
  Inbox,
} from 'lucide-react'
import { useUIStore } from '../../stores/useUIStore'
import { useDataTable } from '../../hooks/useDataTable'
import { TableSkeleton } from './Skeleton'
import { TableSortIcon } from './TableSortIcon'
import { TablePagination } from './TablePagination'

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
                      scope="col"
                      colSpan={header.colSpan}
                      aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                      tabIndex={canSort ? 0 : undefined}
                      onKeyDown={canSort ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          header.column.getToggleSortingHandler()?.(e)
                        }
                      } : undefined}
                      className={`${thPadding} text-left whitespace-nowrap select-none ${
                        canSort ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500' : ''
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

                          <TableSortIcon canSort={canSort} isSorted={isSorted} />
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
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onRowClick(row.original, i, e)
                    }
                  } : undefined}
                  className={`transition-colors ${
                    onRowClick ? 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer focus:outline-none focus:bg-blue-50/60 dark:focus:bg-slate-800/60' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
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
      <TablePagination table={table} pageIndex={pageIndex} pageSize={pageSize} pageCount={pageCount} startRow={startRow} endRow={endRow} totalCount={totalCount} pageSizeOptions={pageSizeOptions} showPagination={showPagination} loading={loading} />
    </div>
  )
}

export default DataTable
