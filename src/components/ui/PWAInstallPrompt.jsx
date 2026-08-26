import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react'
import gemmaLogo from '../../assets/logo-gemma.png'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // Check if already in standalone/installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('pwa_prompt_dismissed')
    const now = Date.now()
    if (dismissedAt && now - parseInt(dismissedAt, 10) < 3 * 24 * 60 * 60 * 1000) {
      return
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome/.test(ua)
    if (isIosDevice && isSafari && !isStandalone) {
      setIsIOS(true)
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIosGuide(false)
    try {
      localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
    } catch {}
  }

  if (isInstalled || !showPrompt) return null

  return (
    <>
      {/* Banner on bottom-right or bottom-center */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-subtle">
        <div className="p-4 bg-slate-900/95 dark:bg-slate-900/95 text-white rounded-3xl border border-blue-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <img src={gemmaLogo} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                <Smartphone size={13} />
                <span>ติดตั้งแอป TextileOps บนมือถือ</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                เปิดใช้งานเต็มจอ เร็วขึ้น และรับการแจ้งเตือน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all active:scale-95"
            >
              <Download size={13} />
              <span>ติดตั้ง</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 text-white p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <Smartphone size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              วิธีติดตั้งบน iPhone / iPad (Safari)
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300 text-left bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span>แตะปุ่ม <b>แชร์ (Share)</b> <Share size={13} className="inline mx-1 text-blue-400" /> ที่แถบด้านล่าง</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                <span>เลื่อนลงมาแล้วเลือก <b>'เพิ่มไปยังหน้าจอโฮม'</b> <PlusSquare size={13} className="inline mx-1 text-blue-400" /></span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span>แตะ <b>'เพิ่ม' (Add)</b> ที่มุมขวาบน</span>
              </div>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  )
}
