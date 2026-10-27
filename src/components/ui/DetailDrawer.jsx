import { useEffect, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, Printer } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useDeviceView from '../../hooks/useDeviceView'

/* ── Context ─────────────────────────────────────────────────────────────── */
const DetailDrawerContext = createContext(null)

export function useDetailDrawerContext() {
  const ctx = useContext(DetailDrawerContext)
  if (!ctx) {
    throw new Error('DetailDrawer compound components must be rendered inside <DetailDrawer>')
  }
  return ctx
}

/* ── Sub-components (Compound Components) ─────────────────────────────────── */

export function DetailDrawerCloseButton({ className = '', style, ...props }) {
  const { onClose } = useDetailDrawerContext()
  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        position: 'absolute', top: 14, right: 14, zIndex: 2,
        width: 30, height: 30, borderRadius: 9,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        color: 'var(--text-500)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-thead)'
        e.currentTarget.style.color = 'var(--text-900)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.color = 'var(--text-500)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
      title="ปิดหน้าต่าง"
      aria-label="ปิดหน้าต่าง"
      className={className}
      {...props}
    >
      <X size={13} />
    </button>
  )
}

export function DetailDrawerHeader({
  title,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor = '#818cf8',
  badge,
  children,
  className = '',
  style,
  ...props
}) {
  const { accentColor = '#6366f1' } = useDetailDrawerContext()
  const iBg = iconBg ?? `${accentColor}28`

  return (
    <div
      style={{
        flexShrink: 0, position: 'relative',
        background: 'var(--bg-card)',
        ...style,
      }}
      className={className}
      {...props}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accentColor,
      }} />

      <DetailDrawerCloseButton />

      {/* Identity */}
      <div style={{ padding: '26px 22px 22px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, paddingRight: 36 }}>
          {/* Icon */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: iBg,
              border: `1.5px solid ${accentColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: iconColor, fontSize: 22, fontWeight: 900,
            }}>
              {Icon ? <Icon size={21} /> : (String(title || '?')[0]?.toUpperCase())}
            </div>
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{
              fontSize: 19, fontWeight: 800,
              color: 'var(--text-900)', lineHeight: 1.2,
              letterSpacing: '-0.02em', marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{title}</div>
            {subtitle && (
              <div style={{
                fontSize: 11.5, color: 'var(--text-500)',
                fontWeight: 600, marginBottom: badge ? 10 : 0,
                letterSpacing: '0.02em',
              }}>{subtitle}</div>
            )}
            {badge && <div style={{ marginTop: 6 }}>{badge}</div>}
          </div>
        </div>

        {/* Children (e.g. actions) */}
        {children}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)' }} />
    </div>
  )
}

export function DetailDrawerActions({ children, className = '', style, ...props }) {
  if (!children) return null
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, ...style }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export function DetailDrawerBody({ children, className = '', style, ...props }) {
  return (
    <div
      style={{
        flex: 1, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px 14px 44px',
        display: 'flex', flexDirection: 'column', gap: 16,
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export function DetailDrawerSection({ label, single = false, children, className = '', style, ...props }) {
  const { accentColor = '#6366f1' } = useDetailDrawerContext()

  return (
    <div style={style} className={className} {...props}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 8, paddingLeft: 2,
        }}>
          <div style={{
            width: 3, height: 12, borderRadius: 2,
            background: accentColor,
          }} />
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: accentColor,
          }}>{label}</span>
        </div>
      )}

      <div style={{
        background: 'var(--bg-page)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 13,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: single ? '1fr' : 'repeat(2, 1fr)',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function DetailDrawerField({
  label,
  value,
  node,
  mono = false,
  full = false,
  children,
  isLast = false,
  isEven = false,
  className = '',
  style,
  ...props
}) {
  const content = children ?? node ?? (value !== null && value !== undefined ? String(value) : null)
  if (content === null || content === undefined || (typeof content === 'string' && content.trim() === '')) {
    return null
  }

  return (
    <div
      style={{
        ...(full ? { gridColumn: '1 / -1' } : {}),
        padding: '11px 15px',
        borderBottom: !isLast ? '1px solid var(--border-subtle)' : 'none',
        borderRight: (!full && isEven && !isLast) ? '1px solid var(--border-subtle)' : 'none',
        ...style,
      }}
      className={className}
      {...props}
    >
      {label && (
        <div style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-400)',
          marginBottom: 4,
        }}>
          {label}
        </div>
      )}
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-800)',
        fontFamily: mono ? '"SF Mono","Fira Code",monospace' : 'inherit',
        wordBreak: 'break-word', lineHeight: 1.5,
      }}>
        {content}
      </div>
    </div>
  )
}

/* ── Main Component (Supports both Compound & Legacy Props) ──────────────── */

export default function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor = '#818cf8',
  badge,
  groups = [],
  onEdit,
  onDelete,
  onPdf,
  canEdit = true,
  canDelete = true,
  accentColor = '#6366f1',
  extraActions,
  children,
}) {
  const { isMobile } = useDeviceView()

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const hasLegacyProps = Boolean(title || subtitle || groups.length > 0 || onEdit || onDelete || onPdf || extraActions)

  return createPortal(
    <AnimatePresence>
      {open && (
        <DetailDrawerContext.Provider value={{ open, onClose, accentColor }}>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,4,16,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Centering / Bottom Sheet wrapper */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 301,
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              padding: isMobile ? 0 : '24px 16px',
            }}
            onClick={onClose}
          >
            {/* Panel card */}
            <motion.div
              key="drawer-panel"
              initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              role="dialog"
              aria-modal="true"
              aria-label={title || 'รายละเอียด'}
              style={{
                width: isMobile ? '100%' : 560,
                maxWidth: '100%',
                maxHeight: isMobile ? '90vh' : '100%',
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg-card)',
                borderRadius: isMobile ? '28px 28px 0 0' : 20,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-modal)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Native iOS/Android Drag Handle Pill */}
              {isMobile && (
                <div className="pt-3 pb-1 flex-shrink-0 flex justify-center cursor-pointer" onClick={onClose}>
                  <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              )}
          {children && !hasLegacyProps ? (
            children
          ) : (
            <>
              {/* ── Hero Header ── */}
              <DetailDrawerHeader
                title={title}
                subtitle={subtitle}
                icon={Icon}
                iconBg={iconBg}
                iconColor={iconColor}
                badge={badge}
              >
                {/* Action buttons */}
                {(((canEdit || canDelete) && (onEdit || onDelete)) || onPdf || extraActions) && (
                  <DetailDrawerActions>
                    {onPdf && (
                      <button
                        type="button"
                        onClick={onPdf}
                        style={{
                          flex: onEdit ? 'none' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 16px',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                          letterSpacing: '0.01em',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.5)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.35)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="ดูเอกสาร PDF และสั่งพิมพ์"
                        aria-label="ดูเอกสาร PDF และสั่งพิมพ์"
                      >
                        <Printer size={12} /> PDF / พิมพ์
                      </button>
                    )}
                    {canEdit && onEdit && (
                      <button
                        type="button"
                        onClick={onEdit}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 0',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.10)',
                          boxShadow: '0 2px 8px rgba(10,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                          letterSpacing: '0.01em',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #243660 0%, #1a2745 100%)'
                          e.currentTarget.style.boxShadow = '0 4px 18px rgba(10,20,50,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,20,50,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="แก้ไขข้อมูล"
                        aria-label="แก้ไขข้อมูล"
                      >
                        <Pencil size={12} /> แก้ไข
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        type="button"
                        onClick={onDelete}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '9px 18px',
                          borderRadius: 11, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 160ms',
                          background: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 2px 8px rgba(220,38,38,0.30)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.45)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,38,38,0.30)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="ลบข้อมูล"
                        aria-label="ลบข้อมูล"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {extraActions}
                  </DetailDrawerActions>
                )}
              </DetailDrawerHeader>

              {/* ── Scrollable Body ── */}
              <DetailDrawerBody>
                {groups.map((group, gi) => {
                  const visible = (group.fields || []).filter(f =>
                    f.node != null
                      ? true
                      : f.value !== null && f.value !== undefined && String(f.value).trim() !== ''
                  )
                  if (visible.length === 0) return null

                  return (
                    <DetailDrawerSection key={gi} label={group.label} single={group.single}>
                      {visible.map((f, fi) => (
                        <DetailDrawerField
                          key={fi}
                          label={f.label}
                          value={f.value}
                          node={f.node}
                          mono={f.mono}
                          full={f.full}
                          isLast={fi === visible.length - 1}
                          isEven={fi % 2 === 0}
                        />
                      ))}
                    </DetailDrawerSection>
                  )
                })}
                {/* Allow custom child elements in body alongside groups */}
                {children}
              </DetailDrawerBody>
            </>
          )}
        </motion.div>
      </div>
        </DetailDrawerContext.Provider>
      )}
    </AnimatePresence>,
    document.body
  )
}

DetailDrawer.Header = DetailDrawerHeader
DetailDrawer.Actions = DetailDrawerActions
DetailDrawer.Body = DetailDrawerBody
DetailDrawer.Section = DetailDrawerSection
DetailDrawer.Group = DetailDrawerSection // Alias
DetailDrawer.Field = DetailDrawerField
DetailDrawer.CloseButton = DetailDrawerCloseButton
