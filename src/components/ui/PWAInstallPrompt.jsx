import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, Smartphone, Share, PlusSquare, Check, QrCode, Monitor, Sparkles, AlertCircle, Laptop, ArrowRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import gemmaLogo from '../../assets/logo-gemma.png'

export default function PWAInstallPrompt({ open: controlledOpen, onClose: controlledOnClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [activeTab, setActiveTab] = useState('pc') // 'pc' | 'android' | 'ios'
  const appUrl = 'https://textileops-cmms.vercel.app'

  const isModalOpen = controlledOpen !== undefined ? controlledOpen : internalModalOpen
  const closeModal = () => {
    if (controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalModalOpen(false)
    }
  }

  useEffect(() => {
    // Check if already in standalone app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandalone) {
      setIsInstalled(true)
    }

    // Detect device type to select default tab
    const ua = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(ua)
    const isAndroidDevice = /android/.test(ua)
    if (isIosDevice) {
      setIsIOS(true)
      setActiveTab('ios')
    } else if (isAndroidDevice) {
      setActiveTab('android')
    } else {
      setActiveTab('pc')
    }

    // Capture beforeinstallprompt event (Chrome, Edge on PC & Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = localStorage.getItem('pwa_banner_dismissed')
      if (!dismissed && !isStandalone) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for custom global event
    const handleOpenModal = () => {
      setInternalModalOpen(true)
    }
    window.addEventListener('open-pwa-install', handleOpenModal)

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setInternalModalOpen(false)
      if (controlledOnClose) controlledOnClose()
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('open-pwa-install', handleOpenModal)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [controlledOnClose])

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
          setShowBanner(false)
          closeModal()
        }
        setDeferredPrompt(null)
      } catch (err) {
        console.warn('Install prompt error:', err)
      }
    } else {
      alert('ℹ️ วิธีติดตั้งลง PC:\n1. มองที่ช่องใส่ URL ด้านบนสุดขวามือของ Chrome/Edge\n2. คลิกไอคอนรูปคอมพิวเตอร์/ลูกศรลง (⊕ หรือ 📥)\n3. หรือคลิก 3 จุดมุมขวาบน (⋮) > บันทึกและแชร์ > ติดตั้งแอป TextileOps')
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
      {showBanner && !isInstalled && !isModalOpen && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-bounce-subtle">
          <div className="p-4 bg-slate-900/95 text-white rounded-3xl border border-blue-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <img src={gemmaLogo} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
                  <Smartphone size={13} />
                  <span>ติดตั้งแอป TextileOps (PWA)</span>
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

      {/* ── 2. Full PWA Install & QR Modal (Rendered to Portal) ── */}
      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="w-full max-w-2xl bg-slate-900 text-white rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <img src={gemmaLogo} alt="Logo" className="w-10 h-10 object-contain rounded-2xl bg-white/10 p-1.5 shadow-md" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-1.5">
                    <span>ติดตั้งแอปพลิเคชัน TextileOps (PWA)</span>
                    <Sparkles size={15} className="text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    เปิดใช้งานเต็มจอ แยกเป็นโปรแกรมเฉพาะ ทั้งบนคอมพิวเตอร์และมือถือ
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pc')}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'pc'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Laptop size={15} />
                <span>คอมพิวเตอร์ (PC / Windows / Mac)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'android'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Smartphone size={15} />
                <span>มือถือ Android (Chrome)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'ios'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Share size={14} />
                <span>iPhone / iPad (Safari)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* TAB 1: PC / Windows / Mac */}
              {activeTab === 'pc' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Direct 1-Click Action for PC */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-800/40 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="font-extrabold text-sm text-blue-300 flex items-center justify-center sm:justify-start gap-1.5">
                        <Laptop size={16} />
                        <span>ติดตั้งลงคอมพิวเตอร์เครื่องนี้ (Desktop App)</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        สร้างไอคอนเปิดโปรแกรมบนหน้าจอ Desktop และแถบ Taskbar ล่างจอ
                      </p>
                    </div>

                    <button
                      onClick={handleTriggerInstall}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 flex-shrink-0"
                    >
                      <Download size={15} />
                      <span>กดติดตั้งลง PC ทันที</span>
                    </button>
                  </div>

                  {/* Visual Step-by-step for PC Browsers */}
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
                    <div className="font-bold text-xs text-blue-400">
                      💡 วิธีติดตั้งผ่านเบราว์เซอร์บน PC (Google Chrome หรือ Microsoft Edge):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                          <span>มองที่ช่องใส่ URL ด้านบนสุด</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                          ที่ปลายขวาสุดของช่องพิมพ์ URL จะมีไอคอนรูป <b>คอมพิวเตอร์มีลูกศรชี้ลง (⊕ หรือ 📥)</b> ให้คลิกแล้วกด <b>"ติดตั้ง"</b>
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                          <span>หรือคลิกที่เมนู 3 จุด (⋮)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pl-6">
                          คลิกปุ่ม <b>3 จุด (⋮)</b> มุมขวาบนของ Chrome/Edge $\rightarrow$ เลือก <b>"บันทึกและแชร์"</b> $\rightarrow$ <b>"ติดตั้ง TextileOps CMMS"</b>
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: Android (Chrome) */}
              {activeTab === 'android' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-emerald-500/30 space-y-3">
                    <div className="font-bold text-xs text-emerald-400 flex items-center gap-2">
                      <Smartphone size={16} />
                      <span>ขั้นตอนการติดตั้งบนมือถือ Android (Google Chrome):</span>
                    </div>
                    <ol className="text-xs text-slate-300 space-y-2 pl-5 list-decimal leading-relaxed">
                      <li>เปิดเว็บ <b>https://textileops-cmms.vercel.app</b> บนมือถือด้วย Google Chrome</li>
                      <li>แตะปุ่ม <b>3 จุด (⋮)</b> ที่มุมขวาบนของเบราว์เซอร์</li>
                      <li>เลือกเมนู <b>"ติดตั้งแอป (Install app)"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก (Add to Home Screen)"</b></li>
                      <li>กด <b>"ติดตั้ง"</b> เพื่อสร้างไอคอนลงบนหน้าจอมือถือ</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* TAB 3: iOS / iPhone / iPad (Safari) */}
              {activeTab === 'ios' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-indigo-500/30 space-y-3">
                    <div className="font-bold text-xs text-indigo-400 flex items-center gap-2">
                      <Share size={15} />
                      <span>ขั้นตอนการติดตั้งบน iPhone / iPad (Safari):</span>
                    </div>
                    <ol className="text-xs text-slate-300 space-y-2.5 pl-5 list-decimal leading-relaxed">
                      <li>เปิดเว็บ <b>https://textileops-cmms.vercel.app</b> ด้วยเบราว์เซอร์ <b>Safari</b></li>
                      <li>แตะปุ่ม <b>แชร์ (Share 📤)</b> ที่แถบเมนูด้านล่างสุดของหน้าจอ</li>
                      <li>เลื่อนลงมาแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen ➕)"</b></li>
                      <li>แตะปุ่ม <b>"เพิ่ม (Add)"</b> ที่มุมขวาบน เพื่อเสร็จสิ้น</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* QR Code section (Universal mobile scanner) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-2.5 bg-white rounded-2xl shadow-md flex-shrink-0">
                  <QRCodeSVG value={appUrl} size={95} level="M" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-blue-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <QrCode size={14} />
                    <span>ต้องการติดตั้งลงมือถือช่าง? สแกน QR Code นี้ได้เลย</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ใช้กล้องมือถือส่อง QR Code ด้านซ้ายเพื่อเปิดระบบและติดตั้งแอปบนมือถือช่างทันที
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                TextileOps CMMS PWA Universal App
              </span>
              <button
                onClick={closeModal}
                className="btn-outline px-6 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  )
}
