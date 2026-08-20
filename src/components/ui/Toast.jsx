import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/* ── Context ─────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null)

export function useToast() {
  return useContext(ToastCtx)
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
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const c = COLORS[toast.type] || COLORS.success

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10)
    const t2 = setTimeout(() => dismiss(), DURATION)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <div
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
        transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
        opacity:    leaving ? 0 : visible ? 1 : 0,
        transform:  leaving
          ? 'translateX(110%)'
          : visible ? 'translateX(0)' : 'translateX(110%)',
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
        onClick={e => { e.stopPropagation(); dismiss() }}
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

  return (
    <ToastCtx.Provider value={toast}>
      {children}

      {/* Container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
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
