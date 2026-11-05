import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { NAV_SECTIONS } from './appNav'
import { canAccess } from './contexts/AuthContext'

// Sidebar nav moved verbatim from AppSidebar (props only).
export function AppSideNav({ dark, user, t, setSideOpen }) {
  return (
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
  )
}
