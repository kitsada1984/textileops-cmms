import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { notifySupervisor, notifyTechnician, notifyCompleted, loadTelegramSettingsDB } from '../utils/telegram'
import { notifyLineNewRepair, notifyLineTechnician, notifyLineCompleted } from '../utils/line'
import { TechnicianAPI } from '../api/entities'
import PdfPreviewModal from '../components/ui/PdfPreviewModal'
import { generateRepairRequestPdfProps } from '../utils/pdfDocGenerators'
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
  Send,
  Share2,
  Printer,
  Copy,
  FileText,
  Sparkles,
  ShieldCheck,
  Layers,
  Tag,
  User,
  Calendar,
  Zap,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import gemmaLogo from '../assets/logo-gemma.png'

const STATUS_LABEL = {
  PENDING:    { label: 'รอการอนุมัติ',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', dot: '#f59e0b' },
  APPROVED:   { label: 'อนุมัติแล้ว (รอดำเนินการ)', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', dot: '#6366f1' },
  REJECTED:   { label: 'ไม่อนุมัติ',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)', dot: '#ef4444' },
  IN_PROGRESS:{ label: 'กำลังดำเนินการซ่อม', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', dot: '#3b82f6' },
  WAIT_PARTS: { label: 'รออะไหล่',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', dot: '#a855f7' },
  COMPLETED:  { label: 'ซ่อมเสร็จสมบูรณ์', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', dot: '#10b981' },
}

const COMMON_ISSUES = [
  'เข็มหัก',
  'เส้นเข็ม',
  'ผ้าแตก / มีรู',
  'น้ำมันหยด',
  'เครื่องมีเสียงดัง',
  'ผ้าลาย',
  'ยางพลิก',
  'ยางขาดบ่อย',
  'ด้ายขาดบ่อย',
  'ปมฝุ่น',
  'ปมตัวหนอน',
]

const COMMON_SOLUTIONS = [
  'เปลี่ยนเข็มใหม่ตามเบอร์ที่กำหนด',
  'ขัดแต่งร่องเข็มและทำความสะอาด',
  'ตั้งศูนย์กระบอกสูบและปรับระยะ',
  'เปลี่ยนสายพานและตั้งตึง',
  'หยอดน้ำมันหล่อลื่นและตรวจเช็คระบบ',
  'ทำความสะอาดชุดส่งด้าย',
]

function Card({ children, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: '#ffffff',
        borderRadius: 22,
        border: '1px solid #e2e8f0',
        boxShadow: '0 12px 36px -6px rgba(0,0,0,0.18), 0 4px 12px -2px rgba(0,0,0,0.08)',
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
      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
    },
    outline: {
      background: '#ffffff',
      color: '#334155',
      border: '1.5px solid #cbd5e1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    amber: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
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
        minHeight: 48,
        padding: '12px 20px',
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 800,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.65 : 1,
        transition: 'all 180ms ease',
        touchAction: 'manipulation',
        ...styles[variant],
        ...style,
      }}
    >
      {loading && <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

function FieldRow({ label, value, highlight, mono, full }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div
      style={{
        display: full ? 'block' : 'flex',
        justifyContent: 'space-between',
        alignItems: full ? 'flex-start' : 'baseline',
        gap: 8,
        padding: '9px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', flexShrink: 0, display: 'block', marginBottom: full ? 4 : 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: highlight ? 900 : 700,
          color: highlight ? '#2563eb' : '#0f172a',
          textAlign: full ? 'left' : 'right',
          wordBreak: 'break-word',
          fontFamily: mono ? 'monospace' : 'inherit',
          display: 'block',
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
    { num: 2, label: 'อนุมัติ & มอบหมาย' },
    { num: 3, label: 'บันทึกผล & ปิดงาน' },
  ]

  return (
    <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {steps.map((s, i) => {
          const isActive = s.num === activeStep
          const isDone = s.num < activeStep
          return (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    fontSize: 12,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDone ? '#10b981' : isActive ? '#2563eb' : '#e2e8f0',
                    color: isDone || isActive ? '#ffffff' : '#64748b',
                    boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                    transition: 'all 200ms ease',
                  }}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 900 : 700,
                    color: isActive ? '#1d4ed8' : isDone ? '#059669' : '#94a3b8',
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
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
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0', fontWeight: 600 }}>{subtitle}</p>}
      </div>
    </div>
  )
}

/* ── Step 1: Report (แจ้งซ่อม) ────────────────────────────────────────────── */
function StepReport({ serial, cylinder, onSubmitted }) {
  const [design, setDesign] = useState(cylinder?.Design || '')
  const [ki, setKi] = useState(cylinder?.KI !== undefined && cylinder?.KI !== null ? String(cylinder.KI) : '')
  const [rollNo, setRollNo] = useState('')
  const [problem, setProblem] = useState('')
  const [urgency, setUrgency] = useState('ปกติ')
  const [reporter, setReporter] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cylinder?.Design && !design) setDesign(cylinder.Design)
    if (cylinder?.KI && !ki) setKi(String(cylinder.KI))
  }, [cylinder])

  const submit = async () => {
    if (!problem.trim()) return setError('กรุณาระบุรายละเอียดอาการเสียที่พบ')
    if (!reporter.trim()) return setError('กรุณาระบุชื่อผู้แจ้งซ่อม')
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
        priority: urgency,
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
            delete insertPayload.priority
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
        machine_mc: cylinder?.NewMC || insertRes.data?.machine_mc,
        cylinder_serial: serial || cylinder?.Serial_NOW || insertRes.data?.cylinder_serial,
      }

      // Notifications
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
    border: '1.5px solid #cbd5e1',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
    transition: 'all 150ms ease',
  }

  return (
    <div>
      <StepHeader
        activeStep={1}
        title="📝 ใบแจ้งซ่อมเครื่องจักร / กระบอกสูบ"
        subtitle="กรอกข้อมูลเพื่อส่งแจ้งเตือนเข้า LINE & Telegram หัวหน้าช่างทันที"
      />

      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 🏭 ส่วนที่ 1: ข้อมูลเครื่องจักรและกระบอกสูบเป้าหมาย (M/C, ซีเรียล, ตำแหน่ง) 🏭 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 18,
            padding: '14px 16px',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            🎯 เครื่องจักรและกระบอกสูบเป้าหมาย (Target Asset)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 900, color: '#ffffff' }}>
              <Cpu size={16} style={{ color: '#60a5fa' }} />
              <span>M/C: <span style={{ color: '#93c5fd' }}>{cylinder?.NewMC || '—'}</span></span>
            </div>
            <span style={{ color: '#475569' }}>|</span>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff' }}>
              ซีเรียล: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{serial || cylinder?.Serial_NOW || '—'}</span>
            </div>
            {cylinder?.Location && (
              <>
                <span style={{ color: '#475569' }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>
                  <MapPin size={13} style={{ color: '#f87171' }} /> {cylinder.Location}
                </div>
              </>
            )}
            {cylinder?.Standard && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.12)', color: '#e2e8f0', fontWeight: 700 }}>
                {cylinder.Standard}
              </span>
            )}
          </div>
        </div>

        {/* 🌟 ส่วนที่ 2: ข้อมูลงานผลิต (Design / KI / เลขม้วน) 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            borderRadius: 18,
            padding: '16px',
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 16px rgba(59,130,246,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📋 ส่วนที่ 2: ข้อมูลงานผลิต (Production Info)</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#dbeafe', color: '#1e40af' }}>
              สำคัญ
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Design Field (Input Only) */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
                🎨 Design (ลายผ้า)
              </label>
              <input
                type="text"
                value={design}
                onChange={(e) => setDesign(e.target.value)}
                placeholder="กรอกชื่อลายผ้า / Design..."
                style={inputStyle}
              />
            </div>

            {/* KI & Roll No in 2 Columns */}
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
                  placeholder="เช่น 12345"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 800 }}
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
                  placeholder="เช่น 12"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 800 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ⚠️ ส่วนที่ 3: อาการเสีย ระดับความเร่งด่วน และผู้แจ้ง */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Priority Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
              🚨 ระดับความเร่งด่วน (Priority)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { key: 'ปกติ', color: '#10b981', bg: '#ecfdf5', label: '🟢 ปกติ' },
                { key: 'ด่วน', color: '#f59e0b', bg: '#fffbeb', label: '🟡 ด่วน' },
                { key: 'ด่วนที่สุด', color: '#ef4444', bg: '#fef2f2', label: '🔴 ด่วนที่สุด' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setUrgency(p.key)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    border: urgency === p.key ? `2px solid ${p.color}` : '1px solid #cbd5e1',
                    background: urgency === p.key ? p.bg : '#ffffff',
                    color: urgency === p.key ? p.color : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Problem Chips */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
              ⚠️ อาการเสีย / ปัญหาที่พบ *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {COMMON_ISSUES.map((issue) => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => setProblem((prev) => (prev ? `${prev}, ${issue}` : issue))}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: 20,
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  + {issue}
                </button>
              ))}
            </div>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows={3}
              placeholder="อธิบายอาการเสีย เช่น เข็มหัก 2 เล่ม, กระบอกหมุนติดขัด, ผ้าเป็นทาง..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 74 }}
            />
          </div>

          {/* Reporter Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 5 }}>
              👤 ชื่อผู้แจ้งซ่อม (Reporter) *
            </label>
            <input
              type="text"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="พิมพ์ชื่อ-นามสกุล หรือชื่อเล่นผู้แจ้ง..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Telegram & LINE indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            fontSize: 11,
            color: '#64748b',
            fontWeight: 700,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Send size={13} style={{ color: '#0ea5e9' }} /> ส่ง Realtime เข้า Telegram & LINE
          </span>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            ● เชื่อมต่อพร้อม
          </span>
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
              fontWeight: 800,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <Btn onClick={submit} loading={saving} variant="primary" style={{ marginTop: 6 }}>
          <ChevronRight size={18} /> ยืนยันส่งใบแจ้งซ่อม
        </Btn>
      </div>
    </div>
  )
}

/* ── Step 2: Approve & Assign (อนุมัติและมอบหมายช่าง) ─────────────────────── */
function StepApprove({ request, onUpdated }) {
  const [techList, setTechList] = useState([])
  const [tech, setTech] = useState(request.technician_name || '')
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
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>อนุมัติและมอบหมายเรียบร้อยแล้ว</div>
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
      const { data, error: err } = await supabase
        .from('repair_requests')
        .update({
          status,
          technician_name: tech.trim(),
          approval_notes: notes.trim(),
          approved_at: new Date().toISOString(),
          approved_by: tech.trim() || 'Supervisor',
        })
        .eq('id', request.id)
        .select()
        .single()
      if (err) throw err
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
    border: '1.5px solid #cbd5e1',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
  }

  return (
    <div>
      <StepHeader
        activeStep={2}
        title="👨‍💼 อนุมัติและมอบหมายช่าง"
        subtitle="เลือกช่างเพื่อยิงใบสั่งงานตรงเข้า LINE & Telegram ของช่างทันที"
      />

      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 🌟 1. ข้อมูลงานผลิต (จากใบแจ้งซ่อม) 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderRadius: 18,
            padding: '14px 16px',
            border: '1.5px solid #3b82f6',
            boxShadow: '0 2px 10px rgba(59,130,246,0.08)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋 ข้อมูลงานผลิต (จากใบแจ้งซ่อม)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🎨 Design (ลายผ้า)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{request.Design || '—'}</span>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🧾 KI (ตัวเลข)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{request.KI !== undefined && request.KI !== null && request.KI !== '' ? request.KI : '—'}</span>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>📦 เลขม้วน</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{request.roll_no || request.RollNo || request.roll_number || '—'}</span>
            </div>
          </div>
        </div>

        {/* 2. รายละเอียดใบแจ้งซ่อม */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} mono highlight />
          <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} />
          <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight mono />
          <FieldRow label="อาการเสียที่แจ้ง" value={request.problem_description} full />
          <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
        </div>

        {/* 3. มอบหมายช่าง */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            👨‍🔧 มอบหมายช่างผู้รับผิดชอบ *
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

        {/* 4. คำสั่งการเพิ่มเติม */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            📝 หมายเหตุ / คำสั่งการเพิ่มเติม (ถึงช่าง)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="เช่น ให้เปลี่ยนซีลยางและตรวจเช็คศูนย์ด้วย..."
            style={{ ...inputStyle, resize: 'vertical' }}
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
              fontWeight: 800,
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

/* ── Step 3: Complete (บันทึกผลงานช่าง & ปิดงาน) ──────────────────────────── */
function StepComplete({ request, onUpdated }) {
  const [details, setDetails] = useState(request.repair_details || '')
  const [parts, setParts] = useState(request.parts_used || '')
  const [tech, setTech] = useState(request.technician_name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (request.status === 'COMPLETED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ปิดงานซ่อมเสร็จสมบูรณ์</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>บันทึกผลการซ่อมเข้าสู่ระบบเรียบร้อยแล้ว</div>
      </div>
    )
  }

  const submit = async () => {
    if (!details.trim()) return setError('กรุณาระบุรายละเอียดการซ่อม / วิธีแก้ไข')
    if (!tech.trim()) return setError('กรุณาระบุชื่อช่างผู้ปฏิบัติงาน')
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('repair_requests')
        .update({
          status: 'COMPLETED',
          repair_details: details.trim(),
          parts_used: parts.trim(),
          completed_at: new Date().toISOString(),
          completed_by: tech.trim(),
        })
        .eq('id', request.id)
        .select()
        .single()
      if (err) throw err
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
    border: '1.5px solid #cbd5e1',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
  }

  return (
    <div>
      <StepHeader
        activeStep={3}
        title="🔧 บันทึกผลการซ่อมบำรุง & ปิดงาน"
        subtitle="บันทึกรายละเอียดงานที่ทำ และอะไหล่ที่เปลี่ยนเพื่อปิดงาน"
      />

      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 🌟 1. ข้อมูลงานผลิต (จากใบแจ้งซ่อม) 🌟 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
            borderRadius: 18,
            padding: '14px 16px',
            border: '1.5px solid #3b82f6',
            boxShadow: '0 2px 10px rgba(59,130,246,0.08)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋 ข้อมูลงานผลิต (จากใบแจ้งซ่อม)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🎨 Design (ลายผ้า)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{request.Design || '—'}</span>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🧾 KI (ตัวเลข)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{request.KI !== undefined && request.KI !== null && request.KI !== '' ? request.KI : '—'}</span>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>📦 เลขม้วน</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{request.roll_no || request.RollNo || request.roll_number || '—'}</span>
            </div>
          </div>
        </div>

        {/* 2. รายละเอียดและคำสั่งหัวหน้า */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} mono highlight />
          <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} />
          <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight mono />
          <FieldRow label="ปัญหาที่แจ้ง" value={request.problem_description} full />
          {request.approval_notes && (
            <FieldRow label="คำสั่งหัวหน้า" value={request.approval_notes} highlight full />
          )}
        </div>

        {/* 3. Tech name */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            👨‍🔧 ชื่อช่างผู้ดำเนินการซ่อม *
          </label>
          <input
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            placeholder="ชื่อช่าง"
            style={inputStyle}
          />
        </div>

        {/* 4. Repair details & quick chips */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            🛠️ รายละเอียดการซ่อม / วิธีแก้ไข *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {COMMON_SOLUTIONS.map((sol) => (
              <button
                key={sol}
                type="button"
                onClick={() => setDetails((prev) => (prev ? `${prev}, ${sol}` : sol))}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 9px',
                  borderRadius: 20,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                + {sol}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="อธิบายวิธีแก้ไข เช่น เปลี่ยนเข็มใหม่, ตั้งศูนย์กระบอก, หยอดน้ำมัน..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 74 }}
          />
        </div>

        {/* 5. Parts used */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
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
              fontWeight: 800,
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

/* ── Status & Digital Work Order View (ใบสรุปประวัติงาน) ─────────────────── */
function StatusView({ request, onOpenPdf }) {
  const [copied, setCopied] = useState(false)
  const s = STATUS_LABEL[request.status] || STATUS_LABEL.PENDING

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLine = () => {
    const text = `📋 ใบแจ้งซ่อมเลขที่: ${request.request_no || request.id}\nเครื่องจักร: ${request.machine_mc || '—'}\nซีเรียล: ${request.cylinder_serial || '—'}\nDesign: ${request.Design || '—'}\nสถานะ: ${s.label}\nลิงก์: ${window.location.href}`
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status Hero Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px',
          borderRadius: 18,
          background: s.bg,
          border: `1.5px solid ${s.border}`,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}` }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.label}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, fontWeight: 700 }}>
            {request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : ''}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#1e293b', marginLeft: 'auto', fontFamily: 'monospace' }}>
          {request.request_no || `REQ-${request.id?.slice(0, 8)}`}
        </span>
      </div>

      {/* Production Info Highlight Box */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
          borderRadius: 18,
          padding: '14px 16px',
          border: '1.5px solid #3b82f6',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', marginBottom: 10 }}>
          📋 ข้อมูลงานผลิต (Production Details)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>🎨 Design</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{request.Design || '—'}</span>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>🧾 KI</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{request.KI ?? '—'}</span>
          </div>
          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 10, border: '1px solid #dbeafe' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>📦 เลขม้วน</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{request.roll_no || request.RollNo || '—'}</span>
          </div>
        </div>
      </div>

      {/* Complete Data Breakdown */}
      <div style={{ background: '#f8fafc', borderRadius: 18, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
        <FieldRow label="เครื่องจักร (M/C)" value={request.machine_mc} highlight />
        <FieldRow label="ซีเรียลกระบอก" value={request.cylinder_serial} highlight mono />
        <FieldRow label="ตำแหน่งติดตั้ง" value={request.cylinder_location} />
        <FieldRow label="อาการเสียที่แจ้ง" value={request.problem_description} full />
        <FieldRow label="ระดับความเร่งด่วน" value={request.priority} />
        <FieldRow label="ผู้แจ้งซ่อม" value={request.reported_by} />
        <FieldRow label="วันที่แจ้ง" value={request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : null} />
        <FieldRow label="ช่างผู้รับผิดชอบ" value={request.technician_name} highlight />
        <FieldRow label="ผู้อนุมัติ" value={request.approved_by} />
        <FieldRow label="คำสั่งหัวหน้า" value={request.approval_notes} full />
        <FieldRow label="รายละเอียดการซ่อม" value={request.repair_details} full />
        <FieldRow label="อะไหล่ที่ใช้" value={request.parts_used} />
        <FieldRow label="เสร็จสิ้นเมื่อ" value={request.completed_at ? new Date(request.completed_at).toLocaleString('th-TH') : null} />
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn onClick={onOpenPdf} variant="amber">
          <Printer size={16} /> พิมพ์ใบแจ้งซ่อม A4
        </Btn>
        <Btn onClick={shareLine} variant="outline" style={{ borderColor: '#06c755', color: '#06c755' }}>
          <Share2 size={16} /> แชร์เข้า LINE
        </Btn>
      </div>

      <button
        type="button"
        onClick={copyUrl}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px',
          borderRadius: 12,
          background: '#f1f5f9',
          color: '#475569',
          fontSize: 12,
          fontWeight: 700,
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
        }}
      >
        <Copy size={14} /> {copied ? 'คัดลอกลิงก์เรียบร้อย!' : 'คัดลอกลิงก์หน้านี้'}
      </button>
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
  const [pdfItem, setPdfItem] = useState(null)

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
          <div style={{ marginTop: 14, color: '#64748b', fontSize: 14, fontWeight: 700 }}>กำลังโหลดข้อมูลใบแจ้งซ่อม...</div>
        </div>
      )
    }

    if (done && request) {
      return (
        <div style={{ padding: '24px 18px', textAlign: 'center' }}>
          <CheckCircle2 size={54} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
            {request.status === 'COMPLETED'
              ? 'บันทึกปิดงานซ่อมเรียบร้อย'
              : request.status === 'APPROVED'
              ? 'อนุมัติและมอบหมายช่างเรียบร้อย'
              : 'ส่งใบแจ้งซ่อมเข้าสู่ระบบเรียบร้อย'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, fontWeight: 600 }}>
            แจ้งเตือนเข้า Telegram & LINE เรียบร้อยแล้ว
          </div>
          <StatusView request={request} onOpenPdf={() => setPdfItem(request)} />
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Btn onClick={() => navigate('/repair-requests')} variant="primary">
              📋 ดูรายการแจ้งซ่อมทั้งหมด
            </Btn>
            <Btn onClick={() => navigate('/')} variant="outline">
              🏠 กลับหน้าหลัก
            </Btn>
          </div>
        </div>
      )
    }

    if (step === 'approve' && request) return <StepApprove request={request} onUpdated={handleDone} />
    if (step === 'complete' && request) return <StepComplete request={request} onUpdated={handleDone} />
    if ((step === 'view' || reqId) && request) return <StatusView request={request} onOpenPdf={() => setPdfItem(request)} />
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
        padding: '16px 12px 36px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input, select, textarea { font-family: inherit; }
        input:focus, select:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.2) !important; }
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
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Gemma Knits Maintenance Platform</div>
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
        TextileOps Maintenance Management System · Gemma Knits
      </div>

      {/* ── PDF PREVIEW MODAL ────────────────────────────────────── */}
      {pdfItem && (
        <PdfPreviewModal
          open={!!pdfItem}
          onClose={() => setPdfItem(null)}
          {...generateRepairRequestPdfProps(pdfItem)}
        />
      )}
    </div>
  )
}
