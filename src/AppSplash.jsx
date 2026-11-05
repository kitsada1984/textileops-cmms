import gemmaLogo from './assets/logo-gemma.png'

// Loading splash moved verbatim from AppInner (no props, no logic).
export function AppSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{background:'linear-gradient(145deg,#070b14 0%,#0f172a 50%,#070b14 100%)'}}>
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:550, height:550, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
        }} />
      </div>
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div style={{ position:'relative' }}>
          <div style={{
            position:'absolute', inset:-14, borderRadius:32,
            background:'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
          }} />
          <img src={gemmaLogo} alt="Gemma Knits" style={{
            width: 80, height: 80, objectFit: 'contain', borderRadius: 20, position:'relative',
            filter:'drop-shadow(0 10px 30px rgba(59,130,246,0.38))',
          }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div style={{ fontWeight:800, fontSize:16, color:'#f8fafc', letterSpacing:'-0.02em' }}>
            Gemma Knits
          </div>
          <div style={{
            fontSize:9.5, letterSpacing:'0.2em', color:'#60a5fa',
            textTransform:'uppercase', fontWeight:700,
          }}>
            CMMS Platform
          </div>
        </div>
        <div className="spinner-gemini" />
      </div>
    </div>
  )
}
