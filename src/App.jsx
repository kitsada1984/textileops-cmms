import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, Suspense } from 'react'
import { ShieldAlert } from 'lucide-react'
import { LanguageProvider, useT } from './contexts/LanguageContext'
import { DeviceViewProvider, useDeviceView } from './contexts/DeviceViewContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider, useAuth, canAccess } from './contexts/AuthContext'
import { WebBuilderConfigProvider } from './contexts/WebBuilderConfigContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import RouteLoadingFallback from './components/common/RouteLoadingFallback'
import PWAInstallPrompt from './components/ui/PWAInstallPrompt'
import MobileBottomNav from './components/common/MobileBottomNav'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { queryClient } from './lib/queryClient'
import { lazyWithRetry } from './utils/lazyWithRetry'
import { getGeminiConfig } from './utils/geminiVision'
import { ALL_NAV_ITEMS } from './appNav'
import { AppSplash } from './AppSplash'
import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'
import { AppContent } from './AppContent'

const Login         = lazyWithRetry(() => import('./pages/Login'), 'Login')
const RepairPage    = lazyWithRetry(() => import('./pages/RepairPage'), 'RepairPage')
const Dashboard     = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard')
const Machines      = lazyWithRetry(() => import('./pages/Machines'), 'Machines')
const Cylinders     = lazyWithRetry(() => import('./pages/Cylinders'), 'Cylinders')
const WorkOrders    = lazyWithRetry(() => import('./pages/WorkOrders'), 'WorkOrders')
const PMPlan        = lazyWithRetry(() => import('./pages/PMPlan'), 'PMPlan')
const SpareParts    = lazyWithRetry(() => import('./pages/SpareParts'), 'SpareParts')
const Purchasing    = lazyWithRetry(() => import('./pages/Purchasing'), 'Purchasing')
const Reports       = lazyWithRetry(() => import('./pages/Reports'), 'Reports')
const SettingsPage  = lazyWithRetry(() => import('./pages/SettingsPage'), 'SettingsPage')
const Logs          = lazyWithRetry(() => import('./pages/Logs'), 'Logs')
const StockMovement = lazyWithRetry(() => import('./pages/StockMovement'), 'StockMovement')
const UsersPage     = lazyWithRetry(() => import('./pages/Users'), 'UsersPage')
const WebBuilder    = lazyWithRetry(() => import('./pages/WebBuilder'), 'WebBuilder')
const DesignBom     = lazyWithRetry(() => import('./pages/DesignBom'), 'DesignBom')
const NeedleStock   = lazyWithRetry(() => import('./pages/NeedleStock'), 'NeedleStock')
const PresentationPage = lazyWithRetry(() => import('./pages/Presentation'), 'PresentationPage')
const D1TestPage    = lazyWithRetry(() => import('./pages/D1TestPage'), 'D1TestPage')

function ProtectedRoute({ permKey, children }) {
  const { user } = useAuth()
  const allowed = canAccess(user, permKey)

  if (allowed) return children

  // If user lands on home / but has no dashboard perm, redirect to their first accessible menu
  if (permKey === 'dashboard') {
    const firstAccessible = ALL_NAV_ITEMS.find((n) => canAccess(user, n.permKey))
    if (firstAccessible && firstAccessible.to !== '/') {
      return <Navigate to={firstAccessible.to} replace />
    }
  }

  const firstAccessible = ALL_NAV_ITEMS.find((n) => canAccess(user, n.permKey))

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
        <ShieldAlert size={32} />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
        ไม่มีสิทธิ์เข้าถึงเมนูนี้
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        บัญชีของคุณไม่ได้รับอนุญาตให้เข้าใช้งานเมนูนี้ หากต้องการใช้งาน กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อกำหนดสิทธิ์เพิ่มเติม
      </p>
      {firstAccessible && (
        <NavLink
          to={firstAccessible.to}
          className="btn-primary inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold"
        >
          <span>ไปยังหน้าหลักที่คุณมีสิทธิ์เข้าถึง</span>
        </NavLink>
      )}
    </div>
  )
}

