import { useState, useMemo, useEffect } from 'react'
import { ArrowLeftRight, Check, ChevronRight, ChevronLeft, Search, AlertTriangle, X } from 'lucide-react'
import Modal from './ui/Modal'
import { useT } from '../contexts/LanguageContext'
import { appendCylinderImageMeta, getCylinderImageUrl, stripCylinderImageMeta } from '../utils/cylinderImage'

/* ── Column definitions ──────────────────────────────────────────────────── */
const COL_DEFS = [
  { key: 'Location',     tKey: 'cyl_th_loc' },
  { key: 'Standard',     tKey: 'cyl_th_standard' },
  { key: 'NewMC',        tKey: 'cyl_th_newmc' },
  { key: 'Serial_OLD',   tKey: 'cyl_th_serial_old' },
  { key: 'Serial_NOW',   tKey: 'cyl_th_serial_now' },
  { key: 'Feeder',       tKey: 'cyl_th_feeder' },
  { key: 'Manufacturer', tKey: 'cyl_th_mfr' },
  { key: 'Type',         tKey: 'cyl_th_type' },
  { key: 'Diameter',     tKey: 'cyl_th_dia' },
  { key: 'Gauge',        tKey: 'cyl_th_gauge' },
  { key: 'Needle',       tKey: 'cyl_th_needle' },
  { key: 'Machine_Ref',  tKey: 'cyl_th_machine_ref' },
  { key: 'ImageUrl',     label: 'URL' },
  { key: 'ImagePreview', label: 'รูป', swapKey: 'ImageUrl', virtual: true },
  { key: 'Comment',      tKey: 'cyl_th_comment' },
]

const DEFAULT_SETTINGS = {
  version: 4,
  displayCols: ['Location', 'Standard', 'NewMC', 'Serial_OLD', 'Serial_NOW', 'Type', 'Machine_Ref', 'ImageUrl', 'ImagePreview'],
  swapCols:    ['Location', 'Machine_Ref', 'Feeder'],
}
const STORAGE_KEY = 'cyl_swap_settings'
const NON_SWAP_COLS = new Set(COL_DEFS.filter((col) => col.nonSwap).map((col) => col.key))
const unique = (items = []) => [...new Set(items.filter(Boolean))]
const getSwapKey = (key) => COL_DEFS.find((col) => col.key === key)?.swapKey || key
const getLinkedSwapKeys = (key) => {
  const swapKey = getSwapKey(key)
  return COL_DEFS.filter((col) => getSwapKey(col.key) === swapKey).map((col) => col.key)
}
const getActualSwapKeys = (keys = []) => unique(keys.map(getSwapKey)).filter((key) => !NON_SWAP_COLS.has(key))
const isColumnSwap = (col, swapCols = []) => {
  if (col.nonSwap) return false
  const actualSwapCols = getActualSwapKeys(swapCols)
  return actualSwapCols.includes(getSwapKey(col.key))
}

const normalizeCfg = (saved = {}) => {
  const isOldCfg = saved.version !== DEFAULT_SETTINGS.version
  const displayCols = isOldCfg
    ? unique([...DEFAULT_SETTINGS.displayCols, ...(saved.displayCols || [])])
    : unique(saved.displayCols || DEFAULT_SETTINGS.displayCols)
  const swapCols = unique(saved.swapCols || DEFAULT_SETTINGS.swapCols)
    .filter((key) => !NON_SWAP_COLS.has(getSwapKey(key)))
  return { ...DEFAULT_SETTINGS, ...saved, version: DEFAULT_SETTINGS.version, displayCols, swapCols }
}

const loadCfg = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? normalizeCfg(saved) : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

