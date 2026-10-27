import { useState, useEffect } from 'react'
import { APP_VERSION } from '../version'
import { Lock, User, QrCode, KeyRound, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useT } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { getActiveDbProvider } from '../api/dbClient'
import gemmaLogo from '../assets/logo-gemma.png'

function LineIcon({ size = 18, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.038 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.026c-.052.312-.246 1.22.844.665 1.09-.556 5.882-3.468 8.026-5.939C22.617 15.289 24 12.98 24 10.304z" />
    </svg>
  )
}

export default function Login() {
  const { t } = useT()
  const { login, loginWithToken } = useAuth()
  const [mode, setMode]         = useState('password') // 'password' | 'qr'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // QR Login State
  const [qrUrl, setQrUrl]                   = useState('')
  const [qrSessionCode, setQrSessionCode]   = useState('')
  const [qrLoading, setQrLoading]           = useState(false)
  const [qrError, setQrError]               = useState('')

  // Check URL parameters for LINE callback errors
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search)
      const lineErr = params.get('line_error')
      if (lineErr) {
        setError(lineErr)
        params.delete('line_error')
        const clean = params.toString()
        const newUrl = window.location.pathname + (clean ? `?${clean}` : '') + window.location.hash
        window.history.replaceState({}, document.title, newUrl)
      }
    }
  }, [])

  // Poll session status so scanning the QR code automatically logs in
  useEffect(() => {
    if (!qrSessionCode) return
    let active = true
    const timer = setInterval(async () => {
      if (!active) return
      try {
        const res = await fetch(`/api/auth/line/login?check_session=${encodeURIComponent(qrSessionCode)}`)
        const data = await res.json().catch(() => ({}))
        if (data?.ok && data.status === 'authenticated' && data.token && data.user) {
          clearInterval(timer)
          if (typeof loginWithToken === 'function') {
            loginWithToken(data.token, data.user)
          }
        }
      } catch {}
    }, 2000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [qrSessionCode, loginWithToken])

  const fetchLineQrUrl = async () => {
    setQrLoading(true)
    setQrError('')
    try {
      const res = await fetch('/api/auth/line/login?format=json')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || 'ไม่สามารถสร้างลิงก์สำหรับสแกน LINE QR ได้')
      }
      setQrUrl(data.url)
      if (data.session_code) {
        setQrSessionCode(data.session_code)
      }
      return data
    } catch (err) {
      setQrError(err.message || 'เกิดข้อผิดพลาดในการโหลด QR Code')
      return null
    } finally {
      setQrLoading(false)
    }
  }

  const handleSwitchToQr = () => {
    setMode('qr')
    setError('')
    if (!qrUrl) {
      fetchLineQrUrl()
    }
  }

  const handleLineLoginRedirect = async () => {
    setMode('qr')
    setError('')
    const data = qrUrl ? { url: qrUrl, session_code: qrSessionCode } : await fetchLineQrUrl()
    if (data?.url) {
      window.location.href = data.url
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) { setError(t('login_req')); return }
    setLoading(true); setError('')
    try {
      await login(username, password)
      // Return to a deep link (QR / LINE) the user was blocked from by the login gate
      try {
        const returnTo = sessionStorage.getItem('textileops_return_to')
        if (returnTo) {
          sessionStorage.removeItem('textileops_return_to')
          window.location.replace(returnTo)
          return
        }
      } catch {}
    } catch(err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{background:'radial-gradient(circle at 50% 35%, #162032 0%, #0f172a 100%)'}}>

      {/* Decorative Gemini ambient flare */}
      <div className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)', filter: 'blur(50px)'}}/>
      <div className="absolute bottom-[-15%] left-[-5%] w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{background:'radial-gradient(circle, rgba(37,99,235,0.14) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)', filter: 'blur(60px)'}}/>

      {/* Card */}
      <div className="relative w-full max-w-md"
        style={{
          borderRadius:'28px',
          padding:'38px 32px',
          background:'rgba(30, 41, 59, 0.75)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:'1px solid rgba(51, 65, 85, 0.7)',
          boxShadow:'0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5 mb-5">
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '26px',
              background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
              filter: 'blur(6px)',
            }} />
            <img src={gemmaLogo} alt="Gemma Knits" style={{
              width: 76, height: 76, objectFit: 'contain', borderRadius: 16,
              position: 'relative',
              filter: 'drop-shadow(0 8px 24px rgba(59,130,246,0.4))',
            }} />
          </div>
          <div className="text-center mt-1">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Gemma Knits
            </h2>
            <div className="text-xs mt-1 font-bold tracking-[0.16em] uppercase" style={{color:'#60a5fa'}}>
              CMMS Platform
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/60 border border-slate-700/60 mb-5">
          <button
            type="button"
            onClick={() => { setMode('password'); setError('') }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'password'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound size={14} />
            <span>ชื่อผู้ใช้ / รหัสผ่าน</span>
          </button>
          <button
            type="button"
            onClick={handleSwitchToQr}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'qr'
                ? 'bg-[#06C755] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={14} />
            <span>สแกน QR Code</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" aria-live="assertive" className="mb-4" style={{
            background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
            borderRadius:'12px', padding:'10px 14px', fontSize:'13px', color:'#fca5a5',
          }}>{error}</div>
        )}

        {/* MODE: Password Form */}
        {mode === 'password' && (
          <div>
            <form onSubmit={submit} className="space-y-4">
              {/* Username */}
              <div>
                <label htmlFor="login-username" className="block text-xs font-bold mb-2 tracking-wide uppercase"
                  style={{color:'rgba(248,250,252,0.7)'}}>ชื่อผู้ใช้</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{color:'#60a5fa'}}/>
                  <input
                    id="login-username"
                    type="text"
                    placeholder="ชื่อผู้ใช้"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    className="input"
                    style={{
                      display:'block', width:'100%', paddingLeft:'42px', paddingRight:'16px',
                      paddingTop:'12px', paddingBottom:'12px', borderRadius:'14px', fontSize:'16px',
                      background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.7)',
                      color:'#f8fafc', outline:'none',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-xs font-bold mb-2 tracking-wide uppercase"
                  style={{color:'rgba(248,250,252,0.7)'}}>รหัสผ่าน</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{color:'#60a5fa'}}/>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="input"
                    style={{
                      display:'block', width:'100%', paddingLeft:'42px', paddingRight:'16px',
                      paddingTop:'12px', paddingBottom:'12px', borderRadius:'14px', fontSize:'16px',
                      background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.7)',
                      color:'#f8fafc', outline:'none',
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="btn-primary w-full"
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                  padding:'12px 0', borderRadius:'14px', fontSize:'15px', fontWeight:700,
                  cursor:loading?'not-allowed':'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginTop:'14px',
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner-gemini" style={{width:16, height:16, borderWidth:2}} />
                    {t('login_doing')}
                  </>
                ) : t('login_btn')}
              </button>
            </form>

            {/* LINE Login Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/60" />
              </div>
              <span className="relative px-3 text-xs font-bold uppercase tracking-wider bg-[#1b263b] text-slate-300 rounded-full">
                หรือ
              </span>
            </div>

            {/* LINE Login Button */}
            <button
              type="button"
              onClick={handleLineLoginRedirect}
              className="w-full transition-all active:scale-[0.99] hover:opacity-95 shadow-md flex items-center justify-center gap-2.5 text-white font-bold py-3 px-4 rounded-xl text-sm"
              style={{
                backgroundColor: '#06C755',
                border: '1px solid #05b34c',
              }}
            >
              <LineIcon size={20} />
              <span>เข้าสู่ระบบด้วย LINE</span>
            </button>
          </div>
        )}

        {/* MODE: QR Code Scanner */}
        {mode === 'qr' && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="text-xs text-slate-300 font-medium mb-3 max-w-xs leading-relaxed">
              สแกน QR Code ด้านล่างด้วยกล้องหรือแอป <span className="text-[#06C755] font-bold">LINE</span> แล้วกด <span className="text-white font-bold">&quot;ส่งข้อความ&quot;</span> ในแชท ระบบจะเข้าใช้งานให้อัตโนมัติทันที
            </div>

            {qrSessionCode && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
                <span>รอรับการยืนยันจาก LINE (รหัส #{qrSessionCode})</span>
              </div>
            )}

            {/* QR Box */}
            <div
              className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center relative min-w-[200px] min-h-[200px]"
            >
              {qrLoading ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="spinner-gemini" style={{ width: 28, height: 28, borderWidth: 3, borderColor: '#06C755' }} />
                  <span className="text-xs text-slate-600 font-semibold mt-2">กำลังสร้าง QR Code...</span>
                </div>
              ) : qrError ? (
                <div className="flex flex-col items-center gap-2 p-2 max-w-[220px]">
                  <span className="text-xs text-red-500 font-semibold leading-relaxed">{qrError}</span>
                  <button
                    type="button"
                    onClick={fetchLineQrUrl}
                    className="mt-2 text-xs text-blue-600 underline font-bold"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                </div>
              ) : qrUrl ? (
                <div className="relative group">
                  <QRCodeSVG
                    value={qrUrl}
                    size={184}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white">
                        <LineIcon size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Refresh QR button */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={fetchLineQrUrl}
                disabled={qrLoading}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
                <span>สร้าง QR Code ใหม่</span>
              </button>
            </div>

            {/* Direct LINE Redirect Button fallback */}
            <button
              type="button"
              onClick={handleLineLoginRedirect}
              className="mt-4 w-full text-xs text-[#06C755] hover:underline font-semibold"
            >
              หรือคลิกที่นี่เพื่อเปิดแอป LINE บนอุปกรณ์นี้ทันที →
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between" style={{borderTop:'1px solid rgba(51,65,85,0.6)', paddingTop:'14px'}}>
          <div className="text-xs tracking-wide" style={{color:'rgba(248,250,252,0.5)'}}>
            Gemma Knits CMMS {APP_VERSION}
          </div>
          <div className="text-xs font-semibold" style={{color:'#60a5fa'}}>
            {getActiveDbProvider() === 'd1' ? 'Cloudflare D1' : 'Supabase DB'}
          </div>
        </div>
      </div>
    </div>
  )
}
