import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, RotateCcw } from 'lucide-react'
import { QR_FIELDS, QR_DEFAULTS, loadQRSettings, saveQRSettings } from '../utils/qrSettings'

const SIZE_OPTS = [
  { value: 100, label: 'เล็ก', desc: '100 px' },
  { value: 140, label: 'กลาง', desc: '140 px' },
  { value: 180, label: 'ใหญ่', desc: '180 px' },
]

export default function QRSettingsModal({ open, onClose }) {
  const [cfg, setCfg] = useState(loadQRSettings)

  if (!open) return null

  const toggleField = (key) => {
    setCfg(s => ({
      ...s,
      displayFields: s.displayFields.includes(key)
        ? s.displayFields.filter(k => k !== key)
        : [...s.displayFields, key],
    }))
  }

  const handleSave = () => {
    saveQRSettings(cfg)
    onClose()
  }

  const handleReset = () => setCfg({ ...QR_DEFAULTS })

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,4,16,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 501,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }} onClick={onClose}>
        <div style={{
          width: 440, maxWidth: '100%',
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 48px)',
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', flexShrink: 0,
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.01em' }}>
                ตั้งค่าการแสดงผล QR
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 500, marginTop: 1 }}>
                เลือกข้อมูลที่แสดงบน label QR code
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 9,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-500)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={13} /></button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>

            {/* QR Size */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-400)',
                marginBottom: 10,
              }}>ขนาด QR Code</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SIZE_OPTS.map(opt => {
                  const active = cfg.qrSize === opt.value
                  return (
                    <button key={opt.value} onClick={() => setCfg(s => ({ ...s, qrSize: opt.value }))} style={{
                      flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${active ? '#6366f1' : 'var(--border)'}`,
                      background: active ? 'rgba(99,102,241,0.08)' : 'var(--bg-page)',
                      transition: 'all 150ms', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: active ? '#6366f1' : 'var(--text-800)' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Field selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-400)',
                }}>คอลัมน์ที่แสดง</div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#6366f1',
                  background: 'rgba(99,102,241,0.1)', padding: '2px 8px',
                  borderRadius: 99, border: '1px solid rgba(99,102,241,0.2)',
                }}>
                  {cfg.displayFields.length} คอลัมน์
                </span>
              </div>

              {/* Always-on: Serial */}
              <div style={{
                padding: '10px 14px', borderRadius: 11, marginBottom: 6,
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)' }}>Serial ปัจจุบัน</div>
                  <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1 }}>Serial_NOW · แสดงเสมอ (ข้อมูลใน QR)</div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: '#6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} strokeWidth={3} style={{ color: '#fff' }} />
                </div>
              </div>

              {/* Toggleable fields */}
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}>
                {QR_FIELDS.map((f, i) => {
                  const active = cfg.displayFields.includes(f.key)
                  return (
                    <div key={f.key} onClick={() => toggleField(f.key)} style={{
                      padding: '11px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                      background: active ? 'rgba(99,102,241,0.04)' : 'var(--bg-page)',
                      transition: 'background 120ms',
                    }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-row-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(99,102,241,0.04)' : 'var(--bg-page)' }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${active ? '#6366f1' : 'var(--border)'}`,
                        background: active ? '#6366f1' : 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms',
                      }}>
                        {active && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          color: active ? 'var(--text-900)' : 'var(--text-600)',
                          transition: 'color 150ms',
                        }}>{f.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1, fontFamily: 'monospace' }}>
                          {f.key}
                        </div>
                      </div>

                      {active && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#6366f1',
                          background: 'rgba(99,102,241,0.1)',
                          padding: '2px 7px', borderRadius: 99,
                        }}>แสดง</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Preview hint */}
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 11,
              background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
              fontSize: 11, color: 'var(--text-500)', lineHeight: 1.6,
            }}>
              ลำดับการแสดง: <strong style={{ color: 'var(--text-700)' }}>Serial</strong>
              {cfg.displayFields.length > 0 && (
                <> → {cfg.displayFields.map((k, i) => (
                  <span key={k}>
                    <strong style={{ color: 'var(--text-700)' }}>{k}</strong>
                    {i < cfg.displayFields.length - 1 && ' → '}
                  </span>
                ))}</>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 20px', flexShrink: 0,
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-modal-footer)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <button onClick={handleReset} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'var(--bg-page)',
              color: 'var(--text-600)', border: '1px solid var(--border)',
              transition: 'all 150ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-900)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-600)' }}
            >
              <RotateCcw size={12} /> รีเซ็ต
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'var(--bg-page)',
              color: 'var(--text-700)', border: '1px solid var(--border)',
            }}>ยกเลิก</button>
            <button onClick={handleSave} style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)',
              color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 2px 8px rgba(10,20,50,0.3)',
            }}>บันทึก</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