/* ── Step Bar ────────────────────────────────────────────────────────────── */
function StepBar({ step }) {
  const steps = ['เลือกกระบอก', 'ตรวจสอบ', 'ยืนยัน']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, userSelect: 'none' }}>
      {steps.map((label, i) => {
        const s = i + 1
        const done   = step > s
        const active = step === s
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                transition: 'all 250ms cubic-bezier(0.4,0,0.2,1)',
                background: done
                  ? 'linear-gradient(135deg,#10b981,#059669)'
                  : active
                    ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                    : 'var(--bg-thead)',
                color: (done || active) ? '#fff' : 'var(--text-400)',
                boxShadow: active
                  ? '0 0 0 4px rgba(99,102,241,0.18), 0 2px 8px rgba(99,102,241,0.35)'
                  : done
                    ? '0 2px 6px rgba(16,185,129,0.3)'
                    : 'none',
              }}>
                {done ? <Check size={12} strokeWidth={3}/> : s}
              </div>
              <span style={{
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? 'var(--text-900)' : done ? '#10b981' : 'var(--text-400)',
                whiteSpace: 'nowrap',
                transition: 'color 250ms',
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 10px',
                background: step > s
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : 'var(--border)',
                borderRadius: 99,
                transition: 'background 400ms',
              }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Cylinder ID chip ────────────────────────────────────────────────────── */
function CylChip({ cyl, color, accent, label }) {
  const currentMachine = cyl?.NewMC || cyl?.Standard
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '6px 14px', borderRadius: 12,
      background: `${accent}12`, border: `1.5px solid ${accent}35`,
      minWidth: 100,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>
        {cyl?.Serial_NOW || '—'}
      </span>
      {currentMachine && (
        <span style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1 }}>{currentMachine}</span>
      )}
    </div>
  )
}

/* ── Cylinder selector ───────────────────────────────────────────────────── */
function CylSelector({
  label,
  color,
  accent,
  search,
  setSearch,
  machineFilter,
  setMachineFilter,
  machineOptions,
  selectedId,
  setSelectedId,
  options,
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      borderRadius: 16, overflow: 'hidden',
      border: `1.5px solid ${selectedId ? accent + '50' : 'var(--border)'}`,
      background: 'var(--bg-input)',
      transition: 'border-color 200ms, box-shadow 200ms',
      boxShadow: selectedId ? `0 0 0 3px ${accent}15, 0 4px 16px ${accent}10` : 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        background: selectedId ? `${accent}08` : 'var(--bg-thead)',
        borderBottom: `1px solid ${selectedId ? accent + '20' : 'var(--border-subtle)'}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: selectedId ? accent : 'var(--text-300)',
          boxShadow: selectedId ? `0 0 6px ${accent}` : 'none',
          transition: 'all 200ms',
        }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      {/* Search */}
      <div style={{ padding: '8px 10px 6px', position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: 19, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)', pointerEvents: 'none' }}/>
        <input
          className="input"
          style={{ paddingLeft: 30, fontSize: 12, background: 'var(--bg-card)' }}
          placeholder="ค้นหา Serial / Location / เครื่องปัจจุบัน..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={{ padding: '0 10px 6px' }}>
        <select
          className="select"
          value={machineFilter}
          onChange={e => setMachineFilter(e.target.value)}
          style={{ fontSize: 12, background: 'var(--bg-card)' }}
        >
          <option value="">ทุกเครื่องปัจจุบัน</option>
          {machineOptions.map(machine => (
            <option key={machine} value={machine}>{machine}</option>
          ))}
        </select>
      </div>
      {/* List */}
      <div style={{ maxHeight: 180, overflowY: 'auto', padding: '0 6px 6px' }}>
        {options.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-400)', fontSize: 12 }}>ไม่พบข้อมูล</div>
        )}
        {options.map(c => {
          const id  = c._id || c.id
          const sel = id === selectedId
          return (
            <div key={id} onClick={() => setSelectedId(sel ? '' : id)} style={{
              padding: '7px 10px', cursor: 'pointer', fontSize: 12, borderRadius: 10,
              marginBottom: 2,
              background: sel ? `${accent}15` : 'transparent',
              border: `1px solid ${sel ? accent + '35' : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 120ms',
            }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-row-hover)' }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: sel ? color : 'var(--text-900)', fontSize: 13 }}>
                {c.Serial_NOW || '—'}
              </span>
              {c.Location && <span style={{ color: 'var(--text-500)', fontSize: 11 }}>{c.Location}</span>}
              {c.NewMC && (
                <span style={{ color: 'var(--text-400)', fontSize: 10, marginLeft: 'auto' }}>{c.NewMC}</span>
              )}
              {sel && <Check size={12} style={{ color: accent, marginLeft: 'auto', flexShrink: 0 }}/>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Value cell (shows old→new on step 3, or plain on step 2) ────────────── */
function ValCell({ val, oldVal, changed, accentColor }) {
  if (!changed) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-600)' }}>
        {val || <span style={{ color: 'var(--text-300)' }}>—</span>}
      </span>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-300)', textDecoration: 'line-through', lineHeight: 1 }}>
        {oldVal || '—'}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: accentColor, lineHeight: 1 }}>
        {val || '—'}
      </span>
    </div>
  )
}

