import { Sparkles } from 'lucide-react'

// Simulator Auto button moved verbatim from AppDeviceSimulator (props only).
export function AppSimAutoButton({ dark, simulatorMode, setSimulatorMode, autoDevice }) {
  return (
              <button
                type="button"
                role="button"
                aria-pressed={simulatorMode === 'auto'}
                aria-label={`โหมดอัตโนมัติตามขนาดจอจริง (ปัจจุบัน: ${autoDevice === 'mobile' ? 'มือถือ' : autoDevice === 'tablet' ? 'แท็บเล็ต' : 'คอมพิวเตอร์'})`}
                onClick={() => setSimulatorMode('auto')}
                title={`โหมดอัตโนมัติตามขนาดจอจริง (ปัจจุบัน: ${autoDevice === 'mobile' ? 'มือถือ' : autoDevice === 'tablet' ? 'แท็บเล็ต' : 'คอมพิวเตอร์'})`}
                className="px-2 py-1 active:scale-95 transition-all flex items-center gap-1 text-[11px] font-bold rounded-lg"
                style={{
                  height: 28,
                  background: simulatorMode === 'auto' ? (dark ? '#6366f1' : '#4f46e5') : 'transparent',
                  color: simulatorMode === 'auto' ? '#ffffff' : (dark ? '#94a3b8' : '#64748b'),
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: simulatorMode === 'auto' ? '0 2px 6px rgba(79,70,229,0.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Sparkles size={11} />
                <span>Auto</span>
              </button>
  )
}
