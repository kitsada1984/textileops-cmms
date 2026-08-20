import { useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { X, Download, Printer, Loader, Settings2 } from 'lucide-react'
import { QR_FIELDS, loadQRSettings } from '../utils/qrSettings'
import { getAppBaseUrl } from '../utils/telegram'
import QRSettingsModal from './CylinderQRSettings'

const FIELD_MAP = Object.fromEntries(QR_FIELDS.map(f => [f.key, f.label]))

async function genSVG(value, size = 120) {
  return QRCode.toString(value, {
    type: 'svg',
    width: size,
    margin: 1,
    color: { dark: '#0f1d35', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

/* ── Download ZIP of all QR SVGs ─────────────────────────────────────────── */
export async function downloadAllQRZip(cylinders, onProgress) {
  const cfg = loadQRSettings()
  const zip = new JSZip()
  const folder = zip.folder('CylinderQR')
  const baseUrl = getAppBaseUrl()
  for (let i = 0; i < cylinders.length; i++) {
    const c = cylinders[i]
    const serial = c.Serial_NOW || `CYL_${i + 1}`
    const qrValue = cfg.useUrl ? `${baseUrl}/repair/${serial}` : serial
    const svg = await genSVG(qrValue, cfg.qrSize)
    folder.file(`${serial.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`, svg)
    onProgress?.(i + 1, cylinders.length)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'CylinderQR_All.zip'
  a.click(); URL.revokeObjectURL(url)
}

/* ── Print-all HTML page ─────────────────────────────────────────────────── */
export async function printAllQR(cylinders, onProgress) {
  const cfg     = loadQRSettings()
  const size    = cfg.qrSize ?? 120
  const baseUrl = getAppBaseUrl()
  const items   = []
  for (let i = 0; i < cylinders.length; i++) {
    const c = cylinders[i]
    const serial  = c.Serial_NOW || `—`
    const qrValue = cfg.useUrl ? `${baseUrl}/repair/${serial}` : serial
    const svg = await genSVG(qrValue, size)
    const b64 = btoa(unescape(encodeURIComponent(svg)))
    items.push({ ...c, _b64: b64 })
    onProgress?.(i + 1, cylinders.length)
  }

  const rows = items.map(c => {
    const extraMeta = cfg.displayFields
      .map(key => c[key])
      .filter(v => v != null && String(v).trim() !== '')
      .map(v => `<div class="meta">${v}</div>`)
      .join('')
    return `
    <div class="label">
      <img src="data:image/svg+xml;base64,${c._b64}" width="${size}" height="${size}" />
      <div class="info">
        <div class="serial">${c.Serial_NOW || '—'}</div>
        ${extraMeta}
      </div>
    </div>`
  }).join('')

  const w = window.open('', '_blank', 'width=960,height=700')
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cylinder QR Codes — All</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f7fc; padding: 20px; }
    h1 { font-size: 16px; font-weight: 800; color: #1a2745; margin-bottom: 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
    .label {
      background: #fff; border: 1.5px solid #d0d9ee;
      border-radius: 12px; padding: 10px 10px 8px;
      display: flex; flex-direction: column; align-items: center;
      page-break-inside: avoid; break-inside: avoid;
    }
    .label img { width: 120px; height: 120px; display: block; }
    .info { margin-top: 6px; text-align: center; width: 100%; }
    .serial {
      font-family: monospace; font-size: 13px; font-weight: 900;
      color: #0f1d35; letter-spacing: -0.01em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .meta {
      font-size: 10px; color: #7a8fa8; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .footer {
      margin-top: 20px; font-size: 10px; color: #aaa; text-align: center;
    }
    @media print {
      body { background: #fff; padding: 8px; }
      h1 { margin-bottom: 8px; }
      .label { border-color: #aaa; }
    }
    .no-print { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
    .btn-p {
      padding: 7px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;
      cursor: pointer; border: none;
      background: #1a2745; color: #fff;
    }
    .btn-p:hover { background: #243660; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-p" onclick="window.print()">🖨️ พิมพ์</button>
    <span style="font-size:13px;color:#888;">QR Codes ทั้งหมด ${items.length} รายการ</span>
  </div>
  <h1>Cylinder QR Codes — Gemma Knits · ${items.length} รายการ</h1>
  <div class="grid">${rows}</div>
  <div class="footer">TextileOps CMMS · Generated ${new Date().toLocaleString('th-TH')}</div>
</body>
</html>`)
  w.document.close()
}

/* ── Batch QR Modal ──────────────────────────────────────────────────────── */
export default function BatchQRModal({ open, onClose, cylinders }) {
  const [busy,        setBusy]        = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [total,       setTotal]       = useState(0)
  const [mode,        setMode]        = useState('')
  const [settingsOpen,setSettingsOpen] = useState(false)
  const [cfg,         setCfg]         = useState(loadQRSettings)

  if (!open) return null

  const onProg = (done, tot) => { setProgress(done); setTotal(tot) }

  const handleSettingsClose = () => {
    setSettingsOpen(false)
    setCfg(loadQRSettings())
  }

  const handleZip = async () => {
    setBusy(true); setMode('zip'); setProgress(0); setTotal(cylinders.length)
    try { await downloadAllQRZip(cylinders, onProg) }
    finally { setBusy(false); setMode('') }
  }

  const handlePrint = async () => {
    setBusy(true); setMode('print'); setProgress(0); setTotal(cylinders.length)
    try { await printAllQR(cylinders, onProg) }
    finally { setBusy(false); setMode('') }
  }

  const pct = total ? Math.round((progress / total) * 100) : 0

  return createPortal(
    <>
      <div onClick={!busy ? onClose : undefined} style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,4,16,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 401,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }} onClick={!busy ? onClose : undefined}>
        <div style={{
          width: 400, maxWidth: '100%',
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.01em' }}>
                ดาวน์โหลด QR ทั้งหมด
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 500, marginTop: 1 }}>
                {cylinders.length} รายการ
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {!busy && (
                <button onClick={() => setSettingsOpen(true)} title="ตั้งค่าการแสดงผล QR" style={{
                  width: 30, height: 30, borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-page)',
                  color: 'var(--text-500)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-thead)'; e.currentTarget.style.color = 'var(--text-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-500)' }}
                >
                  <Settings2 size={13} />
                </button>
              )}
              {!busy && (
                <button onClick={onClose} style={{
                  width: 30, height: 30, borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-500)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><X size={13} /></button>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 20px' }}>

            {/* Stats */}
            <div style={{
              display: 'flex', gap: 10, marginBottom: 20,
            }}>
              <div style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-900)', lineHeight: 1 }}>
                  {cylinders.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  กระบอก
                </div>
              </div>
              <div style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#6366f1', lineHeight: 1 }}>
                  {cylinders.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  QR Code
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {busy && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                }}>
                  <Loader size={13} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-600)', fontWeight: 600 }}>
                    {mode === 'zip' ? 'กำลังสร้างไฟล์ ZIP...' : 'กำลังสร้างหน้าพิมพ์...'}
                    &nbsp;{progress}/{total}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#6366f1' }}>{pct}%</span>
                </div>
                <div style={{
                  height: 6, borderRadius: 99,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    transition: 'width 150ms ease',
                  }} />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleZip} disabled={busy} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                background: busy ? 'var(--bg-thead)' : 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)',
                color: busy ? 'var(--text-400)' : '#fff',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: busy ? 'none' : '0 2px 8px rgba(10,20,50,0.35)',
                transition: 'all 150ms', opacity: busy && mode !== 'zip' ? 0.5 : 1,
              }}>
                {busy && mode === 'zip' ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                ดาวน์โหลด ZIP (SVG ทุกรายการ)
              </button>

              <button onClick={handlePrint} disabled={busy} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                background: 'var(--bg-page)',
                color: 'var(--text-700)',
                border: '1px solid var(--border)',
                transition: 'all 150ms', opacity: busy && mode !== 'print' ? 0.5 : 1,
              }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = 'var(--bg-thead)'; e.currentTarget.style.color = 'var(--text-900)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-700)' }}
              >
                {busy && mode === 'print' ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Printer size={14} />}
                เปิดหน้าพิมพ์ (Grid ทุกรายการ)
              </button>
            </div>

            {/* Current settings summary */}
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 11,
              background: 'var(--bg-page)', border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                การแสดงผลปัจจุบัน
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                  Serial (เสมอ)
                </span>
                {cfg.displayFields.map(key => (
                  <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-card)', color: 'var(--text-700)', border: '1px solid var(--border)' }}>
                    {FIELD_MAP[key] || key}
                  </span>
                ))}
                {cfg.displayFields.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-400)' }}>ไม่มีคอลัมน์เพิ่มเติม</span>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-400)' }}>
                ขนาด QR: {cfg.qrSize}px · กดไอคอน ⚙️ เพื่อเปลี่ยน
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <QRSettingsModal open={settingsOpen} onClose={handleSettingsClose} />
    </>,
    document.body
  )
}
