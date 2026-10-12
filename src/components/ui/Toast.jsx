import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Context ─────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null)

const noop = () => {}
const safeToastObj = {
  success: noop,
  error: noop,
  warning: noop,
  info: noop,
}
safeToastObj.toast = safeToastObj

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    return safeToastObj
  }
  return ctx
}

/* ── Single toast item ───────────────────────────────────────────────────── */
const ICONS = {
  success: <CheckCircle  size={17} />,
  error:   <XCircle      size={17} />,
  warning: <AlertTriangle size={17} />,
  info:    <Info          size={17} />,
}

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: '#10b981', bar: '#10b981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  icon: '#ef4444', bar: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', icon: '#f59e0b', bar: '#f59e0b' },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', icon: '#6366f1', bar: '#6366f1' },
}

const DURATION = 3000

function ToastItem({ toast, onRemove }) {
  const c = COLORS[toast.type] || COLORS.success

  useEffect(() => {
    const t = setTimeout(() => {
      onRemove(toast.id)
    }, DURATION)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  const dismiss = () => {
    onRemove(toast.id)
  }

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onClick={dismiss}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: 'var(--bg-card)',
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.bar}`,
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        minWidth: 240, maxWidth: 340,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        background: c.bar, opacity: 0.5, borderRadius: '0 0 0 14px',
        animation: `toast-shrink ${DURATION}ms linear forwards`,
      }}/>

      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-900)', lineHeight: 1.3 }}>
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div style={{ fontSize: 12, color: 'var(--text-500)', marginTop: toast.title ? 2 : 0, lineHeight: 1.4 }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); dismiss() }}
        title="ปิดการแจ้งเตือน"
        aria-label="ปิดการแจ้งเตือน"
        style={{ color: 'var(--text-400)', flexShrink: 0, marginTop: 1, lineHeight: 1, background:'none', border:'none', cursor:'pointer', padding:0 }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

/* ── Provider ────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback(({ type = 'success', title, message }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, title, message }])
  }, [])

  const remove = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (title, message) => add({ type: 'success', title, message }),
    error:   (title, message) => add({ type: 'error',   title, message }),
    warning: (title, message) => add({ type: 'warning', title, message }),
    info:    (title, message) => add({ type: 'info',    title, message }),
  }
  toast.toast = toast

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 80, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ pointerEvents: 'auto' }}
            >
              <ToastItem toast={t} onRemove={remove} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}
