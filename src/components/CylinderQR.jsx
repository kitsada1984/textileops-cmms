import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Download } from 'lucide-react'
import { QR_FIELDS, loadQRSettings } from '../utils/qrSettings'
import { getAppBaseUrl } from '../utils/telegram'

const FIELD_MAP = Object.fromEntries(QR_FIELDS.map(f => [f.key, f.label]))

export default function CylinderQRModal({ open, onClose, cylinder }) {
  const qrRef = useRef(null)

  if (!open || !cylinder) return null

  const cfg        = loadQRSettings()
  const serial     = cylinder.Serial_NOW || '—'
  const qrValue    = cfg.useUrl ? `${getAppBaseUrl()}/repair/${serial}` : serial
  const qrSize     = cfg.qrSize ?? 140

  // Build the display rows: always Serial first, then user-configured fields
  const infoRows = [
    ['Serial', serial],
    ...cfg.displayFields
      .map(key => [FIELD_MAP[key] || key, cylinder[key]])
      .filter(([, v]) => v != null && String(v).trim() !== ''),
  ]

  const handlePrint = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgB64  = btoa(unescape(encodeURIComponent(svgData)))

    const infoHtml = infoRows.slice(1).map(([k, v]) =>
      `<div class="info-row"><span class="k">${k}</span><span class="v">${v}</span></div>`
    ).join('')

    const w = window.open('', '_blank', 'width=420,height=560')
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QR - ${serial}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; display: flex; justify-content: center; padding: 24px; background: #fff; }
    .label { width: 320px; border: 2px solid #1a2745; border-radius: 14px; overflow: hidden; }
    .label-header { background: #1a2745; color: #fff; padding: 10px 14px; }
    .label-header .brand { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6; }
    .label-header .title { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; margin-top: 2px; }
    .label-body { padding: 14px; display: flex; gap: 14px; align-items: flex-start; }
    .qr-wrap img { width: ${qrSize}px; height: ${qrSize}px; display: block; }
    .info { flex: 1; }
    .info-row { margin-bottom: 7px; }
    .info-row .k { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; display: block; margin-bottom: 1px; }
    .info-row .v { font-size: 13px; font-weight: 700; color: #0f1d35; }
    .label-footer { border-top: 1px solid #eee; padding: 7px 14px; font-size: 10px; color: #aaa; text-align: center; }
    @media print { body { padding: 8px; } .label { border-color: #000; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-header">
      <div class="brand">Gemma Knits · Cylinder</div>
      <div class="title">${serial}</div>
    </div>
    <div class="label-body">
      <div class="qr-wrap"><img src="data:image/svg+xml;base64,${svgB64}" /></div>
      <div class="info">${infoHtml}</div>
    </div>
    <div class="label-footer">TextileOps CMMS · Scan to identify</div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`)
    w.document.close()
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob    = new Blob([svgData], { type: 'image/svg+xml' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `QR-${serial}.svg`
    a.click(); URL.revokeObjectURL(url)
  }

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,4,16,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 401,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }} onClick={onClose}>
        <div style={{
          width: 380, maxWidth: '100%',
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
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-900)', letterSpacing: '-0.01em' }}>QR Code</div>
              <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 500, marginTop: 1 }}>{serial}</div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: 9,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-500)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={13} /></button>
          </div>

          {/* QR area */}
          <div style={{ padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>

            {/* QR code */}
            <div ref={qrRef} style={{
              padding: 14, borderRadius: 16,
              background: '#ffffff',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              display: 'inline-block',
            }}>
              <QRCodeSVG value={qrValue} size={qrSize} bgColor="#ffffff" fgColor="#0f1d35" level="M" />
            </div>

            {/* Info card */}
            <div style={{
              width: '100%', background: 'var(--bg-page)',
              borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden',
            }}>
              {infoRows.map(([k, v], i) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderBottom: i < infoRows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-800)', fontFamily: i === 0 ? 'monospace' : 'inherit', maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={handlePrint} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: 'linear-gradient(135deg, #1a2745 0%, #0d1629 100%)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 2px 8px rgba(10,20,50,0.35)', transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Printer size={13} /> พิมพ์
              </button>
              <button onClick={handleDownload} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: 'var(--bg-page)', color: 'var(--text-700)', border: '1px solid var(--border)', transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-thead)'; e.currentTarget.style.color = 'var(--text-900)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-700)' }}
              >
                <Download size={13} /> ดาวน์โหลด SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