function ImageValue({ url }) {
  if (!url) {
    return <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-300)' }}>—</span>
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-block',
        maxWidth: 150,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: '#2563eb',
        textDecoration: 'underline',
        fontSize: 12,
      }}
    >
      {url}
    </a>
  )
}

function getCompareValue(cyl, key) {
  if (key === 'ImageUrl' || key === 'ImagePreview') return getCylinderImageUrl(cyl)
  if (key === 'Comment') return stripCylinderImageMeta(cyl?.Comment)
  return cyl?.[key]
}

function CompareValue({ col, val, oldVal, changed, accentColor }) {
  if (col.key === 'ImageUrl') return <ImageValue url={val} />
  if (col.key === 'ImagePreview') {
    return val
      ? <a href={val} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'underline', fontSize:12 }}>เปิดรูป</a>
      : <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-300)' }}>—</span>
  }
  return <ValCell val={val} oldVal={oldVal} changed={changed} accentColor={accentColor} />
}

/* ── Compare Table ───────────────────────────────────────────────────────── */
function CompareTable({ displayCols, swapCols, cylIn, cylOut, afterSwap }) {
  const isConfirm = !!afterSwap
  const swapCount = displayCols.filter(c => isColumnSwap(c, swapCols)).length

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
      {/* Cylinder header bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 52px 1fr 24px 1fr',
        padding: '10px 16px', gap: 8, alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(99,102,241,0.06) 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-400)' }}>คอลัมน์</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-400)', textAlign: 'center' }}>สถานะ</span>
        <CylChip cyl={cylOut} color="#d97706" accent="#f59e0b" label="OUT" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeftRight size={13} style={{ color: 'var(--text-300)' }}/>
        </div>
        <CylChip cyl={cylIn}  color="#4f46e5" accent="#6366f1" label="IN" />
      </div>

      {/* Legend */}
      {!isConfirm && swapCount > 0 && (
        <div style={{
          padding: '6px 16px', fontSize: 11,
          background: 'rgba(99,102,241,0.04)',
          borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--text-400)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6366f1', fontWeight: 600 }}>
            <ArrowLeftRight size={10}/> สลับ
          </span>
          <span style={{ color: 'var(--text-300)' }}>= ข้อมูลจะถูกแลกเปลี่ยน</span>
          <span style={{ color: 'var(--text-300)', marginLeft: 'auto' }}>{swapCount} คอลัมน์จะสลับ</span>
        </div>
      )}
      {isConfirm && (
        <div style={{
          padding: '6px 16px', fontSize: 11,
          background: 'rgba(16,185,129,0.05)',
          borderBottom: '1px solid rgba(16,185,129,0.15)',
          color: '#059669',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={11} strokeWidth={3}/>
          <span style={{ fontWeight: 600 }}>ตรวจสอบค่าหลังสลับ — ค่าที่เปลี่ยนแปลงแสดงด้วยสีเข้ม</span>
        </div>
      )}

      {/* Data rows */}
      {displayCols.map((col, idx) => {
        const isSwap = isColumnSwap(col, swapCols)
        const outOld = getCompareValue(cylOut, col.key)
        const inOld  = getCompareValue(cylIn, col.key)
        // swap rows: show future value (from the other cylinder), keep rows: show current value
        const outVal = isConfirm
          ? getCompareValue(afterSwap.newOut, col.key)
          : isSwap ? inOld : outOld
        const inVal = isConfirm
          ? getCompareValue(afterSwap.newIn, col.key)
          : isSwap ? outOld : inOld
        const outChanged = isSwap && String(outVal ?? '') !== String(outOld ?? '')
        const inChanged  = isSwap && String(inVal  ?? '') !== String(inOld  ?? '')

        return (
          <div key={col.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 52px 1fr 24px 1fr',
            padding: '9px 16px', gap: 8, alignItems: 'center',
            borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
            background: isSwap
              ? 'linear-gradient(90deg, rgba(99,102,241,0.025) 0%, rgba(245,158,11,0.025) 100%)'
              : 'transparent',
            boxShadow: isSwap ? 'inset 3px 0 0 rgba(99,102,241,0.5)' : 'none',
            transition: 'background 150ms',
          }}>
            {/* Column name */}
            <span style={{
              fontSize: 12,
              fontWeight: isSwap ? 600 : 500,
              color: isSwap ? 'var(--text-800)' : 'var(--text-500)',
            }}>{col.label}</span>

            {/* Status badge */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {isSwap ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 7px', borderRadius: 99,
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  fontSize: 10, fontWeight: 700, color: '#6366f1', whiteSpace: 'nowrap',
                }}>
                  <ArrowLeftRight size={8}/> สลับ
                </span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-300)', fontWeight: 500, whiteSpace: 'nowrap' }}>คงที่</span>
              )}
            </div>

            {/* OUT value */}
            <div style={{ textAlign: 'center' }}>
              <CompareValue col={col} val={outVal} oldVal={outOld} changed={outChanged} accentColor="#f59e0b" />
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSwap ? (
                <ArrowLeftRight size={11} style={{ color: 'rgba(99,102,241,0.35)' }}/>
              ) : (
                <div style={{ width: 11, height: 1, background: 'var(--border-subtle)' }}/>
              )}
            </div>

            {/* IN value */}
            <div style={{ textAlign: 'center' }}>
              <CompareValue col={col} val={inVal} oldVal={inOld} changed={inChanged} accentColor="#6366f1" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Settings Modal
═══════════════════════════════════════════════════════════════════════════ */
export function buildCylinderSwapPayload(cylIn, cylOut, swapCols = []) {
  if (!cylIn || !cylOut) return null
  const newIn  = { ...cylIn }
  const newOut = { ...cylOut }
  const actualSwapKeys = getActualSwapKeys(swapCols)

  actualSwapKeys.filter((key) => key !== 'ImageUrl').forEach(key => {
    newIn[key]  = cylOut[key] ?? null
    newOut[key] = cylIn[key] ?? null
  })

  if (actualSwapKeys.includes('ImageUrl')) {
    const inImageUrl = getCylinderImageUrl(cylOut)
    const outImageUrl = getCylinderImageUrl(cylIn)
    newIn.ImageUrl = inImageUrl
    newOut.ImageUrl = outImageUrl
    newIn.Comment = appendCylinderImageMeta(newIn.Comment, inImageUrl)
    newOut.Comment = appendCylinderImageMeta(newOut.Comment, outImageUrl)
  }

  return { newIn, newOut }
}

export function SwapSettingsModal({ open, onClose }) {
  const { t } = useT()
  const [cfg, setCfg] = useState(loadCfg)

  const colDefs = COL_DEFS.map(c => ({ ...c, label: c.label || t(c.tKey) || c.key }))

  const toggleDisplay = key => setCfg(s => ({
    ...s,
    displayCols: s.displayCols.includes(key)
      ? s.displayCols.filter(k => k !== key)
      : [...s.displayCols, key],
  }))

  const setMode = (key, mode) => setCfg(s => {
    if (NON_SWAP_COLS.has(getSwapKey(key))) return s
    const linkedKeys = getLinkedSwapKeys(key)
    const withoutLinked = s.swapCols.filter(k => !linkedKeys.includes(k))
    return {
      ...s,
      swapCols: mode === 'swap'
        ? unique([...withoutLinked, ...linkedKeys])
        : withoutLinked,
    }
  })

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
    onClose()
  }

  const displayCount = cfg.displayCols.length
  const swapCount    = cfg.swapCols.length

  return (
    <Modal open={open} onClose={onClose} title="ตั้งค่าสลับกระบอก" size="md"
      footer={<>
        <button className="btn-outline" style={{ marginRight: 'auto' }} onClick={() => setCfg(DEFAULT_SETTINGS)}>รีเซ็ต</button>
        <button className="btn-outline" onClick={onClose}>ยกเลิก</button>
        <button className="btn-primary" onClick={handleSave}>บันทึกการตั้งค่า</button>
      </>}
    >
      {/* Stats chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>{displayCount}</div>
          <div style={{ fontSize: 10, color: 'var(--text-500)', marginTop: 3 }}>แสดงในป๊อปอัพ</div>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{swapCount}</div>
          <div style={{ fontSize: 10, color: 'var(--text-500)', marginTop: 3 }}>สลับข้อมูล</div>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{displayCount - swapCount < 0 ? 0 : displayCount}</div>
          <div style={{ fontSize: 10, color: 'var(--text-500)', marginTop: 3 }}>คงที่</div>
        </div>
      </div>

      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 72px',
          padding: '8px 14px', background: 'var(--bg-thead)',
          borderBottom: '1px solid var(--border)',
        }}>
          {['คอลัมน์', 'แสดง', 'สลับ', 'คงที่'].map((h, i) => (
            <div key={h} style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: i === 2 ? '#6366f1' : 'var(--text-400)',
              textAlign: i > 0 ? 'center' : 'left',
            }}>{h}</div>
          ))}
        </div>
        {colDefs.map((col, idx) => {
          const shown  = cfg.displayCols.includes(col.key)
          const isSwap = isColumnSwap(col, cfg.swapCols)
          return (
            <div key={col.key} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 72px',
              padding: '9px 14px', alignItems: 'center',
              borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
              background: shown ? 'transparent' : 'rgba(0,0,0,0.02)',
              opacity: shown ? 1 : 0.55,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-700)' }}>{col.label}</span>
              <div style={{ textAlign: 'center' }}>
                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-500"
                  checked={shown} onChange={() => toggleDisplay(col.key)} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <input type="radio" name={`mode_${col.key}`} className="w-4 h-4 cursor-pointer accent-indigo-500"
                  checked={isSwap} disabled={col.nonSwap} onChange={() => setMode(col.key, 'swap')} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <input type="radio" name={`mode_${col.key}`} className="w-4 h-4 cursor-pointer accent-indigo-500"
                  checked={!isSwap} onChange={() => setMode(col.key, 'keep')} />
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Swap Modal  (3 steps)
═══════════════════════════════════════════════════════════════════════════ */
export default function SwapCylinderModal({ open, onClose, data, onSwap }) {
  const { t } = useT()
  const [step,      setStep]      = useState(1)
  const [inId,      setInId]      = useState('')
  const [outId,     setOutId]     = useState('')
  const [inSearch,  setInSearch]  = useState('')
  const [outSearch, setOutSearch] = useState('')
  const [inMachine, setInMachine] = useState('')
  const [outMachine, setOutMachine] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [cfg,       setCfg]       = useState(loadCfg)

  useEffect(() => { if (open) setCfg(loadCfg()) }, [open])

  const colDefs     = COL_DEFS.map(c => ({ ...c, label: c.label || t(c.tKey) || c.key }))
  const displayCols = colDefs.filter(c => cfg.displayCols.includes(c.key))

  const cylIn  = data.find(c => (c._id || c.id) === inId)
  const cylOut = data.find(c => (c._id || c.id) === outId)
  const machineOptions = useMemo(() => {
    return unique(data.map(c => String(c.NewMC || '').trim()))
      .sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }))
  }, [data])

  const afterSwap = useMemo(() => {
    return buildCylinderSwapPayload(cylIn, cylOut, cfg.swapCols)
  }, [cylIn, cylOut, cfg])

  const reset = () => {
    setStep(1); setInId(''); setOutId('')
    setInSearch(''); setOutSearch('')
    setInMachine(''); setOutMachine('')
    setSaving(false)
  }
  const handleClose = () => { reset(); onClose() }

  const filteredIn = data.filter(c => {
    if ((c._id || c.id) === outId) return false
    if (inMachine && String(c.NewMC || '').trim() !== inMachine) return false
    const q = inSearch.toLowerCase()
    return !q || [c.Serial_NOW, c.Location, c.Standard, c.NewMC].some(v => String(v||'').toLowerCase().includes(q))
  })
  const filteredOut = data.filter(c => {
    if ((c._id || c.id) === inId) return false
    if (outMachine && String(c.NewMC || '').trim() !== outMachine) return false
    const q = outSearch.toLowerCase()
    return !q || [c.Serial_NOW, c.Location, c.Standard, c.NewMC].some(v => String(v||'').toLowerCase().includes(q))
  })

  const handleConfirm = async () => {
    if (!afterSwap) return
    setSaving(true)
    try {
      await onSwap(afterSwap.newIn, afterSwap.newOut, { inId, outId, swapCols: cfg.swapCols })
      handleClose()
    } catch (e) {
      alert(e.message)
      setSaving(false)
    }
  }

  /* ── Step 1: Select ──────────────────────────────────────────────────── */
  const renderStep1 = () => (
    <div>
      <StepBar step={step} />
      <div className="flex flex-col sm:flex-row gap-3">
        <CylSelector
          label="กระบอก OUT (ออก)" color="#d97706" accent="#f59e0b"
          search={outSearch} setSearch={setOutSearch}
          machineFilter={outMachine} setMachineFilter={setOutMachine}
          machineOptions={machineOptions}
          selectedId={outId} setSelectedId={setOutId}
          options={filteredOut}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (cylIn && cylOut) ? 'linear-gradient(135deg,#6366f1,#f59e0b)' : 'var(--bg-thead)',
            boxShadow: (cylIn && cylOut) ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
            transition: 'all 300ms',
          }}>
            <ArrowLeftRight size={14} style={{ color: (cylIn && cylOut) ? '#fff' : 'var(--text-400)' }}/>
          </div>
        </div>
        <CylSelector
          label="กระบอก IN (เข้า)"  color="#4f46e5" accent="#6366f1"
          search={inSearch} setSearch={setInSearch}
          machineFilter={inMachine} setMachineFilter={setInMachine}
          machineOptions={machineOptions}
          selectedId={inId} setSelectedId={setInId}
          options={filteredIn}
        />
      </div>

      {cylIn && cylOut && (
        <div style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 12,
          background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={11} style={{ color: '#fff' }} strokeWidth={3}/>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-700)' }}>
            เลือกแล้ว:&nbsp;
            <strong style={{ fontFamily: 'monospace', color: '#d97706' }}>{cylOut.Serial_NOW}</strong>
            &nbsp;
            <ArrowLeftRight size={11} style={{ display: 'inline', color: 'var(--text-400)', verticalAlign: 'middle' }}/>
            &nbsp;
            <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{cylIn.Serial_NOW}</strong>
          </div>
        </div>
      )}
    </div>
  )

  /* ── Step 2: Preview ─────────────────────────────────────────────────── */
  const renderStep2 = () => (
    <div>
      <StepBar step={step} />
      <CompareTable displayCols={displayCols} swapCols={cfg.swapCols} cylIn={cylIn} cylOut={cylOut} afterSwap={null} />
      <div style={{
        marginTop: 12, padding: '10px 16px', borderRadius: 12,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}/>
        <span style={{ fontSize: 12, color: 'var(--text-600)', lineHeight: 1.6 }}>
          ตรวจสอบคอลัมน์ที่จะ <strong style={{ color: '#6366f1' }}>สลับ</strong> ให้ถูกต้อง
          แล้วกด <strong style={{ color: '#d97706' }}>"สลับกระบอก"</strong> เพื่อดูผลลัพธ์
        </span>
      </div>
    </div>
  )

  /* ── Step 3: Confirm ─────────────────────────────────────────────────── */
  const renderStep3 = () => (
    <div>
      <StepBar step={step} />
      <CompareTable displayCols={displayCols} swapCols={cfg.swapCols} cylIn={cylIn} cylOut={cylOut} afterSwap={afterSwap} />
    </div>
  )

  /* ── Footers ─────────────────────────────────────────────────────────── */
  const footer1 = (
    <>
      <button className="btn-outline" onClick={handleClose}>ยกเลิก</button>
      <button className="btn-primary" disabled={!cylIn || !cylOut} onClick={() => setStep(2)}
        style={{ opacity: (!cylIn || !cylOut) ? 0.5 : 1 }}>
        ถัดไป <ChevronRight size={13}/>
      </button>
    </>
  )

  const footer2 = (
    <>
      <button className="btn-outline" onClick={() => setStep(1)}><ChevronLeft size={13}/> ย้อนกลับ</button>
      <button onClick={() => setStep(3)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
        background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
        color: '#fff', boxShadow: '0 4px 14px rgba(217,119,6,0.4)',
        transition: 'all 150ms',
      }}>
        <ArrowLeftRight size={14}/> สลับกระบอก
      </button>
    </>
  )

  const footer3 = (
    <>
      <button className="btn-outline" onClick={() => setStep(2)}><ChevronLeft size={13}/> ย้อนกลับ</button>
      <button onClick={handleConfirm} disabled={saving} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
        background: saving ? 'var(--bg-thead)' : 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
        color: saving ? 'var(--text-400)' : '#fff',
        boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.4)',
        transition: 'all 150ms',
        opacity: saving ? 0.7 : 1,
      }}>
        <Check size={14} strokeWidth={3}/> {saving ? 'กำลังบันทึก...' : 'ยืนยันสลับกระบอก'}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={handleClose} title="สลับกระบอก" size="lg"
      footer={step === 1 ? footer1 : step === 2 ? footer2 : footer3}
    >
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </Modal>
  )
}
