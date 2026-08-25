import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { APP_VERSION } from './version'
import Login from './pages/Login'
import RepairPage from './pages/RepairPage'
import gemmaLogo from './assets/logo-gemma.png'
import {
  LayoutDashboard, Cpu, Disc, ClipboardList, Calendar,
  Package, ShoppingCart, BarChart3, Settings, Menu, X,
  ScrollText, ArrowLeftRight, Users, Layers, Sun, Moon, LogOut, Wrench,
  FileText, Monitor, Smartphone, Target,
} from 'lucide-react'
import clsx from 'clsx'
import { LanguageProvider, useT } from './contexts/LanguageContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider, useAuth, canAccess } from './contexts/AuthContext'
import { WebBuilderConfigProvider } from './contexts/WebBuilderConfigContext'

import Dashboard     from './pages/Dashboard'
import Machines      from './pages/Machines'
import Cylinders     from './pages/Cylinders'
import WorkOrders    from './pages/WorkOrders'
import PMPlan        from './pages/PMPlan'
import PMLog         from './pages/PMLog'
import SpareParts    from './pages/SpareParts'
import Purchasing    from './pages/Purchasing'
import Reports       from './pages/Reports'
import SettingsPage  from './pages/SettingsPage'
import Logs          from './pages/Logs'
import StockMovement from './pages/StockMovement'
import UsersPage     from './pages/Users'
import WebBuilder       from './pages/WebBuilder'
import RepairRequests  from './pages/RepairRequests'
import DesignBom from './pages/DesignBom'

const NAV_SECTIONS = [
  {
    labelKey: 'nav_sec_overview',
    items: [
      { to: '/',           icon: LayoutDashboard, key: 'nav_dashboard',  permKey: 'dashboard' },
    ]
  },
  {
    labelKey: 'nav_sec_operations',
    items: [
      { to: '/machines',   icon: Cpu,             key: 'nav_machines',   permKey: 'machines' },
      { to: '/cylinders',  icon: Disc,            key: 'nav_cylinders',  permKey: 'cylinders' },
      { to: '/workorders',    icon: ClipboardList,   key: 'nav_workorders',    permKey: 'workorders' },
      { to: '/pm',            icon: Calendar,        key: 'nav_pm',            permKey: 'pm' },
      { to: '/design-bom',    icon: FileText,        key: 'nav_design_bom',    permKey: 'designbom' },
    ]
  },
  {
    labelKey: 'nav_sec_inventory',
    items: [
      { to: '/spareparts', icon: Package,         key: 'nav_spareparts', permKey: 'spareparts' },
      { to: '/purchasing', icon: ShoppingCart,    key: 'nav_purchasing', permKey: 'purchasing' },
      { to: '/stock',      icon: ArrowLeftRight,  key: 'nav_stock',      permKey: 'stock' },
    ]
  },
  {
    labelKey: 'nav_sec_analytics',
    items: [
      { to: '/reports',    icon: BarChart3,       key: 'nav_reports',    permKey: 'reports' },
      { to: '/logs',       icon: ScrollText,      key: 'nav_logs',       permKey: 'logs' },
    ]
  },
  {
    labelKey: 'nav_sec_system',
    items: [
      { to: '/users',      icon: Users,           key: 'nav_users',      permKey: 'users' },
      { to: '/settings',   icon: Settings,        key: 'nav_settings',   permKey: 'settings' },
    ]
  },
]

function PageRoutes() {
  return (
    <Routes>
      <Route path="/"           element={<Dashboard />} />
      <Route path="/machines"   element={<Machines />} />
      <Route path="/cylinders"  element={<Cylinders />} />
      <Route path="/workorders"      element={<WorkOrders />} />
      <Route path="/repair-requests" element={<WorkOrders defaultTab="repair_requests" />} />
      <Route path="/pm"           element={<PMPlan />} />
      <Route path="/pm-log"       element={<PMPlan defaultTab="log" />} />
      <Route path="/center-check" element={<PMPlan defaultTab="center_check" />} />
      <Route path="/design-bom"   element={<DesignBom />} />
      <Route path="/spareparts" element={<SpareParts />} />
      <Route path="/purchasing" element={<Purchasing />} />
      <Route path="/stock"      element={<StockMovement />} />
      <Route path="/reports"    element={<Reports />} />
      <Route path="/logs"       element={<Logs />} />
      <Route path="/users"      element={<UsersPage />} />
      <Route path="/webbuilder" element={<WebBuilder />} />
      <Route path="/settings"   element={<SettingsPage />} />
    </Routes>
  )
}

