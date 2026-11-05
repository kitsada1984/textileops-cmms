import { Menu, Presentation, BookOpen, Download, RefreshCw, Sun, Moon, LogOut } from 'lucide-react'
import { APP_VERSION } from './version'
import { AppDeviceSimulator } from './AppDeviceSimulator'

// App top bar moved verbatim from AppInner (props only).
export function AppTopbar({ dark, setDark, setSideOpen, currentNav, t, user, simulatorMode, setSimulatorMode, autoDevice, setPwaModalOpen, handleForceUpdate, logout }) {
  return (
        <header className="px-2.5 sm:px-6" style={{
          height: 56,
          display: 'flex', alignItems: 'center', gap: 10,
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
          <button className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setSideOpen(true)}
            title="เปิดเมนูหลัก"
            aria-label="เปิดเมนูหลัก">
            <Menu size={20}/>
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {currentNav?.icon && (
              <div className="hidden sm:flex" style={{
                width: 32, height: 32, borderRadius: 10,
                background: dark ? 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.08))' : '#f1f5f9',
                border: dark ? '1px solid rgba(59,130,246,0.28)' : '1px solid #e2e8f0',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <currentNav.icon size={14} style={{ color: dark ? '#60a5fa' : '#2563eb' }}/>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-bold text-xs sm:text-sm" style={{
                lineHeight: 1.2,
                color: 'var(--text-900)', letterSpacing: '-0.015em',
              }}>
                {currentNav ? t(currentNav.key) : 'TextileOps'}
              </h1>
              <div className="hidden sm:block truncate" style={{ fontSize: 9.5, color: 'var(--text-400)', fontWeight: 500, letterSpacing: '0.04em' }}>
                TextileOps · CMMS {APP_VERSION}
              </div>
            </div>
          </div>

          {/* Right controls - Scrollable on narrow mobile screens without breaking header */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1 flex-nowrap min-w-0 flex-shrink"
            style={{
              marginLeft: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Tri-View Device Simulator Toggle (Auto / PC / Tablet / Mobile - ADR-0002) */}
            <AppDeviceSimulator dark={dark} simulatorMode={simulatorMode} setSimulatorMode={setSimulatorMode} autoDevice={autoDevice} />

            {/* Executive Presentation Button */}
            <button
              type="button"
              onClick={() => window.open('/executive-presentation', '_blank')}
              title="เปิดหน้าแลนดิ้งเพจนำเสนอผู้บริหาร (Executive Landing Page)"
              aria-label="เปิดหน้าแลนดิ้งเพจนำเสนอผู้บริหาร"
              className="px-2 sm:px-3 active:scale-95 transition-all flex-shrink-0"
              style={{
                height: 30,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: 11.5,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: '1px solid rgba(56,189,248,0.35)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15,23,42,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <Presentation size={13} />
              <span className="hidden lg:inline">หน้านำเสนอ</span>
            </button>

            {/* User Manual Button */}
            <a
              href="/manual/"
              target="_blank"
              rel="noopener noreferrer"
              title="เปิดดูคู่มือการใช้งานระบบ (User Manual & PDF)"
              aria-label="เปิดดูคู่มือการใช้งานระบบ"
              className="px-2 sm:px-3 active:scale-95 transition-all flex-shrink-0"
              style={{
                height: 30,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 11.5,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              <BookOpen size={13} />
              <span className="hidden sm:inline">คู่มือ</span>
            </a>

            {/* PWA Install Button */}
            <button
              type="button"
              onClick={() => setPwaModalOpen(true)}
              title="ติดตั้งแอป TextileOps บนมือถือ (PWA)"
              aria-label="ติดตั้งแอป TextileOps บนมือถือ (PWA)"
              className="px-2 sm:px-3 active:scale-95 transition-all flex-shrink-0"
              style={{
                height: 30,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 11.5,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              <Download size={13} />
              <span className="hidden sm:inline">ติดตั้งแอป</span>
            </button>

            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--text-500)',
              display: 'none',
              letterSpacing: '0.01em',
            }} className="md:block flex-shrink-0">
              {user?.full_name || user?.line_display_name || user?.username}
            </div>

            <div className="md:block hidden flex-shrink-0" style={{
              width: 1,
              height: 18,
              background: 'var(--border)',
              marginLeft: 2,
              marginRight: 2,
            }} />

            {/* Force Update / Clear Cache */}
            <button
              type="button"
              onClick={handleForceUpdate}
              title="อัปเดตระบบเป็นเวอร์ชันล่าสุด / ล้างแคช"
              aria-label="อัปเดตระบบเป็นเวอร์ชันล่าสุดและล้างแคช"
              className="active:scale-95 transition-all"
              style={{
                width: 30, height: 30, borderRadius: 10,
                background: dark ? '#1e293b' : '#f8fafc',
                color: dark ? '#94a3b8' : '#64748b',
                border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(15,23,42,0.04)',
                flexShrink: 0,
              }}
            >
              <RefreshCw size={13} />
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setDark(d => !d)}
              title={dark ? 'โหมดสว่าง' : 'โหมดมืด'}
              aria-label={dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              className="active:scale-95 transition-all"
              style={{
                width: 30, height: 30, borderRadius: 10,
                background: dark ? '#1e293b' : '#f8fafc',
                color: dark ? '#60a5fa' : '#2563eb',
                border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(15,23,42,0.04)',
                flexShrink: 0,
              }}
            >
              {dark ? <Sun size={13}/> : <Moon size={13}/>}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              className="p-1.5 sm:px-2.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold flex-shrink-0"
              title={t('logout')}
              style={{
                height: 30,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <LogOut size={13}/>
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </header>
  )
}
