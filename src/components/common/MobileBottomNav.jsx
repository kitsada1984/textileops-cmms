import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Cpu, ClipboardList, Calendar, Wrench, Menu } from 'lucide-react'

export default function MobileBottomNav({ onOpenMenu }) {
  const navItems = [
    { to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true },
    { to: '/machines', label: 'เครื่องจักร', icon: Cpu },
    { to: '/workorders', label: 'ใบสั่งงาน', icon: ClipboardList },
    { to: '/pm', label: 'แผน PM', icon: Calendar },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-slate-900/95 dark:bg-slate-900/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around py-1.5 px-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 flex-1 ${
                isActive
                  ? 'text-blue-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`
            }
          >
            <Icon size={18} className="mb-0.5" />
            <span className="text-[10px] tracking-tight">{label}</span>
          </NavLink>
        ))}

        {/* More / Menu Drawer toggle */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 font-medium transition-all flex-1"
        >
          <Menu size={18} className="mb-0.5" />
          <span className="text-[10px] tracking-tight">เมนูอื่น</span>
        </button>
      </div>
    </nav>
  )
}