function AppInner() {
  const { t } = useT()
  const { user, logout } = useAuth()
  const [sideOpen, setSideOpen] = useState(false)
  const [dark, setDark]         = useState(() => localStorage.getItem('theme') !== 'light')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('app_view_mode') || 'web')
  const location = useLocation()

  useEffect(() => {
    const html = document.documentElement
    if (dark) { html.classList.add('dark');    localStorage.setItem('theme', 'dark') }
    else       { html.classList.remove('dark'); localStorage.setItem('theme', 'light') }
  }, [dark])

  useEffect(() => {
    localStorage.setItem('app_view_mode', viewMode)
  }, [viewMode])

  if (user === undefined) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{background:'linear-gradient(145deg,#070b14 0%,#0f172a 50%,#070b14 100%)'}}>
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:550, height:550, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
        }} />
      </div>
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div style={{ position:'relative' }}>
          <div style={{
            position:'absolute', inset:-14, borderRadius:32,
            background:'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
          }} />
          <img src={gemmaLogo} alt="Gemma Knits" style={{
            width: 80, height: 80, objectFit: 'contain', borderRadius: 20, position:'relative',
            filter:'drop-shadow(0 10px 30px rgba(59,130,246,0.38))',
          }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div style={{ fontWeight:800, fontSize:16, color:'#f8fafc', letterSpacing:'-0.02em' }}>
            Gemma Knits
          </div>
          <div style={{
            fontSize:9.5, letterSpacing:'0.2em', color:'#60a5fa',
            textTransform:'uppercase', fontWeight:700,
          }}>
            CMMS Platform
          </div>
        </div>
        <div className="spinner-gemini" />
      </div>
    </div>
  )
  if (!user) return <Login />

  const allItems = NAV_SECTIONS.flatMap(s => s.items)
  const currentNav = [...allItems].sort((a, b) => b.to.length - a.to.length).find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )

  const sidebarBg = dark
    ? '#0f172a'
    : '#ffffff'

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'var(--bg-page)'}}>
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
              style={{ color: dark ? 'rgba(248,250,252,0.4)' : '#64748b', padding: 4 }}>
              <X size={14}/>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 10px' }}>
          {NAV_SECTIONS.map((section, si) => {
            const visibleItems = section.items.filter(item => canAccess(user, item.permKey))
            if (visibleItems.length === 0) return null
            return (
              <div key={si}>
                <div className="nav-section-label" style={{
                  color: dark ? 'rgba(148,163,184,0.6)' : '#64748b',
                }}>
                  {t(section.labelKey)}
                </div>
                {visibleItems.map(({ to, icon: Icon, key }) => (
                  <NavLink key={to} to={to} end={to === '/' || to === '/pm'}
                    className={({ isActive }) => clsx(
                      dark ? 'sidebar-link' : 'sidebar-link-light',
                      isActive && 'active'
                    )}
                    onClick={() => setSideOpen(false)}>
                    <Icon size={14} style={{ flexShrink: 0 }}/>
                    <span style={{ flex: 1 }}>{t(key)}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '12px 14px 16px',
          borderTop: dark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: dark
                ? 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.1))'
                : 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.06))',
              border: dark ? '1px solid rgba(59,130,246,0.32)' : '1px solid rgba(37,99,235,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12.5, fontWeight: 800,
              color: dark ? '#60a5fa' : '#2563eb',
            }}>
              {(user?.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                color: dark ? '#f8fafc' : '#0f172a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{user?.full_name || user?.username}</div>
              <div style={{
                fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                color: dark ? '#94a3b8' : '#64748b',
                marginTop: 2,
              }}>{user?.role || 'user'}</div>
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
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header style={{
          height: 56,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '0 24px',
          flexShrink: 0,
          background: 'var(--bg-header)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: dark
            ? '0 1px 0 rgba(51,65,85,0.5), 0 4px 20px rgba(0,0,0,0.3)'
            : '0 1px 0 var(--border-subtle), 0 2px 12px rgba(15,23,42,0.03)',
          transition: 'background 300ms',
          position: 'relative',
          zIndex: 10,
        }}>
          <button className="lg:hidden" onClick={() => setSideOpen(true)}
            style={{ color: 'var(--text-500)', padding: 2 }}>
            <Menu size={20}/>
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentNav?.icon && (
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: dark ? 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.08))' : '#f1f5f9',
                border: dark ? '1px solid rgba(59,130,246,0.28)' : '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <currentNav.icon size={14} style={{ color: dark ? '#60a5fa' : '#2563eb' }}/>
              </div>
            )}
            <div>
              <h1 style={{
                fontWeight: 700, fontSize: 14.5, lineHeight: 1.2,
                color: 'var(--text-900)', letterSpacing: '-0.015em',
              }}>
                {currentNav ? t(currentNav.key) : 'TextileOps'}
              </h1>
              <div style={{ fontSize: 9.5, color: 'var(--text-400)', fontWeight: 500, letterSpacing: '0.04em' }}>
                TextileOps · CMMS {APP_VERSION}
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View mode toggle (Web / Mobile) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: dark ? '#1e293b' : '#f1f5f9',
              borderRadius: 12,
              padding: 2.5,
              border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
            }}>
              <button
                type="button"
                onClick={() => setViewMode('web')}
                title="แสดงผลแบบเว็บ (Web/Desktop Mode)"
                style={{
                  height: 28,
                  padding: '0 9px',
                  borderRadius: 9,
                  background: viewMode === 'web' ? (dark ? '#3b82f6' : '#2563eb') : 'transparent',
                  color: viewMode === 'web' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  fontWeight: viewMode === 'web' ? 700 : 500,
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: viewMode === 'web' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                }}
              >
                <Monitor size={13} />
                <span className="hidden sm:inline">เว็บ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                title="แสดงผลแบบมือถือ (Mobile Mode)"
                style={{
                  height: 28,
                  padding: '0 9px',
                  borderRadius: 9,
                  background: viewMode === 'mobile' ? (dark ? '#3b82f6' : '#2563eb') : 'transparent',
                  color: viewMode === 'mobile' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  fontWeight: viewMode === 'mobile' ? 700 : 500,
                  fontSize: 11.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: viewMode === 'mobile' ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                }}
              >
                <Smartphone size={13} />
                <span className="hidden sm:inline">มือถือ</span>
              </button>
            </div>

            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--text-500)',
              display: 'none',
              letterSpacing: '0.01em',
            }} className="sm:block">
              {user?.full_name || user?.username}
            </div>

            <div className="sm:block hidden" style={{
              width: 1,
              height: 18,
              background: 'var(--border)',
              marginLeft: 2,
              marginRight: 2,
            }} />

            {/* Theme toggle */}
            <button onClick={() => setDark(d => !d)}
              title={dark ? 'โหมดสว่าง' : 'โหมดมืด'}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: dark ? '#1e293b' : '#f8fafc',
                color: dark ? '#60a5fa' : '#2563eb',
                border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer', transition: 'all 200ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(15,23,42,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(18deg) scale(1.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              {dark ? <Sun size={14}/> : <Moon size={14}/>}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                height: 34, padding: '0 12px', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                color: 'var(--text-500)',
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-500)'
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <X size={12}/> {t('logout')}
            </button>
          </div>
        </header>

        {/* Page content */}
        {viewMode === 'mobile' ? (
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 flex justify-center items-start bg-slate-100/70 dark:bg-slate-950/70">
            <div
              className="w-full max-w-[430px] min-h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 flex flex-col transition-all duration-300 my-auto"
              style={{
                background: 'var(--bg-page)',
                boxShadow: dark
                  ? '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(51,65,85,0.7)'
                  : '0 20px 45px rgba(15,23,42,0.12), 0 0 0 1px rgba(226,232,240,0.8)',
              }}
            >
              {/* Simulated Phone Top Notch & Status */}
              <div className="h-6 flex items-center justify-between px-5 text-[10px] font-bold text-slate-400 select-none bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                <span>09:41</span>
                <div className="w-16 h-3 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
                <span>100% 🔋</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                <PageRoutes />
              </div>
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <PageRoutes />
          </main>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <WebBuilderConfigProvider>
            <Routes>
              <Route path="/repair/:serial" element={<RepairPage />} />
              <Route path="/*" element={<AppInner />} />
            </Routes>
          </WebBuilderConfigProvider>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}
