import { useState } from 'react'
import { APP_VERSION } from '../version'
import { Lock, User } from 'lucide-react'
import { useT } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import gemmaLogo from '../assets/logo-gemma.png'

export default function Login() {
  const { t } = useT()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) { setError(t('login_req')); return }
    setLoading(true); setError('')
    try {
      await login(username, password)
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
          padding:'44px 36px',
          background:'rgba(30, 41, 59, 0.75)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:'1px solid rgba(51, 65, 85, 0.7)',
          boxShadow:'0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '26px',
              background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
              filter: 'blur(6px)',
            }} />
            <img src={gemmaLogo} alt="Gemma Knits" style={{
              width: 86, height: 86, objectFit: 'contain', borderRadius: 18,
              position: 'relative',
              filter: 'drop-shadow(0 8px 24px rgba(59,130,246,0.4))',
            }} />
          </div>
          <div className="text-center mt-1">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Gemma Knits
            </h2>
            <div className="text-[10px] mt-1 font-bold tracking-[0.2em] uppercase" style={{color:'#60a5fa'}}>
              CMMS Platform
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-7" style={{borderTop:'1px solid rgba(51,65,85,0.6)'}}/>

        <form onSubmit={submit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-[10.5px] font-bold mb-2 tracking-[0.12em] uppercase"
              style={{color:'rgba(248,250,252,0.6)'}}>ชื่อผู้ใช้</label>
            <div className="relative">
              <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{color:'#60a5fa'}}/>
              <input
                type="text"
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="input"
                style={{
                  display:'block', width:'100%', paddingLeft:'42px', paddingRight:'16px',
                  paddingTop:'12px', paddingBottom:'12px', borderRadius:'14px', fontSize:'14px',
                  background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.7)',
                  color:'#f8fafc', outline:'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10.5px] font-bold mb-2 tracking-[0.12em] uppercase"
              style={{color:'rgba(248,250,252,0.6)'}}>รหัสผ่าน</label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{color:'#60a5fa'}}/>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                style={{
                  display:'block', width:'100%', paddingLeft:'42px', paddingRight:'16px',
                  paddingTop:'12px', paddingBottom:'12px', borderRadius:'14px', fontSize:'14px',
                  background:'rgba(15,23,42,0.6)', border:'1px solid rgba(51,65,85,0.7)',
                  color:'#f8fafc', outline:'none',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
              borderRadius:'12px', padding:'12px 16px', fontSize:'13px', color:'#fca5a5',
            }}>{error}</div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="btn-primary w-full"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              padding:'13px 0', borderRadius:'14px', fontSize:'14px', fontWeight:700,
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

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between" style={{borderTop:'1px solid rgba(51,65,85,0.6)', paddingTop:'16px'}}>
          <div className="text-[11px] tracking-wide" style={{color:'rgba(248,250,252,0.45)'}}>
            Gemma Knits CMMS {APP_VERSION}
          </div>
          <div className="text-[11px] font-semibold" style={{color:'#60a5fa'}}>
            Supabase DB
          </div>
        </div>
      </div>
    </div>
  )
}
