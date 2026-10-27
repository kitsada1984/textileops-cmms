import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  Cpu,
  LayoutGrid,
  Disc,
  Calendar,
  FileText,
  Layers,
  Package,
  ShoppingCart,
  ArrowLeftRight,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  Database,
  Smartphone,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, canAccess } from '../../contexts/AuthContext'
import useDeviceView from '../../hooks/useDeviceView'

export default function MobileBottomNav({ onOpenPwaModal }) {
  const { user, logout } = useAuth()
  const { isMobile } = useDeviceView()
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Close bottom sheet when route changes
  useEffect(() => {
    setSheetOpen(false)
  }, [location.pathname])

  // Close bottom sheet on Escape key
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  // Prevent background scroll when bottom sheet is open
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  // 5 Main Tabs for iOS / Android Bottom Tab Bar
  const mainTabs = [
    { to: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, end: true, permKey: 'dashboard' },
    { to: '/repair-requests', label: 'แจ้งซ่อม', icon: Wrench, permKey: 'workorders' },
    { to: '/workorders', label: 'ใบสั่งงาน', icon: ClipboardList, permKey: 'workorders' },
    { to: '/machines', label: 'เครื่องจักร', icon: Cpu, permKey: 'machines' },
  ]

  const visibleMainTabs = mainTabs.filter((tab) => canAccess(user, tab.permKey))

  // All Other Apps for Bottom Sheet App Launcher
  const launcherSections = [
    {
      title: 'งานปฏิบัติการ & ซ่อมบำรุง',
      items: [
        { to: '/cylinders', label: 'กระบอกสูบ', icon: Disc, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', permKey: 'cylinders' },
        { to: '/pm', label: 'แผน PM', icon: Calendar, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', permKey: 'pm' },
        { to: '/design-bom', label: 'Design / BOM', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', permKey: 'designbom' },
        { to: '/needle-stock', label: 'สต็อกเข็ม', icon: Layers, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', permKey: 'needlestock' },
      ],
    },
    {
      title: 'คลังพัสดุ & จัดซื้อ',
      items: [
        { to: '/spareparts', label: 'อะไหล่', icon: Package, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', permKey: 'spareparts' },
        { to: '/purchasing', label: 'จัดซื้อ', icon: ShoppingCart, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', permKey: 'purchasing' },
        { to: '/stock', label: 'รับ-จ่ายสต็อก', icon: ArrowLeftRight, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', permKey: 'stock' },
      ],
    },
    {
      title: 'รายงาน & ระบบงาน',
      items: [
        { to: '/reports', label: 'รายงานวิเคราะห์', icon: BarChart3, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', permKey: 'reports' },
        { to: '/logs', label: 'ประวัติระบบ', icon: ScrollText, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', permKey: 'logs' },
        { to: '/users', label: 'ผู้ใช้งาน', icon: Users, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', permKey: 'users' },
        { to: '/settings', label: 'ตั้งค่าระบบ', icon: Settings, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', permKey: 'settings' },
        { to: '/d1-test', label: 'D1 Database', icon: Database, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20', permKey: 'settings' },
      ],
    },
  ]

  const isOtherActive =
    !mainTabs.some((tab) => (tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to))) &&
    location.pathname !== '/'

  return (
    <>
      {/* ── Native iOS / Android Style Bottom Tab Bar ────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 max-w-full lg:max-w-[390px] mx-auto bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-2xl transition-all duration-300 select-none"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
        }}
      >
        <div className="flex items-center justify-around py-1 px-1 sm:px-2">
          {visibleMainTabs.map(({ to, label, icon: Icon, end }) => {
            const isTabActive = end ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 flex-1 min-h-[50px] relative active:scale-95 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active pill background effect */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-x-1 inset-y-1 bg-blue-50/80 dark:bg-blue-950/60 rounded-xl -z-10 border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={20} className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    <span className="text-[10.5px] tracking-tight whitespace-nowrap">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* 5th Tab: "เมนูอื่น" -> Triggers Bottom Sheet App Launcher */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 flex-1 min-h-[50px] relative active:scale-95 ${
              sheetOpen || isOtherActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {(sheetOpen || isOtherActive) && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-x-1 inset-y-1 bg-indigo-50/80 dark:bg-indigo-950/60 rounded-xl -z-10 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <LayoutGrid size={20} className={`mb-0.5 transition-transform duration-200 ${sheetOpen || isOtherActive ? 'scale-110' : ''}`} />
            <span className="text-[10.5px] tracking-tight whitespace-nowrap">เมนูอื่น</span>
          </button>
        </div>
      </nav>

      {/* ── Native iOS / Android Style Bottom Sheet App Launcher ───────── */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              key="launcher-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Bottom Sheet Panel */}
            <motion.div
              key="launcher-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 w-full max-w-full lg:max-w-[390px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
              }}
            >
              {/* iOS / Android Drag Handle Pill */}
              <div className="pt-3 pb-2 flex-shrink-0 flex justify-center cursor-pointer" onClick={() => setSheetOpen(false)}>
                <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <LayoutGrid size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">เมนูทั้งหมด</h3>
                    <p className="text-[10px] text-slate-400">เข้าถึงทุกฟังก์ชันของระบบ TextileOps</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center active:scale-90 transition-transform"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content: App Springboard Grid */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {launcherSections.map((sec, idx) => {
                  const visible = sec.items.filter((item) => canAccess(user, item.permKey))
                  if (visible.length === 0) return null

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        {sec.title}
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {visible.map(({ to, label, icon: Icon, color }) => {
                          const isActive = location.pathname.startsWith(to)
                          return (
                            <NavLink
                              key={to}
                              to={to}
                              onClick={() => setSheetOpen(false)}
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-150 active:scale-95 text-center ${
                                isActive
                                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 shadow-sm'
                                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2 border ${color} shadow-sm`}>
                                <Icon size={20} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-1">
                                {label}
                              </span>
                            </NavLink>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Quick App Install Button */}
                {onOpenPwaModal && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSheetOpen(false)
                        onOpenPwaModal?.()
                      }}
                      className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
                    >
                      <Smartphone size={15} />
                      <span>ติดตั้งแอปบนหน้าจอมือถือ (PWA)</span>
                    </button>
                  </div>
                )}

                {/* User Profile Footer Card in Bottom Sheet */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-sm overflow-hidden">
                      {user?.line_picture_url ? (
                        <img src={user.line_picture_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user?.username || '?')[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user?.full_name || user?.line_display_name || user?.username}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase font-semibold">
                        <span>{user?.role || 'user'}</span>
                        {user?.line_user_id && <span className="text-emerald-500 font-bold">• LINE</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetOpen(false)
                      logout?.()
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-all flex items-center gap-1 text-xs font-bold"
                    title="ออกจากระบบ"
                  >
                    <LogOut size={14} />
                    <span>ออก</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
