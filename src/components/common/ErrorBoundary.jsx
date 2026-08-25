import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('TextileOps ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                เกิดข้อผิดพลาดในการแสดงผล
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบตรวจพบข้อผิดพลาดที่ไม่คาดคิด กรุณาลองรีโหลดหน้านี้ใหม่อีกครั้ง
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900/80 rounded-xl text-left overflow-hidden">
                <div className="text-[11px] font-mono text-rose-500 font-semibold truncate">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>รีโหลดหน้านี้</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn-outline px-4 py-2 text-xs flex items-center gap-1.5"
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