import React from 'react'
import { AlertTriangle, RefreshCw, Home, RotateCcw, Copy, Check } from 'lucide-react'
import { APP_VERSION } from '../../version'
import { notifySystemCrash } from '../../utils/telegram'

const ERROR_STORAGE_KEY = 'textileops_error_log'
const MAX_LOG_ENTRIES = 20

/**
 * Retrieve recent client error crash logs preserved in localStorage
 */
export function getClientErrorLogs() {
  try {
    return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Clear client error crash logs
 */
export function clearClientErrorLogs() {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY)
  } catch {}
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, copied: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('TextileOps ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })

    // 1. Auto-save crash evidence to localStorage so it survives page reloads
    try {
      const existing = getClientErrorLogs()
      const entry = {
        id: Date.now(),
        time: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        version: APP_VERSION,
        message: error?.message || String(error),
        stack: error?.stack ? String(error.stack).slice(0, 1000) : '',
      }
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify([entry, ...existing].slice(0, MAX_LOG_ENTRIES)))
    } catch {}

    // 2. Dispatch automatic crash notification to Telegram Admin/Supervisors
    try {
      let currentUser = null
      const stored = typeof window !== 'undefined' ? localStorage.getItem('app_user') : null
      if (stored) currentUser = JSON.parse(stored)

      notifySystemCrash({
        error,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        version: APP_VERSION,
        user: currentUser,
      }).catch(err => console.warn('notifySystemCrash error:', err))
    } catch {}

    // 3. Call optional external error handler (e.g. telemetry or custom hook)
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo)
      } catch (e) {
        console.error('Error in onError callback:', e)
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError) {
      if (
        (this.props.resetKey !== undefined && this.props.resetKey !== prevProps.resetKey) ||
        (Array.isArray(this.props.resetKeys) && this.props.resetKeys.some((k, i) => k !== prevProps.resetKeys?.[i]))
      ) {
        this.handleReset()
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false })
    if (this.props.onReset) {
      try {
        this.props.onReset()
      } catch (e) {
        console.error('Error in onReset callback:', e)
      }
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleCopyError = () => {
    try {
      const report = `[TextileOps Crash Report]
Version: ${APP_VERSION}
Time: ${new Date().toLocaleString('th-TH')}
URL: ${typeof window !== 'undefined' ? window.location.href : ''}
Error: ${this.state.error?.message || this.state.error}
Stack:
${this.state.error?.stack || 'N/A'}`

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report)
      }
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2500)
    } catch (err) {
      console.error('Failed to copy error report:', err)
    }
  }

  render() {
    if (this.state.hasError) {
      // 1. Custom fallback render prop or element
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          reset: this.handleReset,
        })
      }
      if (this.props.fallback && React.isValidElement(this.props.fallback)) {
        return this.props.fallback
      }

      // 2. Compact widget/card boundary mode (Granular boundary)
      if (this.props.compact) {
        return (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
              <AlertTriangle size={15} />
              <span>{this.props.title || 'ไม่สามารถแสดงผลส่วนนี้ได้'}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {this.state.error?.message || 'เกิดข้อผิดพลาดในการประมวลผล'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          </div>
        )
      }

      // 3. Full-page / Route-level Error Screen (Next.js error.tsx pattern)
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {this.props.title || 'เกิดข้อผิดพลาดในการแสดงผล'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบตรวจพบข้อผิดพลาดที่ไม่คาดคิด คุณสามารถลองใหม่อีกครั้ง หรือคัดลอกรายละเอียดแจ้งทีมงาน
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900/80 rounded-xl text-left overflow-hidden">
                <div className="text-[11px] font-mono text-rose-500 font-semibold truncate">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
              <button
                type="button"
                onClick={this.handleCopyError}
                className="px-3.5 py-2 text-xs flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="คัดลอกรายละเอียดข้อผิดพลาดเพื่อส่งแจ้งใน LINE หรือ Telegram"
              >
                {this.state.copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{this.state.copied ? 'คัดลอกแล้ว!' : 'คัดลอกรายละเอียด'}</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>รีโหลดหน้านี้</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-outline px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Home size={14} />
                <span>กลับหน้าหลัก</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary