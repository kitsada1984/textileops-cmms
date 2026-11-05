import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

// Sort indicator moved verbatim from DataTable (props only).
export function TableSortIcon({ canSort, isSorted }) {
  return (
    <>
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
    </>
  )
}
