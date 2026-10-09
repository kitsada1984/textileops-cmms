import { useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const ModalContext = createContext(null)

export function useModalContext() {
  const ctx = useContext(ModalContext)
  if (!ctx) {
    throw new Error('Modal compound components must be rendered inside a <Modal> provider')
  }
  return ctx
}

function ModalHeader({ children, className = '', showClose = true, title, ...props }) {
  const { onClose } = useModalContext()
  return (
    <div className={`modal-header ${className}`} {...props}>
      {title ? (
        <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-900)' }}>
          {title}
        </h2>
      ) : (
        children
      )}
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="ปิดหน้าต่าง"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

function ModalTitle({ children, className = '', ...props }) {
  return (
    <h2 className={`text-sm sm:text-base font-bold ${className}`} style={{ color: 'var(--text-900)' }} {...props}>
      {children}
    </h2>
  )
}

function ModalBody({ children, className = '', ...props }) {
  return (
    <div className={`modal-body ${className}`} {...props}>
      {children}
    </div>
  )
}

function ModalFooter({ children, className = '', ...props }) {
  return (
    <div className={`modal-footer ${className}`} {...props}>
      {children}
    </div>
  )
}

function ModalCloseButton({ className = '', children, ...props }) {
  const { onClose } = useModalContext()
  return (
    <button
      type="button"
      onClick={onClose}
      className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      title="ปิดหน้าต่าง"
      {...props}
    >
      {children || <X size={18} />}
    </button>
  )
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const maxW = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' }[size] || 'max-w-2xl'
  const hasLegacyProps = Boolean(title || footer)

  return createPortal(
    <ModalContext.Provider value={{ open, onClose, size }}>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
        <div className={`modal-box w-full ${maxW} ${className}`} style={{ margin: '0 auto' }}>
          {hasLegacyProps ? (
            <>
              <div className="modal-header">
                <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-900)' }}>
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="ปิดหน้าต่าง"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">{children}</div>
              {footer && <div className="modal-footer">{footer}</div>}
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  )
}

Modal.Header = ModalHeader
Modal.Title = ModalTitle
Modal.Body = ModalBody
Modal.Footer = ModalFooter
Modal.CloseButton = ModalCloseButton