function PageRoutes() {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/"           element={<ProtectedRoute permKey="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/machines"   element={<ProtectedRoute permKey="machines"><Machines /></ProtectedRoute>} />
          <Route path="/cylinders"  element={<ProtectedRoute permKey="cylinders"><Cylinders /></ProtectedRoute>} />
          <Route path="/workorders"      element={<ProtectedRoute permKey="workorders"><WorkOrders /></ProtectedRoute>} />
          <Route path="/repair-requests" element={<ProtectedRoute permKey="workorders"><WorkOrders defaultTab="repair_requests" /></ProtectedRoute>} />
          <Route path="/pm"           element={<ProtectedRoute permKey="pm"><PMPlan /></ProtectedRoute>} />
          <Route path="/pm-log"       element={<ProtectedRoute permKey="pm"><PMPlan defaultTab="log" /></ProtectedRoute>} />
          <Route path="/pm-monthly"   element={<ProtectedRoute permKey="pm"><PMPlan defaultTab="monthly_schedule" /></ProtectedRoute>} />
          <Route path="/center-check" element={<ProtectedRoute permKey="pm"><PMPlan defaultTab="center_check" /></ProtectedRoute>} />
          <Route path="/needle-condition" element={<ProtectedRoute permKey="pm"><PMPlan defaultTab="needle" /></ProtectedRoute>} />
          <Route path="/design-bom"   element={<ProtectedRoute permKey="designbom"><DesignBom /></ProtectedRoute>} />
          <Route path="/needle-stock" element={<ProtectedRoute permKey="needlestock"><NeedleStock /></ProtectedRoute>} />
          <Route path="/spareparts" element={<ProtectedRoute permKey="spareparts"><SpareParts /></ProtectedRoute>} />
          <Route path="/purchasing" element={<ProtectedRoute permKey="purchasing"><Purchasing /></ProtectedRoute>} />
          <Route path="/stock"      element={<ProtectedRoute permKey="stock"><StockMovement /></ProtectedRoute>} />
          <Route path="/reports"    element={<ProtectedRoute permKey="reports"><Reports /></ProtectedRoute>} />
          <Route path="/logs"       element={<ProtectedRoute permKey="logs"><Logs /></ProtectedRoute>} />
          <Route path="/users"      element={<ProtectedRoute permKey="users"><UsersPage /></ProtectedRoute>} />
          <Route path="/webbuilder" element={<ProtectedRoute permKey="webbuilder"><WebBuilder /></ProtectedRoute>} />
          <Route path="/settings"   element={<ProtectedRoute permKey="settings"><SettingsPage /></ProtectedRoute>} />
          <Route path="/d1-test"    element={<ProtectedRoute permKey="settings"><D1TestPage /></ProtectedRoute>} />
          <Route path="/presentation" element={<PresentationPage />} />
          <Route path="/executive-presentation" element={<PresentationPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

function AppInner() {
  const { t } = useT()
  const { user, logout } = useAuth()
  const [sideOpen, setSideOpen] = useState(false)
  const [dark, setDark]         = useState(() => localStorage.getItem('theme') !== 'light')
  const { simulatorMode, setSimulatorMode, device, autoDevice } = useDeviceView()
  const [pwaModalOpen, setPwaModalOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (user) {
      getGeminiConfig().catch(() => {})
    }
  }, [user])

  useEffect(() => {
    const html = document.documentElement
    if (dark) { html.classList.add('dark');    localStorage.setItem('theme', 'dark') }
    else       { html.classList.remove('dark'); localStorage.setItem('theme', 'light') }
  }, [dark])

  const handleForceUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.unregister()
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }
    } catch {}
    window.location.reload(true)
  }

  if (user === undefined) return <AppSplash />
  if (!user) {
    return (
      <Suspense fallback={<RouteLoadingFallback message="กำลังโหลดหน้าเข้าสู่ระบบ..." />}>
        <Login />
      </Suspense>
    )
  }

  const currentNav = [...ALL_NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )

  const sidebarBg = dark
    ? '#0f172a'
    : '#ffffff'

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'var(--bg-page)'}}>
      <AppSidebar dark={dark} sideOpen={sideOpen} setSideOpen={setSideOpen} setPwaModalOpen={setPwaModalOpen} user={user} t={t} logout={logout} sidebarBg={sidebarBg} />

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      <AppTopbar dark={dark} setDark={setDark} setSideOpen={setSideOpen} currentNav={currentNav} t={t} user={user} simulatorMode={simulatorMode} setSimulatorMode={setSimulatorMode} autoDevice={autoDevice} setPwaModalOpen={setPwaModalOpen} handleForceUpdate={handleForceUpdate} logout={logout} />

      <AppContent device={device} simulatorMode={simulatorMode}>
        <PageRoutes />
      </AppContent>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet screens) */}
      <MobileBottomNav onOpenMenu={() => setSideOpen(true)} />

      <PWAInstallPrompt open={pwaModalOpen} onClose={() => setPwaModalOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <DeviceViewProvider>
              <ToastProvider>
                <WebBuilderConfigProvider>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Routes>
                      <Route path="/repair/:serial" element={<RepairPage />} />
                      <Route path="/presentation" element={<PresentationPage />} />
          <Route path="/executive-presentation" element={<PresentationPage />} />
                      <Route path="/*" element={<AppInner />} />
                    </Routes>
                  </Suspense>
                </WebBuilderConfigProvider>
              </ToastProvider>
            </DeviceViewProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  )
}
