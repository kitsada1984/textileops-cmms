import { useState, useMemo, useEffect } from 'react'
import {
  History,
  ArrowLeftRight,
  Pencil,
  Calendar,
  User,
  Cpu,
  Disc,
  Search,
  Check,
  CheckCircle2,
  Layers,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  TableProperties,
} from 'lucide-react'
import Modal from './ui/Modal'
import {
  filterCylinderHistory,
  summarizeCylinderHistory,
  formatHistoryDate,
  buildUpdateCompareTable,
  findCylinderBySerial,
} from '../utils/cylinderHistory'
import { CylinderAPI } from '../api/entities'
import { getCylinderImageUrl, stripCylinderImageMeta } from '../utils/cylinderImage'

/* ── Column Definitions matching SwapCylinder.jsx ──────────────────────── */
const SWAP_COL_DEFS = [
  { key: 'Location',     label: 'ตำแหน่ง' },
  { key: 'Standard',     label: 'มาตรฐาน Mc' },
  { key: 'NewMC',        label: 'เครื่องปัจจุบัน' },
  { key: 'Serial_OLD',   label: 'ซีเรียลเดิม' },
  { key: 'Serial_NOW',   label: 'ซีเรียลปัจจุบัน' },
  { key: 'Type',         label: 'ประเภท' },
  { key: 'Gauge',        label: 'เกจ' },
  { key: 'Needle',       label: 'เข็ม' },
  { key: 'Machine_Ref',  label: 'อ้างอิงกระบอก' },
  { key: 'ImageUrl',     label: 'URL' },
  { key: 'ImagePreview', label: 'รูป', swapKey: 'ImageUrl', virtual: true },
  { key: 'Feeder',       label: 'ฟีดเดอร์' },
  { key: 'Manufacturer', label: 'ผู้ผลิต' },
  { key: 'Diameter',     label: 'ขนาด' },
  { key: 'Comment',      label: 'หมายเหตุ' },
]

const getSwapKey = (key) => SWAP_COL_DEFS.find((col) => col.key === key)?.swapKey || key

const isColumnSwap = (col, swapCols = []) => {
  const actualKey = getSwapKey(col.key || col)
  return swapCols.some((sc) => sc === actualKey || sc.toLowerCase() === actualKey.toLowerCase())
}

/* ── Step Bar matching SwapCylinder.jsx ────────────────────────────────── */
function StepBar({ step, onStepClick }) {
  const steps = ['เลือกกระบอก', 'ตรวจสอบ', 'ยืนยัน']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, userSelect: 'none' }}>
      {steps.map((label, i) => {
        const s = i + 1
        const done = step > s
        const active = step === s
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div
              onClick={() => onStepClick?.(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                cursor: onStepClick ? 'pointer' : 'default',
              }}
            >
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
                {done ? <Check size={12} strokeWidth={3} /> : s}
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
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Cylinder ID Chip matching SwapCylinder.jsx ────────────────────────── */
function CylChip({ cyl, color, accent, label }) {
  const currentMachine = cyl?.NewMC || cyl?.Standard
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '6px 14px', borderRadius: 12,
      background: `${accent}12`, border: `1.5px solid ${accent}35`,
      minWidth: 100,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: accent }}>
        {label}
      </span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>
        {cyl?.Serial_NOW || '—'}
      </span>
      {currentMachine && (
        <span style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 1 }}>{currentMachine}</span>
      )}
    </div>
  )
}

/* ── Value Cell matching SwapCylinder.jsx ──────────────────────────────── */
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
        display: 'inline-block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', color: '#2563eb', textDecoration: 'underline', fontSize: 12,
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
      ? <a href={val} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 12 }}>เปิดรูป</a>
      : <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-300)' }}>—</span>
  }
  return <ValCell val={val} oldVal={oldVal} changed={changed} accentColor={accentColor} />
}

