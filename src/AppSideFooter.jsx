import { LogOut } from 'lucide-react'

// Sidebar user footer moved verbatim from AppSidebar (props only).
export function AppSideFooter({ dark, user, logout }) {
  return (
        <div style={{
          padding: '12px 14px 16px',
          borderTop: dark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: user?.line_picture_url
                ? 'transparent'
                : dark
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.1))'
                  : 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.06))',
              border: user?.line_picture_url
                ? '1.5px solid #06C755'
                : dark ? '1px solid rgba(59,130,246,0.32)' : '1px solid rgba(37,99,235,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12.5, fontWeight: 800,
              color: dark ? '#60a5fa' : '#2563eb',
              overflow: 'hidden',
            }}>
              {user?.line_picture_url ? (
                <img src={user.line_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user?.username || '?')[0].toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                color: dark ? '#f8fafc' : '#0f172a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.full_name || user?.line_display_name || user?.username}
              </div>
              <div style={{
                fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                color: dark ? '#94a3b8' : '#64748b',
                marginTop: 2,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{user?.role || 'user'}</span>
                {user?.line_user_id && (
                  <span style={{ color: '#06C755', fontSize: 9, fontWeight: 800 }}>• LINE</span>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: dark ? 'rgba(248,250,252,0.35)' : '#94a3b8',
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = dark ? 'rgba(248,250,252,0.35)' : '#94a3b8'
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <LogOut size={13}/>
            </button>
          </div>
        </div>
  )
}
