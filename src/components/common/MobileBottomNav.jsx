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
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-2xl safe-area-pb transition-colors duration-300">
      <div className="flex items-center justify-around py-1.5 px-1 sm:px-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 flex-1 min-h-[46px] select-none ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            <Icon size={19} className="mb-0.5" />
            <span className="text-[10px] tracking-tight whitespace-nowrap">{label}</span>
          </NavLink>
        ))}

        {/* More / Menu Drawer toggle */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-all flex-1 min-h-[46px] select-none"
        >
          <Menu size={19} className="mb-0.5" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">เมนูอื่น</span>
        </button>
      </div>
    </nav>
  )
}
