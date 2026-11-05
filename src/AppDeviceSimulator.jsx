import { Monitor, Tablet, Smartphone } from 'lucide-react'
import { AppSimAutoButton } from './AppSimAutoButton'

// Device simulator toggle moved verbatim from AppTopbar (props only).
export function AppDeviceSimulator({ dark, simulatorMode, setSimulatorMode, autoDevice }) {
  return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: dark ? '#1e293b' : '#f1f5f9',
                borderRadius: 12,
                padding: 2,
                border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                flexShrink: 0,
              }}
            >
              <AppSimAutoButton dark={dark} simulatorMode={simulatorMode} setSimulatorMode={setSimulatorMode} autoDevice={autoDevice} />
              <button
                type="button"
                role="button"
                aria-pressed={simulatorMode === 'desktop'}
                aria-label="จำลองมุมมองคอมพิวเตอร์ (PC / Desktop)"
                onClick={() => setSimulatorMode('desktop')}
                title="จำลองมุมมองคอมพิวเตอร์ (PC / Desktop)"
                className="px-2 py-1 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold rounded-lg"
                style={{
                  height: 28,
                  background: simulatorMode === 'desktop' ? (dark ? '#3b82f6' : '#2563eb') : 'transparent',
                  color: simulatorMode === 'desktop' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: simulatorMode === 'desktop' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Monitor size={11} />
                <span>PC</span>
              </button>
              <button
                type="button"
                role="button"
                aria-pressed={simulatorMode === 'tablet'}
                aria-label="จำลองมุมมองแท็บเล็ต (Tablet)"
                onClick={() => setSimulatorMode('tablet')}
                title="จำลองมุมมองแท็บเล็ต (Tablet)"
                className="px-2 py-1 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold rounded-lg"
                style={{
                  height: 28,
                  background: simulatorMode === 'tablet' ? (dark ? '#8b5cf6' : '#7c3aed') : 'transparent',
                  color: simulatorMode === 'tablet' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: simulatorMode === 'tablet' ? '0 2px 6px rgba(124,58,237,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Tablet size={11} />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                role="button"
                aria-pressed={simulatorMode === 'mobile'}
                aria-label="จำลองมุมมองมือถือ (Mobile)"
                onClick={() => setSimulatorMode('mobile')}
                title="จำลองมุมมองมือถือ (Mobile)"
                className="px-2 py-1 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold rounded-lg"
                style={{
                  height: 28,
                  background: simulatorMode === 'mobile' ? (dark ? '#10b981' : '#059669') : 'transparent',
                  color: simulatorMode === 'mobile' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: simulatorMode === 'mobile' ? '0 2px 6px rgba(16,185,129,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Smartphone size={11} />
                <span>Mobile</span>
              </button>
            </div>
  )
}
