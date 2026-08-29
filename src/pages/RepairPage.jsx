import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { notifySupervisor, notifyTechnician, notifyCompleted, loadTelegramSettingsDB } from '../utils/telegram'
import { notifyLineNewRepair, notifyLineTechnician, notifyLineCompleted } from '../utils/line'
import { TechnicianAPI } from '../api/entities'
import {
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Loader,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Cpu,
} from 'lucide-react'
import gemmaLogo from '../assets/logo-gemma.png'

const STATUS_LABEL = {
  PENDING:    { label: 'รอการอนุมัติ',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  APPROVED:   { label: 'อนุมัติแล้ว',   color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  REJECTED:   { label: 'ไม่อนุมัติ',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)'  },
  IN_PROGRESS:{ label: 'กำลังซ่อม',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  COMPLETED:  { label: 'ซ่อมเสร็จแล้ว', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.2), 0 4px 12px -2px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Btn({ onClick, disabled, loading, children, variant = 'primary', style }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
    },
    outline: {
      background: '#ffffff',
      color: '#334155',
      border: '1px solid #cbd5e1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        minHeight: 46,
        padding: '12px 20px',
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.65 : 1,
        transition: 'all 180ms ease',
        touchAction: 'manipulation',
        ...styles[variant],
        ...style,
      }}
    >
      {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

function FieldRow({ label, value, highlight }) {
  if (!value) return null
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        padding: '8px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: highlight ? 800 : 600,
          color: highlight ? '#2563eb' : '#0f172a',
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Mobile Steps Progress Header ────────────────────────────────────────── */
function StepHeader({ activeStep, title, subtitle }) {
  const steps = [
    { num: 1, label: 'แจ้งซ่อม' },
    { num: 2, label: 'อนุมัติ/มอบหมาย' },
    { num: 3, label: 'บันทึกผล' },
  ]

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        {steps.map((s, i) => {
          const isActive = s.num === activeStep
          const isDone = s.num < activeStep
          return (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDone ? '#10b981' : isActive ? '#2563eb' : '#e2e8f0',
                    color: isDone || isActive ? '#ffffff' : '#64748b',
                  }}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#1e293b' : '#94a3b8',
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isDone ? '#10b981' : '#e2e8f0',
                    margin: '0 8px',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  )
}

/* ── Step 1: Report ──────────────────────────────────────────────────────── */
function StepReport({ serial, cylinder, onSubmitted }) {
  const [design, setDesign] = useState(cylinder?.Design || '')
  const [ki, setKi] = useState(cylinder?.KI !== undefined && cylinder?.KI !== null ? String(cylinder.KI) : '')
  const [rollNo, setRollNo] = useState('')
  const [problem, setProblem] = useState('')
  const [reporter, setReporter] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cylinder?.Design && !design) setDesign(cylinder.Design)
    if (cylinder?.KI && !ki) setKi(String(cylinder.KI))
  }, [cylinder])

  const submit = async () => {
    if (!problem.trim()) return setError('กรุณาระบุรายละเอียดอาการเสีย')
    if (!reporter.trim()) return setError('กรุณาระบุชื่อผู้แจ้ง')
    setSaving(true)
    setError('')
    try {
      let insertPayload = {
        cylinder_serial: serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || null,
        cylinder_location: cylinder?.Location || null,
        cylinder_standard: cylinder?.Standard || null,
        machine_mc: cylinder?.NewMC || null,
        Design: design.trim() || null,
        KI: ki.trim() ? Number(ki) : null,
        roll_no: rollNo.trim() ? Number(rollNo) : null,
        problem_description: problem.trim(),
        reported_by: reporter.trim(),
        status: 'PENDING',
      }
      let insertRes = await supabase.from('repair_requests').insert(insertPayload).select().single()
      if (insertRes.error) {
        const errMsg = String(insertRes.error.message || '')
        const missingCol = errMsg.match(/Could not find the '([^']+)' column of 'repair_requests'/i)?.[1]
        if (missingCol) {
          delete insertPayload[missingCol]
          insertRes = await supabase.from('repair_requests').insert(insertPayload).select().single()
          if (insertRes.error) {
            delete insertPayload.roll_no
            delete insertPayload.KI
            delete insertPayload.Design
            insertRes = await supabase.from('repair_requests').insert(insertPayload).select().single()
          }
        }
      }
      if (insertRes.error) throw insertRes.error
      const data = {
        ...(insertRes.data || {}),
        Design: design.trim() || insertRes.data?.Design,
        KI: ki.trim() || insertRes.data?.KI,
        roll_no: rollNo.trim() || insertRes.data?.roll_no,
      }
      try {
        await notifySupervisor(data, cylinder)
      } catch (tgErr) {
        console.warn('Telegram notification warning:', tgErr)
      }
      try {
        await notifyLineNewRepair(data, cylinder)
      } catch (lineErr) {
        console.warn('LINE notification warning:', lineErr)
      }
      onSubmitted(data)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    minHeight: 46,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
    fontFamily: 'inherit',
  }

  return (
    <div>
      <StepHeader
        activeStep={1}
        title="🔧 แบบฟอร์มแจ้งซ่อมเครื่องจักร / กระบอก"
        subtitle="กรอกข้อมูลเพื่อส่งแจ้งเตือนเข้า LINE & Telegram หัวหน้าช่างทันที"
      />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 🌟 1. ข้อมูลงานผลิต (Design / KI / เลขม้วน) - อยู่ส่วนแรกสุดของฟอร์ม 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderRadius: 16,
            padding: '16px',
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 14px rgba(59,130,246,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋 ส่วนที่ 1: ข้อมูลงานผลิต (Design / KI / เลขม้วน)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Design */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                🎨 Design (ลายผ้า)
              </label>
              <input
                type="text"
                value={design}
                onChange={(e) => setDesign(e.target.value)}
                placeholder="ระบุลายผ้า / Design (เช่น ลายริ้ว, Cotton Single)..."
                style={{ ...inputStyle, background: '#ffffff' }}
              />
            </div>

            {/* KI & Roll No Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* KI */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  🧾 KI (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={ki}
                  onChange={(e) => setKi(e.target.value)}
                  placeholder="ระบุเลข KI..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Roll No */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  📦 เลขม้วน (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="ระบุเลขม้วน..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ⚠️ 2. รายละเอียดปัญหาและผู้แจ้ง ⚠️ */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️ ส่วนที่ 2: อาการเสียและผู้แจ้ง</span>
          </div>

          {/* Problem textarea */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 5 }}>
              ปัญหา / อาการเสียที่พบ *
            </label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
              placeholder="อธิบายปัญหาที่พบ เช่น เข็มหัก, ผ้าเป็นเส้น, กระบอกติด, มีเสียงดัง..."
              style={{
                ...inputStyle,
                minHeight: 80,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Reporter name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 5 }}>
              👤 ชื่อผู้แจ้ง *
            </label>
            <input
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="ชื่อ-นามสกุล หรือชื่อเล่นผู้แจ้ง"
              style={inputStyle}
            />
          </div>
        </div>

        {/* 🎯 3. ข้อมูลเครื่องจักรเป้าหมาย 🎯 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
            borderRadius: 14,
            padding: '12px 14px',
            border: '1px solid #bae6fd',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: 4 }}>
            🎯 ข้อมูลเครื่องจักรเป้าหมาย
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Cpu size={14} className="text-blue-600" /> M/C: {cylinder?.NewMC || '—'}
            </span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#2563eb' }}>ซีเรียล: {serial || cylinder?.Serial_NOW || '—'}</span>
            {cylinder?.Location && (
              <>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#475569' }}>
                  <MapPin size={13} /> {cylinder.Location}
                </span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <Btn onClick={submit} loading={saving} variant="primary" style={{ marginTop: 4 }}>
          <ChevronRight size={18} /> ยืนยันส่งใบแจ้งซ่อม
        </Btn>
      </div>
    </div>
  )
}

/* ── Step 2: Approve ─────────────────────────────────────────────────────── */
function StepApprove({ request, onUpdated }) {
  const [techList, setTechList] = useState([])
  const [tech, setTech] = useState(request.technician_name || '')
  const [design, setDesign] = useState(request.Design || '')
  const [ki, setKi] = useState(request.KI !== undefined && request.KI !== null ? String(request.KI) : '')
  const [rollNo, setRollNo] = useState(request.roll_no || request.RollNo || '')
  const [notes, setNotes] = useState(request.approval_notes || '')
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.allSettled([loadTelegramSettingsDB(), TechnicianAPI.list()]).then(([tgRes, techRes]) => {
      const tgTechs = tgRes.status === 'fulfilled' ? tgRes.value?.technicians || [] : []
      const regTechs =
        techRes.status === 'fulfilled' && Array.isArray(techRes.value)
          ? techRes.value.map((t) => ({ name: t.Name || t.name, chat_id: '' }))
          : []
      const names = new Set()
      const merged = []
      for (const t of [...tgTechs, ...regTechs]) {
        if (t.name && !names.has(t.name)) {
          names.add(t.name)
          merged.push(t)
        }
      }
      setTechList(merged)
    })
  }, [])

  if (['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(request.status)) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <CheckCircle size={44} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>อนุมัติและมอบหมายเรียบร้อย</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          ช่างผู้รับผิดชอบ: <strong style={{ color: '#2563eb' }}>{request.technician_name}</strong>
        </div>
      </div>
    )
  }

  const handle = async (action) => {
    if (saving) return
    if (action === 'approve' && !tech.trim()) return setError('กรุณาเลือกหรือระบุชื่อช่างผู้รับผิดชอบ')
    setSaving(action)
    setError('')
    try {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      let updatePayload = {
        status,
        technician_name: tech.trim(),
        approval_notes: notes.trim(),
        approved_at: new Date().toISOString(),
        approved_by: tech.trim() || 'Supervisor',
        Design: design.trim() || null,
        KI: ki.trim() ? Number(ki) : null,
        roll_no: rollNo.trim() ? Number(rollNo) : null,
      }
      let updateRes = await supabase
        .from('repair_requests')
        .update(updatePayload)
        .eq('id', request.id)
        .select()
        .single()
      if (updateRes.error) {
        delete updatePayload.roll_no
        delete updatePayload.KI
        delete updatePayload.Design
        updateRes = await supabase
          .from('repair_requests')
          .update(updatePayload)
          .eq('id', request.id)
          .select()
          .single()
      }
      if (updateRes.error) throw updateRes.error
      const data = {
        ...(updateRes.data || {}),
        Design: design.trim() || updateRes.data?.Design,
        KI: ki.trim() || updateRes.data?.KI,
        roll_no: rollNo.trim() || updateRes.data?.roll_no,
      }
      if (action === 'approve') {
        try {
          await notifyTechnician(data)
        } catch (tgErr) {
          console.warn('Telegram technician notify warning:', tgErr)
        }
        try {
          await notifyLineTechnician(data)
        } catch (lineErr) {
          console.warn('LINE technician notify warning:', lineErr)
        }
      }
      onUpdated(data)
    } catch (e) {
      setError(e.message)
    }
    setSaving('')
  }

  const inputStyle = {
    width: '100%',
    minHeight: 46,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
  }

  return (
    <div>
      <StepHeader
        activeStep={2}
        title="👨‍💼 อนุมัติและมอบหมายช่าง"
        subtitle="เลือกช่างเพื่อยิงใบสั่งงานตรงเข้า LINE & Telegram ของช่างทันที"
      />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 🌟 1. ข้อมูลงานผลิต (Design / KI / เลขม้วน) 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderRadius: 16,
            padding: '16px',
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 14px rgba(59,130,246,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋 ส่วนที่ 1: ข้อมูลงานผลิต (Design / KI / เลขม้วน)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Design */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                🎨 Design (ลายผ้า)
              </label>
              <input
                type="text"
                value={design}
                onChange={(e) => setDesign(e.target.value)}
                placeholder="ระบุลายผ้า / Design..."
                style={{ ...inputStyle, background: '#ffffff' }}
              />
            </div>

            {/* KI & Roll No */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  🧾 KI (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={ki}
                  onChange={(e) => setKi(e.target.value)}
                  placeholder="ระบุเลข KI..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  📦 เลขม้วน (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="ระบุเลขม้วน..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. รายละเอียดใบแจ้งซ่อม */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} />
          <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} />
          <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight />
          <FieldRow label="อาการเสียที่แจ้ง" value={request.problem_description} />
          <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
        </div>

        {/* Technician selector */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
            👨‍🔧 มอบหมายช่างปฏิบัติงาน *
          </label>
          <select
            value={techList.some((t) => t.name === tech) ? tech : tech ? '__custom__' : ''}
            onChange={(e) => setTech(e.target.value === '__custom__' ? '' : e.target.value)}
            style={inputStyle}
          >
            <option value="">— กรุณาเลือกช่าง —</option>
            {techList.map((t, i) => (
              <option key={i} value={t.name}>
                {t.name}
              </option>
            ))}
            <option value="__custom__">➕ พิมพ์ระบุชื่อเอง</option>
          </select>
          {!techList.some((t) => t.name === tech) && (
            <input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              placeholder="พิมพ์ชื่อช่างผู้รับผิดชอบ..."
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
            📝 หมายเหตุ / คำสั่งการเพิ่มเติม (ถึงช่าง)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="เช่น ให้เปลี่ยนซีลยางและตรวจเช็คศูนย์ด้วย..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              fontSize: 16,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn onClick={() => handle('approve')} loading={saving === 'approve'} variant="success" style={{ flex: 2 }}>
            <CheckCircle size={18} /> ยืนยันอนุมัติและมอบหมาย
          </Btn>
          <Btn onClick={() => handle('reject')} loading={saving === 'reject'} variant="danger" style={{ flex: 1 }}>
            ไม่อนุมัติ
          </Btn>
        </div>
      </div>
    </div>
  )
}

/* ── Step 3: Complete ────────────────────────────────────────────────────── */
function StepComplete({ request, onUpdated }) {
  const [details, setDetails] = useState(request.repair_details || '')
  const [parts, setParts] = useState(request.parts_used || '')
  const [tech, setTech] = useState(request.technician_name || '')
  const [design, setDesign] = useState(request.Design || '')
  const [ki, setKi] = useState(request.KI !== undefined && request.KI !== null ? String(request.KI) : '')
  const [rollNo, setRollNo] = useState(request.roll_no || request.RollNo || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (request.status === 'COMPLETED') {
    return (
      <div style={{ padding: 28, textAlign: 'center' }}>
        <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ปิดงานซ่อมเสร็จสมบูรณ์</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>บันทึกผลการซ่อมเข้าสู่ระบบเรียบร้อยแล้ว</div>
      </div>
    )
  }

  const submit = async () => {
    if (saving) return
    if (!details.trim()) return setError('กรุณาระบุรายละเอียดการซ่อม')
    if (!tech.trim()) return setError('กรุณาระบุชื่อช่างผู้ปฏิบัติงาน')
    setSaving(true)
    setError('')
    try {
      let updatePayload = {
        status: 'COMPLETED',
        repair_details: details.trim(),
        parts_used: parts.trim(),
        completed_at: new Date().toISOString(),
        completed_by: tech.trim(),
        Design: design.trim() || null,
        KI: ki.trim() ? Number(ki) : null,
        roll_no: rollNo.trim() ? Number(rollNo) : null,
      }
      let updateRes = await supabase
        .from('repair_requests')
        .update(updatePayload)
        .eq('id', request.id)
        .select()
        .single()
      if (updateRes.error) {
        delete updatePayload.roll_no
        delete updatePayload.KI
        delete updatePayload.Design
        updateRes = await supabase
          .from('repair_requests')
          .update(updatePayload)
          .eq('id', request.id)
          .select()
          .single()
      }
      if (updateRes.error) throw updateRes.error
      const data = {
        ...(updateRes.data || {}),
        Design: design.trim() || updateRes.data?.Design,
        KI: ki.trim() || updateRes.data?.KI,
        roll_no: rollNo.trim() || updateRes.data?.roll_no,
      }
      try {
        await notifyCompleted(data)
      } catch (tgErr) {
        console.warn('Telegram completed notify warning:', tgErr)
      }
      try {
        await notifyLineCompleted(data)
      } catch (lineErr) {
        console.warn('LINE completed notify warning:', lineErr)
      }
      onUpdated(data)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%',
    minHeight: 46,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
  }

  return (
    <div>
      <StepHeader
        activeStep={3}
        title="🔧 บันทึกผลการซ่อมบำรุง"
        subtitle="บันทึกรายละเอียดงานที่ทำ และอะไหล่ที่เปลี่ยนเพื่อปิดงาน"
      />
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 🌟 1. ข้อมูลงานผลิต (Design / KI / เลขม้วน) 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderRadius: 16,
            padding: '16px',
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 14px rgba(59,130,246,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋 ข้อมูลงานผลิต (Design / KI / เลขม้วน)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Design */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                🎨 Design (ลายผ้า)
              </label>
              <input
                type="text"
                value={design}
                onChange={(e) => setDesign(e.target.value)}
                placeholder="ระบุลายผ้า / Design..."
                style={{ ...inputStyle, background: '#ffffff' }}
              />
            </div>

            {/* KI & Roll No */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  🧾 KI (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={ki}
                  onChange={(e) => setKi(e.target.value)}
                  placeholder="ระบุเลข KI..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                  📦 เลขม้วน (ตัวเลข)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="ระบุเลขม้วน..."
                  style={{ ...inputStyle, background: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. รายละเอียดและคำสั่งหัวหน้า */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} />
          <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} />
          <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight />
          <FieldRow label="ปัญหาที่แจ้ง" value={request.problem_description} />
          {request.approval_notes && (
            <FieldRow label="คำสั่งหัวหน้า" value={request.approval_notes} highlight />
          )}
        </div>

        {/* Tech name */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
            👨‍🔧 ชื่อช่างผู้ดำเนินการซ่อม *
          </label>
          <input
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            placeholder="ชื่อช่าง"
            style={inputStyle}
          />
        </div>

        {/* Repair details */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
            🛠️ รายละเอียดการซ่อม / วิธีแก้ไข *
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="อธิบายวิธีแก้ไข เช่น เปลี่ยนเข็มเบอร์ 14 ใหม่, ตั้งศูนย์กระบอก, หยอดน้ำมันหล่อลื่น..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              fontSize: 16,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Parts used */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
            📦 อะไหล่ที่เบิกใช้ (ถ้ามี)
          </label>
          <input
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            placeholder="เช่น เข็ม 2 เล่ม, ซีลยาง 1 วง..."
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <Btn onClick={submit} loading={saving} variant="success" style={{ marginTop: 4 }}>
          <CheckCircle size={18} /> ยืนยันบันทึกปิดงานซ่อม
        </Btn>
      </div>
    </div>
  )
}

/* ── Status view ─────────────────────────────────────────────────────────── */
function StatusView({ request }) {
  const s = STATUS_LABEL[request.status] || STATUS_LABEL.PENDING
  return (
    <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 14,
          background: s.bg,
          border: `1px solid ${s.border}`,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.label}</span>
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto', fontFamily: 'monospace' }}>
          {request.request_no}
        </span>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
        <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight />
        <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} />
        <FieldRow label="ตำแหน่งติดตั้ง" value={request.cylinder_location} />
        <FieldRow label="Design (ลายผ้า)" value={request.Design} />
        <FieldRow label="KI" value={request.KI} />
        <FieldRow label="เลขม้วน" value={request.roll_no || request.RollNo || request.roll_number} />
        <FieldRow label="อาการเสียที่แจ้ง" value={request.problem_description} />
        <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
        <FieldRow
          label="วันที่แจ้ง"
          value={request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : null}
        />
        <FieldRow label="ช่างผู้รับผิดชอบ" value={request.technician_name} highlight />
        <FieldRow label="คำสั่งหัวหน้า" value={request.approval_notes} />
        <FieldRow label="รายละเอียดการซ่อม" value={request.repair_details} />
        <FieldRow label="อะไหล่ที่ใช้" value={request.parts_used} />
        <FieldRow
          label="เสร็จสิ้นเมื่อ"
          value={request.completed_at ? new Date(request.completed_at).toLocaleString('th-TH') : null}
        />
      </div>
    </div>
  )
}

/* ── Main RepairPage Component ───────────────────────────────────────────── */
export default function RepairPage() {
  const { serial } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reqId = searchParams.get('req')
  const step = searchParams.get('step') // approve | complete | view

  const [cylinder, setCylinder] = useState(null)
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        let decodedSerial = String(serial || '').trim()
        try {
          decodedSerial = decodeURIComponent(decodedSerial).trim()
        } catch {}

        let cyl = null
        if (decodedSerial) {
          const { data: foundNow } = await supabase
            .from('cylinders')
            .select('*')
            .eq('Serial_NOW', decodedSerial)
            .maybeSingle()
          cyl = foundNow
          if (!cyl) {
            const { data: foundOld } = await supabase
              .from('cylinders')
              .select('*')
              .eq('Serial_OLD', decodedSerial)
              .maybeSingle()
            cyl = foundOld
          }
        }
        setCylinder(cyl)

        if (reqId) {
          const { data: req } = await supabase
            .from('repair_requests')
            .select('*')
            .eq('id', reqId)
            .maybeSingle()
          setRequest(req)
        }
      } catch (e) {
        console.error('Error loading repair data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [serial, reqId])

  const handleDone = (updated) => {
    setRequest(updated)
    setDone(true)
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Loader size={32} style={{ color: '#2563eb', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 14, fontWeight: 700 }}>กำลังโหลดข้อมูล...</div>
        </div>
      )
    }

    if (done && request) {
      return (
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={54} style={{ color: '#10b981', margin: '0 auto 14px' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
            {request.status === 'COMPLETED'
              ? 'บันทึกผลซ่อมเรียบร้อย'
              : request.status === 'PENDING'
              ? 'ส่งแจ้งซ่อมเรียบร้อย'
              : 'บันทึกเรียบร้อย'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>เลขที่ {request.request_no}</div>
          <StatusView request={request} />
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => navigate('/repair-requests')} variant="primary">
              📋 ดูรายการแจ้งซ่อมทั้งหมด
            </Btn>
          </div>
        </div>
      )
    }

    if (step === 'approve' && request) return <StepApprove request={request} onUpdated={handleDone} />
    if (step === 'complete' && request) return <StepComplete request={request} onUpdated={handleDone} />
    if ((step === 'view' || reqId) && request) return <StatusView request={request} />
    return <StepReport serial={serial} cylinder={cylinder} onSubmitted={handleDone} />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 12px 32px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input, select, textarea { font-family: inherit; }
      `}</style>

      {/* Top Mobile App Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={gemmaLogo} alt="Gemma" style={{ width: 36, height: 36, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>TextileOps CMMS</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Gemma Knits Maintenance System</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
          }}
        >
          <span>หน้าหลัก</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Card Container */}
      <Card style={{ maxWidth: 520 }}>{renderContent()}</Card>

      {/* Footer info */}
      <div style={{ marginTop: 24, fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: 600 }}>
        TextileOps Maintenance Management System · Version 1.3.6
      </div>
    </div>
  )
}
