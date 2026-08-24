import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, Printer } from 'lucide-react'

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
}) {
  const iBg = iconBg ?? `${accentColor}28`

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,4,16,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 280ms ease',
      }} />

      {/* Centering wrapper */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 301,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 220ms ease',
      }} onClick={onClose}>

      {/* Panel card */}
      <div style={{
        width: 560, maxWidth: '100%',
        maxHeight: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-modal)',
        transform: open ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(18px)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
      }} onClick={e => e.stopPropagation()}>

        {/* ── Hero Header ── */}
        <div style={{
          flexShrink: 0, position: 'relative',
          background: 'var(--bg-card)',
        }}>
          {/* Top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: accentColor,
          }} />

          {/* Close button */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 30, height: 30, borderRadius: 9,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-500)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
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
          >
            <X size={13} />
          </button>

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

            {/* Action buttons */}
            {((canEdit || canDelete) && (onEdit || onDelete)) || onPdf || extraActions ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                {onPdf && (
                  <button onClick={onPdf} style={{
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
                  >
                    <Printer size={12} /> PDF / พิมพ์
                  </button>
                )}
                {canEdit && onEdit && (
                  <button onClick={onEdit} style={{
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
                  >
                    <Pencil size={12} /> แก้ไข
                  </button>
                )}
                {canDelete && onDelete && (
                  <button onClick={onDelete} style={{
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
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {extraActions}
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* ── Scrollable body ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '18px 16px 44px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {groups.map((group, gi) => {
            const visible = (group.fields || []).filter(f =>
              f.node != null
                ? true
                : f.value !== null && f.value !== undefined && String(f.value).trim() !== ''
            )
            if (visible.length === 0) return null

            return (
              <div key={gi}>
                {/* Section label */}
                {group.label && (
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
                    }}>{group.label}</span>
                  </div>
                )}

                {/* Group card */}
                <div style={{
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 13,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: group.single ? '1fr' : 'repeat(2, 1fr)',
                  }}>
                    {visible.map((f, fi) => (
                      <div key={fi} style={{
                        ...(f.full ? { gridColumn: '1 / -1' } : {}),
                        padding: '11px 15px',
                        borderBottom: fi < visible.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        borderRight: (!f.full && fi % 2 === 0 && fi < visible.length - 1)
                          ? '1px solid var(--border-subtle)' : 'none',
                      }}>
                        <div style={{
                          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em',
                          textTransform: 'uppercase', color: 'var(--text-400)',
                          marginBottom: 4,
                        }}>{f.label}</div>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--text-800)',
                          fontFamily: f.mono ? '"SF Mono","Fira Code",monospace' : 'inherit',
                          wordBreak: 'break-word', lineHeight: 1.5,
                        }}>
                          {f.node ?? String(f.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </>,
    document.body
  )
}
