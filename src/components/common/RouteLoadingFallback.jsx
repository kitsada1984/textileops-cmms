import React from 'react'
import { Loader2 } from 'lucide-react'

export function RouteLoadingFallback({ message = 'กำลังโหลดหน้าจอ...' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[320px] sm:min-h-[420px] w-full p-6"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
      <p className="mt-3.5 text-xs font-medium text-slate-500 dark:text-slate-400 select-none animate-pulse">
        {message}
      </p>
    </div>
  )
}

export default RouteLoadingFallback
