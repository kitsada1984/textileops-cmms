import clsx from 'clsx'
import gemmaLogo from './assets/logo-gemma.png'
import { X, BookOpen, ExternalLink, Smartphone } from 'lucide-react'
import { APP_VERSION } from './version'
import { NAV_SECTIONS } from './appNav'
import { AppSideNav } from './AppSideNav'
import { AppSideFooter } from './AppSideFooter'

// App sidebar (overlay + nav + footer) moved verbatim from AppInner (props only).
export function AppSidebar({ dark, sideOpen, setSideOpen, setPwaModalOpen, user, t, logout, sidebarBg }) {
  return (
    <>
      {sideOpen && (
        <div className="fixed inset-0 z-20 lg:hidden"
          style={{background:'rgba(15,23,42,0.7)',backdropFilter:'blur(8px)'}}
          onClick={() => setSideOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col transition-all duration-300',
        sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} style={{
        width: 252,
        background: sidebarBg,
        borderRight: dark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        boxShadow: dark
          ? '4px 0 32px rgba(0,0,0,0.35)'
          : '1px 0 20px rgba(15,23,42,0.04)',
      }}>

        {/* Logo */}
        <div style={{
          padding: '18px 16px 15px',
          borderBottom: dark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              {dark && <div style={{
                position:'absolute', inset:-6, borderRadius:16,
                background:'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
                pointerEvents:'none',
              }} />}
              <img src={gemmaLogo} alt="Gemma Knits" style={{
                width: 44, height: 44, objectFit: 'contain', borderRadius: 12, position:'relative',
                filter: dark ? 'drop-shadow(0 4px 16px rgba(59,130,246,0.3))' : 'none',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em',
                color: dark ? '#f8fafc' : '#0f172a',
                lineHeight: 1.2,
              }}>Gemma Knits</div>
              <div style={{
                fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
                color: dark ? '#60a5fa' : '#2563eb',
                marginTop: 2.5,
              }}>CMMS Platform · {APP_VERSION}</div>
            </div>
            <button className="lg:hidden" onClick={() => setSideOpen(false)}
              title="ปิดเมนูหลัก"
              aria-label="ปิดเมนูหลัก"
              style={{ color: dark ? 'rgba(248,250,252,0.4)' : '#64748b', padding: 4 }}>
              <X size={14}/>
            </button>
          </div>
        </div>

        {/* Nav */}
        <AppSideNav dark={dark} user={user} t={t} setSideOpen={setSideOpen} />

        {/* User Manual Link in Sidebar */}
        <div style={{ padding: '0 12px 6px', flexShrink: 0 }}>
          <a
            href="/manual/"
            target="_blank"
            rel="noopener noreferrer"
            title="เปิดดูคู่มือการใช้งานระบบ (Web & PDF)"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 12,
              background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
              border: dark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #a7f3d0',
              color: dark ? '#34d399' : '#059669',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 150ms',
            }}
          >
            <BookOpen size={14} />
            <span>คู่มือการใช้งานระบบ</span>
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </a>
        </div>

        {/* PWA Mobile App Quick Install in Sidebar */}
        <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              setSideOpen(false)
              setPwaModalOpen(true)
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 12,
              background: dark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
              border: dark ? '1px solid rgba(59,130,246,0.25)' : '1px solid #dbeafe',
              color: dark ? '#60a5fa' : '#2563eb',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <Smartphone size={14} />
            <span>ติดตั้งแอปบนมือถือ</span>
          </button>
        </div>

        {/* User footer */}
        <AppSideFooter dark={dark} user={user} logout={logout} />
      </aside>
    </>
  )
}
