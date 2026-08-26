import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Share, PlusSquare, Check, QrCode, Monitor, Sparkles } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import gemmaLogo from '../../assets/logo-gemma.png'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const appUrl = 'https://textileops-cmms.vercel.app'

  useEffect(() => {
    // Check if already running in standalone/installed app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome/.test(ua)
    if (isIosDevice && isSafari) {
      setIsIOS(true)
    }

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = localStorage.getItem('pwa_banner_dismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for custom global event to open install modal from anywhere (e.g. Header button)
    const handleOpenModal = () => {
      setShowModal(true)
    }
    window.addEventListener('open-pwa-install', handleOpenModal)

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setShowModal(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('open-pwa-install', handleOpenModal)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowBanner(false)
        setShowModal(false)
      }
      setDeferredPrompt(null)
    } else {
      setShowModal(true)
    }
  }

  const handleDismissBanner = () => {
    setShowBanner(false)
    try {
      localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
    } catch {}
  }

  return (
    <>
      {/* ── 1. Floating Bottom Banner (If eligible on mobile/desktop) ── */}
      {showBanner && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-subtle">
          <div className="p-4 bg-slate-900/95 text-white rounded-3xl border border-blue-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3.5">
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
                onClick={handleTriggerInstall}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all active:scale-95"
              >
                <Download size={13} />
                <span>ติดตั้ง</span>
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="ปิด"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Full PWA Install & QR Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 text-white rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <img src={gemmaLogo} alt="Logo" className="w-9 h-9 object-contain rounded-xl bg-white/10 p-1" />
                <div>
                  <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                    <span>ติดตั้งแอปพลิเคชัน TextileOps (PWA)</span>
                    <Sparkles size={14} className="text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    เปิดใช้งานเต็มจอ ไม่ต้องโหลดจาก Store อัปเดตอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              
              {/* Direct Install Button (If supported by browser) */}
              {deferredPrompt && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-blue-300">พร้อมติดตั้งบนอุปกรณ์นี้ทันที</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">กดปุ่มเพื่อเพิ่มไอคอนแอปไปยังหน้าจอหลัก</div>
                  </div>
                  <button
                    onClick={handleTriggerInstall}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 flex items-center gap-1.5 active:scale-95"
                  >
                    <Download size={14} />
                    <span>ติดตั้งแอปทันที</span>
                  </button>
                </div>
              )}

              {/* QR Code section (For scanning from PC to Phone) */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-2.5 bg-white rounded-2xl shadow-md flex-shrink-0">
                  <QRCodeSVG value={appUrl} size={110} level="M" />
                </div>
                <div className="space-y-1.5">
                  <div className="font-extrabold text-xs text-blue-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <QrCode size={14} />
                    <span>สแกน QR ด้วยมือถือเพื่อเปิดแอป</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ใช้กล้องมือถือของท่าน (iPhone หรือ Android) ส่อง QR Code ด้านซ้ายเพื่อเปิดระบบและติดตั้งแอปบนมือถือทันที
                  </p>
                  <div className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded-lg inline-block break-all">
                    {appUrl}
                  </div>
                </div>
              </div>

              {/* Installation Guide Tabs / Instructions */}
              <div className="space-y-3">
                <div className="font-bold text-xs text-slate-200">วิธีติดตั้งแยกตามระบบปฏิบัติการ:</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Android Guide */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                      <Smartphone size={14} />
                      <span>Android (Chrome)</span>
                    </div>
                    <ol className="text-[11px] text-slate-300 space-y-1 pl-4 list-decimal leading-relaxed">
                      <li>เปิดเว็บด้วย <b>Google Chrome</b></li>
                      <li>แตะปุ่ม <b>3 จุด (⋮)</b> ที่มุมขวาบน</li>
                      <li>เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b></li>
                    </ol>
                  </div>

                  {/* iOS Guide */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="font-bold text-xs text-indigo-400 flex items-center gap-1.5">
                      <Share size={13} />
                      <span>iPhone / iPad (Safari)</span>
                    </div>
                    <ol className="text-[11px] text-slate-300 space-y-1 pl-4 list-decimal leading-relaxed">
                      <li>เปิดเว็บด้วย <b>Safari</b></li>
                      <li>แตะปุ่ม <b>แชร์ (Share 📤)</b> แถบล่าง</li>
                      <li>เลื่อนลงเลือก <b>"เพิ่มไปยังหน้าจอโฮม ➕"</b></li>
                    </ol>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline px-5 py-2 text-xs font-bold text-slate-300"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
