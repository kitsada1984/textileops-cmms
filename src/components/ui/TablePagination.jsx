import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

// Pagination footer moved verbatim from DataTable (props only).
export function TablePagination({ table, pageIndex, pageSize, pageCount, startRow, endRow, totalCount, pageSizeOptions, showPagination, loading }) {
  return (
    <>
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
    </>
  )
}