/* ── Compare Table matching SwapCylinder.jsx (exact 1:1) ───────────────── */
function CompareTable({ displayCols, swapCols, cylIn, cylOut, afterSwap }) {
  const isConfirm = !!afterSwap
  const swapCount = displayCols.filter((c) => isColumnSwap(c, swapCols)).length

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
          <ArrowLeftRight size={13} style={{ color: 'var(--text-300)' }} />
        </div>
        <CylChip cyl={cylIn} color="#4f46e5" accent="#6366f1" label="IN" />
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
            <ArrowLeftRight size={10} /> สลับ
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
          <Check size={11} strokeWidth={3} />
          <span style={{ fontWeight: 600 }}>ตรวจสอบค่าหลังสลับ — ค่าที่เปลี่ยนแปลงแสดงด้วยสีเข้ม</span>
        </div>
      )}

      {/* Data rows */}
      {displayCols.map((col, idx) => {
        const isSwap = isColumnSwap(col, swapCols)
        const outOld = getCompareValue(cylOut, col.key)
        const inOld = getCompareValue(cylIn, col.key)

        // In step 2 (not confirm): swap rows show future value from the other cylinder, keep rows show current value
        const outVal = isConfirm
          ? getCompareValue(afterSwap?.newOut, col.key)
          : isSwap ? inOld : outOld
        const inVal = isConfirm
          ? getCompareValue(afterSwap?.newIn, col.key)
          : isSwap ? outOld : inOld
        const outChanged = isSwap && String(outVal ?? '') !== String(outOld ?? '')
        const inChanged = isSwap && String(inVal ?? '') !== String(inOld ?? '')

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
                  <ArrowLeftRight size={8} /> สลับ
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
                <ArrowLeftRight size={11} style={{ color: 'rgba(99,102,241,0.35)' }} />
              ) : (
                <div style={{ width: 11, height: 1, background: 'var(--border-subtle)' }} />
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

/**
 * Reconstructs cylinder records from a SWAP history log item, enriching with
 * cylinder master specifications (Type, Gauge, Needle, Standard, etc.) by serial.
 */
export function reconstructSwapCylinders(item, cylinders = []) {
  const swapCols = Array.isArray(item.swapCols) ? item.swapCols : ['Location', 'Machine_Ref', 'Feeder']

  const rawOut = item.snapshotOutBefore || item.outBefore || {}
  const rawIn = item.snapshotInBefore || item.inBefore || {}
  const afterOut = item.snapshotOutAfter || item.out || {}
  const afterIn = item.snapshotInAfter || item.in || {}

  let fallbackOutSerial = ''
  let fallbackInSerial = ''
  if (item.raw?.RecordID && (item.raw.RecordID.includes('<->') || item.raw.RecordID.includes('↔'))) {
    const parts = item.raw.RecordID.split(/<->|↔/).map((s) => s.trim())
    if (parts.length >= 2) {
      fallbackOutSerial = parts[0]
      fallbackInSerial = parts[1]
    }
  }

  const outSerial =
    rawOut.Serial_NOW ||
    item.out?.serial ||
    rawOut.serial ||
    item.out?.Serial_NOW ||
    afterOut.Serial_NOW ||
    afterOut.serial ||
    fallbackOutSerial ||
    ''

  const inSerial =
    rawIn.Serial_NOW ||
    item.in?.serial ||
    rawIn.serial ||
    item.in?.Serial_NOW ||
    afterIn.Serial_NOW ||
    afterIn.serial ||
    fallbackInSerial ||
    ''

  const masterOut =
    findCylinderBySerial(outSerial, cylinders) ||
    findCylinderBySerial(rawOut.Serial_OLD || item.out?.Serial_OLD, cylinders)

  const masterIn =
    findCylinderBySerial(inSerial, cylinders) ||
    findCylinderBySerial(rawIn.Serial_OLD || item.in?.Serial_OLD, cylinders)

  // Base state before swap - enriched with master cylinder attributes by serial
  const cylOut = {
    Serial_NOW:
      rawOut.Serial_NOW ||
      item.out?.serial ||
      rawOut.serial ||
      masterOut?.Serial_NOW ||
      outSerial ||
      '',
    Serial_OLD:
      rawOut.Serial_OLD ||
      item.out?.Serial_OLD ||
      masterOut?.Serial_OLD ||
      rawOut.serial ||
      item.out?.serial ||
      masterOut?.Serial_NOW ||
      '',
    Standard:
      rawOut.Standard ||
      rawOut.standard ||
      item.out?.standard ||
      masterOut?.Standard ||
      '',
    NewMC:
      rawOut.NewMC ||
      rawOut.mc ||
      item.out?.mc ||
      masterOut?.NewMC ||
      '',
    Location:
      rawOut.Location ||
      rawOut.loc ||
      item.out?.loc ||
      masterOut?.Location ||
      '',
    Type:
      rawOut.Type ||
      rawOut.type ||
      item.out?.type ||
      masterOut?.Type ||
      '',
    Gauge:
      rawOut.Gauge ||
      rawOut.gauge ||
      item.out?.gauge ||
      masterOut?.Gauge ||
      '',
    Needle:
      rawOut.Needle ||
      rawOut.needle ||
      item.out?.needle ||
      masterOut?.Needle ||
      '',
    Diameter:
      rawOut.Diameter ||
      rawOut.dia ||
      item.out?.dia ||
      masterOut?.Diameter ||
      '',
    Feeder:
      rawOut.Feeder ||
      rawOut.feeder ||
      item.out?.feeder ||
      masterOut?.Feeder ||
      '',
    Manufacturer:
      rawOut.Manufacturer ||
      rawOut.mfr ||
      item.out?.mfr ||
      masterOut?.Manufacturer ||
      '',
    Machine_Ref:
      rawOut.Machine_Ref ||
      rawOut.machineRef ||
      item.out?.machineRef ||
      masterOut?.Machine_Ref ||
      '',
    ImageUrl:
      rawOut.ImageUrl ||
      masterOut?.ImageUrl ||
      '',
    Comment:
      rawOut.Comment ||
      item.comment ||
      masterOut?.Comment ||
      '',
  }

  const cylIn = {
    Serial_NOW:
      rawIn.Serial_NOW ||
      item.in?.serial ||
      rawIn.serial ||
      masterIn?.Serial_NOW ||
      inSerial ||
      '',
    Serial_OLD:
      rawIn.Serial_OLD ||
      item.in?.Serial_OLD ||
      masterIn?.Serial_OLD ||
      rawIn.serial ||
      item.in?.serial ||
      masterIn?.Serial_NOW ||
      '',
    Standard:
      rawIn.Standard ||
      rawIn.standard ||
      item.in?.standard ||
      masterIn?.Standard ||
      '',
    NewMC:
      rawIn.NewMC ||
      rawIn.mc ||
      item.in?.mc ||
      masterIn?.NewMC ||
      '',
    Location:
      rawIn.Location ||
      rawIn.loc ||
      item.in?.loc ||
      masterIn?.Location ||
      '',
    Type:
      rawIn.Type ||
      rawIn.type ||
      item.in?.type ||
      masterIn?.Type ||
      '',
    Gauge:
      rawIn.Gauge ||
      rawIn.gauge ||
      item.in?.gauge ||
      masterIn?.Gauge ||
      '',
    Needle:
      rawIn.Needle ||
      rawIn.needle ||
      item.in?.needle ||
      masterIn?.Needle ||
      '',
    Diameter:
      rawIn.Diameter ||
      rawIn.dia ||
      item.in?.dia ||
      masterIn?.Diameter ||
      '',
    Feeder:
      rawIn.Feeder ||
      rawIn.feeder ||
      item.in?.feeder ||
      masterIn?.Feeder ||
      '',
    Manufacturer:
      rawIn.Manufacturer ||
      rawIn.mfr ||
      item.in?.mfr ||
      masterIn?.Manufacturer ||
      '',
    Machine_Ref:
      rawIn.Machine_Ref ||
      rawIn.machineRef ||
      item.in?.machineRef ||
      masterIn?.Machine_Ref ||
      '',
    ImageUrl:
      rawIn.ImageUrl ||
      masterIn?.ImageUrl ||
      '',
    Comment:
      rawIn.Comment ||
      item.comment ||
      masterIn?.Comment ||
      '',
  }

  // Reciprocal location inference if location is swapped
  if (swapCols.includes('Location')) {
    if (!cylOut.Location && cylIn.Location) cylOut.Location = cylIn.Location
    if (!cylIn.Location && cylOut.Location) cylIn.Location = cylOut.Location
  }

  // After swap states
  const afterSwap = {
    newOut: {
      ...cylOut,
      Location: afterOut.Location || afterOut.loc || (swapCols.includes('Location') ? cylIn.Location : cylOut.Location),
      Machine_Ref: afterOut.Machine_Ref || afterOut.machineRef || (swapCols.includes('Machine_Ref') ? cylIn.Machine_Ref : cylOut.Machine_Ref),
      Feeder: afterOut.Feeder || afterOut.feeder || (swapCols.includes('Feeder') ? cylIn.Feeder : cylOut.Feeder),
      NewMC: afterOut.NewMC || afterOut.mc || cylOut.NewMC,
    },
    newIn: {
      ...cylIn,
      Location: afterIn.Location || afterIn.loc || (swapCols.includes('Location') ? cylOut.Location : cylIn.Location),
      Machine_Ref: afterIn.Machine_Ref || afterIn.machineRef || (swapCols.includes('Machine_Ref') ? cylOut.Machine_Ref : cylIn.Machine_Ref),
      Feeder: afterIn.Feeder || afterIn.feeder || (swapCols.includes('Feeder') ? cylOut.Feeder : cylIn.Feeder),
      NewMC: afterIn.NewMC || afterIn.mc || cylIn.NewMC,
    },
  }

  return { cylOut, cylIn, afterSwap, swapCols }
}

/**
 * Exact Swap View matching the user's screenshot 100%!
 */
function ExactSwapDetailView({ item, onBack, onClose, cylinders = [] }) {
  const [step, setStep] = useState(2) // Defaults to Step 2 (as seen in the user's screenshot)

  const { cylOut, cylIn, afterSwap, swapCols } = useMemo(() => {
    return reconstructSwapCylinders(item, cylinders)
  }, [item, cylinders])

  const displayCols = useMemo(() => {
    // Show standard columns in order, filtered to ones relevant
    const baseKeys = ['Location', 'Standard', 'NewMC', 'Serial_OLD', 'Serial_NOW', 'Type', 'Gauge', 'Needle', 'Machine_Ref', 'ImageUrl', 'ImagePreview']
    return SWAP_COL_DEFS.filter((col) => {
      if (baseKeys.includes(col.key)) return true
      if (isColumnSwap(col, swapCols)) return true
      const outV = getCompareValue(cylOut, col.key)
      const inV = getCompareValue(cylIn, col.key)
      return (outV !== undefined && outV !== null && outV !== '') ||
             (inV !== undefined && inV !== null && inV !== '')
    })
  }, [swapCols, cylIn, cylOut])

  return (
    <div className="space-y-3">
      {/* ── Step Bar (exact replica) ── */}
      <StepBar step={step} onStepClick={(s) => setStep(s)} />

      {step === 1 ? (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Disc size={14} className="text-indigo-500" />
            <span>กระบอกเข็มคู่ที่ทำการสลับ</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                  กระบอกเดิม (OUT)
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {cylOut.Standard || cylOut.NewMC || '—'}
                </span>
              </div>
              <div className="font-mono font-black text-base text-slate-800 dark:text-slate-100">
                {cylOut.Serial_NOW || '—'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-amber-500/15">
                <div>ตำแหน่ง: <strong>{cylOut.Location || '—'}</strong></div>
                <div>ประเภท: {cylOut.Type || '—'} | เกจ: {cylOut.Gauge || '—'}G | เข็ม: {cylOut.Needle || '—'} เล่ม</div>
                <div>อ้างอิง: {cylOut.Machine_Ref || '—'}</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">
                  กระบอกใหม่ (IN)
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {cylIn.Standard || cylIn.NewMC || '—'}
                </span>
              </div>
              <div className="font-mono font-black text-base text-slate-800 dark:text-slate-100">
                {cylIn.Serial_NOW || '—'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1 border-t border-indigo-500/15">
                <div>ตำแหน่ง: <strong>{cylIn.Location || '—'}</strong></div>
                <div>ประเภท: {cylIn.Type || '—'} | เกจ: {cylIn.Gauge || '—'}G | เข็ม: {cylIn.Needle || '—'} เล่ม</div>
                <div>อ้างอิง: {cylIn.Machine_Ref || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Compare Table (exact replica) ── */
        <CompareTable
          displayCols={displayCols}
          swapCols={swapCols}
          cylIn={cylIn}
          cylOut={cylOut}
          afterSwap={step === 3 ? afterSwap : null}
        />
      )}

      {/* ── Notice Box below table (exact replica of screenshot) ── */}
      {step === 2 ? (
        <div style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 12,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-600)', lineHeight: 1.6 }}>
            ตรวจสอบคอลัมน์ที่จะ <strong style={{ color: '#6366f1' }}>สลับ</strong> ให้ถูกต้อง
            แล้วกด <strong style={{ color: '#d97706' }}>"สลับกระบอก"</strong> เพื่อดูผลลัพธ์
          </span>
        </div>
      ) : step === 3 ? (
        <div style={{
          marginTop: 12, padding: '10px 16px', borderRadius: 12,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>
            รายการนี้บันทึกการสลับกระบอกเรียบร้อยแล้ว — ทำรายการเมื่อ {formatHistoryDate(item.date)} โดย {item.user}
          </span>
        </div>
      ) : null}

      {/* ── Footer matching SwapCylinder modal buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className="btn-outline"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronLeft size={13} /> ย้อนกลับ
        </button>

        {step === 1 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)',
              color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              transition: 'all 150ms',
            }}
          >
            <span>ถัดไป</span> <ChevronRight size={14} />
          </button>
        ) : step === 2 ? (
          <button
            type="button"
            onClick={() => setStep(3)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
              color: '#fff', boxShadow: '0 4px 14px rgba(217,119,6,0.4)',
              transition: 'all 150ms',
            }}
          >
            <ArrowLeftRight size={14} /> สลับกระบอก
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 10 }}
          >
            ปิด
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Update / Edit Details View for single cylinder edits.
 */
function UpdateDetailView({ item, onBack, onClose, cylinders = [] }) {
  const masterCyl = useMemo(() => {
    return findCylinderBySerial(item.serial || item.oldData?.Serial_NOW || item.newData?.Serial_NOW, cylinders)
  }, [item, cylinders])

  const { rows } = useMemo(() => buildUpdateCompareTable(item, masterCyl), [item, masterCyl])

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div style={{
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-700)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pencil size={14} className="text-blue-600" />
          <span>รายการแก้ไขข้อมูลกระบอก / ย้ายเครื่องจักร — ทำรายการเมื่อ {formatHistoryDate(item.date)} โดย {item.user}</span>
        </div>
        {masterCyl && (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
            กระบอก {masterCyl.Serial_NOW || item.serial} {masterCyl.Standard ? `(${masterCyl.Standard})` : ''}
          </span>
        )}
      </div>

      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(120px, 1.2fr) 68px minmax(100px, 1fr) 24px minmax(100px, 1fr)',
          padding: '8px 14px', background: 'var(--bg-thead)', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-400)',
        }}>
          <span>คอลัมน์</span>
          <span style={{ textAlign: 'center' }}>สถานะ</span>
          <span style={{ textAlign: 'center' }}>ค่าเดิม</span>
          <span style={{ textAlign: 'center' }}>➔</span>
          <span style={{ textAlign: 'center' }}>ค่าใหม่</span>
        </div>

        <div>
          {rows.map((row, idx) => (
            <div
              key={row.key}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(120px, 1.2fr) 68px minmax(100px, 1fr) 24px minmax(100px, 1fr)',
                padding: '9px 14px', alignItems: 'center', fontSize: 12,
                borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
                background: row.changed ? 'rgba(59,130,246,0.04)' : 'transparent',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-800)' }}>{row.label}</span>
              <div style={{ textAlign: 'center' }}>
                {row.changed ? (
                  <span style={{
                    padding: '2px 7px', borderRadius: 99,
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                    fontSize: 10, fontWeight: 700, color: '#2563eb',
                  }}>แก้ไข</span>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--text-300)' }}>คงที่</span>
                )}
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                <span style={{ textDecoration: row.changed ? 'line-through' : 'none', color: row.changed ? 'var(--text-400)' : 'var(--text-700)' }}>
                  {row.oldVal || '—'}
                </span>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-400)' }}>➔</div>
              <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                <span style={{ fontWeight: row.changed ? 800 : 400, color: row.changed ? '#2563eb' : 'var(--text-700)' }}>
                  {row.newVal || '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={13} /> ย้อนกลับ
        </button>
        <button type="button" className="btn-primary" onClick={onClose} style={{ padding: '8px 20px', borderRadius: 10 }}>
          ปิด
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Cylinder History Modal
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CylinderHistoryModal({
  open,
  onClose,
  cylinder = null,
  machineCode = '',
  auditLogs = [],
  cylinders = null,
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('auto')
  const [selectedItem, setSelectedItem] = useState(null)
  const [internalCylinders, setInternalCylinders] = useState([])

  // Auto-fetch cylinders from CylinderAPI if not provided by caller
  useEffect(() => {
    if (!open) return
    if (Array.isArray(cylinders) && cylinders.length > 0) return

    let active = true
    try {
      const res = CylinderAPI.list?.()
      if (res && typeof res.then === 'function') {
        res.then((data) => {
          if (!active) return
          const list = Array.isArray(data) ? data : data?.data || data?.items || []
          setInternalCylinders(list)
        }).catch(() => {})
      }
    } catch {}

    return () => {
      active = false
    }
  }, [open, cylinders])

  const effectiveCylinders = (Array.isArray(cylinders) && cylinders.length > 0)
    ? cylinders
    : internalCylinders

  const effectiveSerial = cylinder?.Serial_NOW || cylinder?.Serial_OLD || ''
  const effectiveMc = machineCode || cylinder?.NewMC || cylinder?.OLDMC || ''

  useEffect(() => {
    if (open) {
      setSelectedItem(null)
    }
  }, [open, cylinder, machineCode])

  const criteria = useMemo(() => {
    if (activeTab === 'cylinder') {
      return { serial: effectiveSerial, cylinderId: cylinder?.id || cylinder?._id }
    }
    if (activeTab === 'machine') {
      return { mc: effectiveMc }
    }
    return {
      serial: effectiveSerial,
      mc: effectiveMc,
      cylinderId: cylinder?.id || cylinder?._id,
    }
  }, [activeTab, effectiveSerial, effectiveMc, cylinder])

  const historyList = useMemo(() => {
    return filterCylinderHistory(auditLogs, criteria)
  }, [auditLogs, criteria])

  const summary = useMemo(() => {
    return summarizeCylinderHistory(historyList)
  }, [historyList])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return historyList
    const q = search.trim().toLowerCase()
    return historyList.filter((item) => {
      const comment = String(item.comment || '').toLowerCase()
      const user = String(item.user || '').toLowerCase()
      const serials = [item.in?.serial, item.out?.serial, item.serial].filter(Boolean).join(' ').toLowerCase()
      const mcs = [item.in?.mc, item.out?.mc, item.mcFrom, item.mcTo].filter(Boolean).join(' ').toLowerCase()
      return comment.includes(q) || user.includes(q) || serials.includes(q) || mcs.includes(q)
    })
  }, [historyList, search])

  if (!open) return null

  // If viewing a selected item: show exact Swap modal title "สลับกระบอก" matching user's image!
  const modalTitle = selectedItem
    ? (selectedItem.type === 'SWAP' ? 'สลับกระบอก' : 'แก้ไขข้อมูลกระบอก')
    : (
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
          <History size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              ประวัติการเปลี่ยน / สลับกระบอกเข็ม
            </span>
            {effectiveMc && (
              <span className="font-mono font-bold text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/20">
                เครื่อง {effectiveMc}
              </span>
            )}
            {effectiveSerial && (
              <span className="font-mono font-bold text-[11px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                กระบอก {effectiveSerial}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
            คลิกที่รายการใดก็ได้เพื่อดูรายละเอียดแบบเต็มเหมือนหน้าสลับกระบอก
          </div>
        </div>
      </div>
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      footer={
        selectedItem ? null : (
          <div className="flex items-center justify-between w-full text-xs text-slate-500">
            <span>พบ {historyList.length} รายการบันทึกประวัติ (คลิกรายการเพื่อดูแบบละเอียด)</span>
            <button type="button" className="btn-outline px-4 py-1.5 font-medium" onClick={onClose}>
              ปิดหน้าต่าง
            </button>
          </div>
        )
      }
    >
      {selectedItem ? (
        selectedItem.type === 'SWAP' ? (
          <ExactSwapDetailView
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onClose={onClose}
            cylinders={effectiveCylinders}
          />
        ) : (
          <UpdateDetailView
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
            onClose={onClose}
            cylinders={effectiveCylinders}
          />
        )
      ) : (
        <div className="space-y-4 text-xs">
          {/* ── Summary Metric Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold uppercase text-slate-400">ประวัติทั้งหมด</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {summary.total} <span className="text-xs font-normal text-slate-500">ครั้ง</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="text-[10px] font-bold uppercase text-indigo-500">สลับกระบอก (SWAP)</div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {summary.swapCount} <span className="text-xs font-normal text-indigo-400">ครั้ง</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
              <div className="text-[10px] font-bold uppercase text-blue-500">แก้ไข/ย้ายเครื่อง</div>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {summary.updateCount} <span className="text-xs font-normal text-blue-400">ครั้ง</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">เปลี่ยนล่าสุด</div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">
                {summary.lastDate}
              </div>
            </div>
          </div>

          {/* ── Filter Tabs & Search Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex-wrap">
              {effectiveSerial && (
                <button
                  type="button"
                  onClick={() => setActiveTab('cylinder')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'cylinder'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Disc size={13} />
                  <span>ตามกระบอกนี้</span>
                </button>
              )}
              {effectiveMc && (
                <button
                  type="button"
                  onClick={() => setActiveTab('machine')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'machine'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Cpu size={13} />
                  <span>ตามเครื่อง ({effectiveMc})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                  activeTab === 'all' || activeTab === 'auto'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>ทั้งหมด</span>
              </button>
            </div>

            <div className="relative flex-1 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา ช่าง, เครื่อง, ซีเรียล..."
                className="input pl-8 py-1.5 text-xs w-full"
              />
            </div>
          </div>

          {/* ── Timeline List: Clickable cards to open full detail ── */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <History size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                <div className="font-semibold text-slate-600 dark:text-slate-400">
                  ยังไม่พบประวัติการเปลี่ยนกระบอก
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ประวัติจะถูกบันทึกอัตโนมัติเมื่อทำรายการสลับกระบอก หรือแก้ไขรหัสเครื่องจักร
                </div>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSwap = item.type === 'SWAP'

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedItem(item)}
                    className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-2.5 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all relative overflow-hidden"
                    title="คลิกเพื่อดูรายละเอียดแบบเต็มเหมือนตอนสลับกระบอก"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-500 transition-colors" />

                    <div className="flex items-center justify-between gap-2 flex-wrap pl-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                            isSwap
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isSwap ? <ArrowLeftRight size={11} /> : <Pencil size={11} />}
                          <span>{isSwap ? 'สลับกระบอก (SWAP)' : 'แก้ไข / ย้ายเครื่อง'}</span>
                        </span>

                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar size={11} className="text-slate-400" />
                          <span>{formatHistoryDate(item.date)}</span>
                        </span>

                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                          <User size={11} className="text-slate-400" />
                          <span>{item.user}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <TableProperties size={12} />
                        <span>ดูรายละเอียดเหมือนตอนสลับ</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] ml-1">
                      {isSwap ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap font-mono">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">OUT</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.out?.serial || '—'}</span>
                            <span className="text-slate-400">
                              (เครื่อง {item.out?.mc || findCylinderBySerial(item.out?.serial, effectiveCylinders)?.NewMC || '—'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-500 font-bold text-[11px]">
                            <ArrowLeftRight size={12} />
                            <span className="text-[10px] uppercase font-sans">สลับคู่กับ</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">IN</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.in?.serial || '—'}</span>
                            <span className="text-slate-400">
                              (เครื่อง {item.in?.mc || findCylinderBySerial(item.in?.serial, effectiveCylinders)?.NewMC || '—'})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500">เครื่องจักร:</span>
                          <span className="font-mono line-through text-slate-400">{item.mcFrom || '—'}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.mcTo || '—'}</span>
                          {item.locFrom || item.locTo ? (
                            <span className="text-slate-400 ml-2">
                              (ตำแหน่ง: {item.locFrom || '—'} ➔ {item.locTo || '—'})
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {item.comment && (
                      <div className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/30 px-2 py-1 rounded-md ml-1 truncate">
                        "{item.comment}"
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
