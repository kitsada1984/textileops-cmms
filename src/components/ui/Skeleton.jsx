import React from 'react'

/**
 * Standardized Accessible Skeleton Loader Component
 * Reduces Cumulative Layout Shift (CLS) and enhances perceived loading performance.
 *
 * @param {object} props
 * @param {string} [props.className] - Custom tailwind classes (width, height, etc.)
 * @param {'rectangular'|'circular'|'text'} [props.variant='rectangular'] - Skeleton shape
 * @param {number|string} [props.width] - Optional width inline style
 * @param {number|string} [props.height] - Optional height inline style
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  ...props
}) {
  const variantClass = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded-md h-4 w-full',
  }[variant] || 'rounded-lg'

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="กำลังโหลดข้อมูล..."
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${variantClass} ${className}`}
      style={{ width, height, ...props.style }}
      {...props}
    >
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
    </div>
  )
}

/**
 * Skeleton Loader for Data Tables to prevent table height collapse and CLS
 *
 * @param {object} props
 * @param {number} [props.rows=5] - Number of skeleton rows to render
 * @param {number} [props.cols=4] - Number of skeleton columns per row
 * @param {string} [props.density='comfortable'] - Table density ('comfortable'|'compact')
 */
export function TableSkeleton({ rows = 5, cols = 4, density = 'comfortable' }) {
  const tdPadding = density === 'compact' ? 'py-2 px-2.5' : 'py-3.5 px-3.5'

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className="border-b border-slate-100 dark:border-slate-800/50">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={`skeleton-col-${cIdx}`} className={tdPadding}>
              <Skeleton
                className={`h-4 ${
                  cIdx === 0
                    ? 'w-12'
                    : cIdx === cols - 1
                    ? 'w-16 ml-auto'
                    : cIdx % 2 === 0
                    ? 'w-3/4'
                    : 'w-1/2'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton Loader for Dashboard & Entity Cards
 */
export function CardSkeleton({ className = '' }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="กำลังโหลดการ์ด..."
      className={`card p-5 border border-slate-200 dark:border-slate-800 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-40" />
      <span className="sr-only">กำลังโหลดการ์ด...</span>
    </div>
  )
}

export default Skeleton
