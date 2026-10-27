import { useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useDeviceView from '../../hooks/useDeviceView'

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
          aria-label="ปิดหน้าต่าง"
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
      aria-label="ปิดหน้าต่าง"
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
  const { isMobile } = useDeviceView()

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

  const maxW = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' }[size] || 'max-w-2xl'
  const hasLegacyProps = Boolean(title || footer)

  return createPortal(
    <AnimatePresence>
      {open && (
        <ModalContext.Provider value={{ open, onClose, size, isMobile }}>
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`modal-overlay ${isMobile ? 'items-end p-0' : ''}`}
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
          >
            <motion.div
              key="modal-box"
              initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              role="dialog"
              aria-modal="true"
              className={`modal-box w-full ${isMobile ? 'rounded-t-[28px] rounded-b-none max-h-[90vh]' : `${maxW}`} ${className}`}
              style={{ margin: isMobile ? '0' : '0 auto' }}
            >
              {/* Native iOS/Android Bottom Sheet Drag Handle */}
              {isMobile && (
                <div className="pt-3 pb-1 flex-shrink-0 flex justify-center cursor-pointer" onClick={onClose}>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              )}

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
                      aria-label="ปิดหน้าต่าง"
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
            </motion.div>
          </motion.div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>,
    document.body
  )
}

Modal.Header = ModalHeader
Modal.Title = ModalTitle
Modal.Body = ModalBody
Modal.Footer = ModalFooter
Modal.CloseButton = ModalCloseButton
