import { useState, useEffect } from 'react'
import { StepReportProblem } from './stepReportProblem.jsx'
import { StepReportTypeSelector } from './stepReportTypeSelector.jsx'
import { loadTelegramSettingsDB } from '../../utils/telegram'
import {
  createRepairRequest,
  completeRepairRequest,
  encodeRepairProblemDescription,
  buildMonthlyRequestNo,
  buildRepairWorkOrderPayload,
} from '../../modules/repair'
import {
  TechnicianAPI,
  SparePartAPI,
  StockTxnAPI,
  WorkOrderAPI,
  RepairRequestAPI,
  calculateDuration,
  formatMinutesToThai,
} from '../../api/entities'
import { QUICK_INTERRUPTION_PRESETS } from '../../pages/WorkOrders'
import { isItemInText, toggleItemInText } from '../../utils/textToggle'
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Cpu,
  Send,
  ArrowLeft,
  XCircle,
  Loader,
} from 'lucide-react'

export const COMMON_ISSUES = [
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

export const COMMON_SOLUTIONS = [
  'เปลี่ยนเข็มใหม่ตามเบอร์ที่กำหนด',
  'ขัดแต่งร่องเข็มและทำความสะอาด',
  'ตั้งศูนย์กระบอกสูบและปรับระยะ',
  'เปลี่ยนสายพานและตั้งตึง',
  'หยอดน้ำมันหล่อลื่นและตรวจเช็คระบบ',
  'ทำความสะอาดชุดส่งด้าย',
]

export function Btn({ onClick, disabled, loading, children, variant = 'primary', style }) {
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

export function PriorityBadge({ priority }) {
  if (!priority) return null
  const pMap = {
    'ด่วนที่สุด': { label: '🔴 ด่วนที่สุด (หยุดผลิต)', bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' },
    'ด่วน':       { label: '🟡 ด่วน', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    'ปกติ':       { label: '🟢 ปกติ', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  }
  const cfg = pMap[priority] || { label: priority, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 800,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  )
}

export function FieldRow({ label, value, highlight, mono, full }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div
      style={{
        display: full ? 'block' : 'flex',
        justifyContent: 'space-between',
        alignItems: full ? 'flex-start' : 'center',
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
export function StepHeader({ activeStep, title, subtitle }) {
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
export function StepReport({ serial, cylinder, onSubmitted, onBack }) {
  const [design, setDesign] = useState(cylinder?.Design || '')
  const [ki, setKi] = useState(cylinder?.KI !== undefined && cylinder?.KI !== null ? String(cylinder.KI) : '')
  const [rollNo, setRollNo] = useState('')
  const [problem, setProblem] = useState('')
  const [urgency, setUrgency] = useState('ปกติ')
  const [problemCause, setProblemCause] = useState('')
  const [reporter, setReporter] = useState('')
  const [repairType, setRepairType] = useState('EASY') // 'EASY' | 'COMPLEX'
  const [techList, setTechList] = useState([])
  const [assignedTech, setAssignedTech] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cylinder?.Design && !design) setDesign(cylinder.Design)
    if (cylinder?.KI && !ki) setKi(String(cylinder.KI))
  }, [cylinder])

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

  const submit = async () => {
    if (saving) return
    if (!problem.trim()) return setError('กรุณาระบุรายละเอียดอาการเสียที่พบ')
    if (!reporter.trim()) return setError('กรุณาระบุชื่อผู้แจ้งซ่อม')
    if (repairType === 'EASY' && !assignedTech.trim()) {
      return setError('กรุณาเลือกหรือระบุชื่อช่างผู้รับผิดชอบสำหรับงานง่าย')
    }
    setSaving(true)
    setError('')
    try {
      const isEasy = repairType === 'EASY'
      const encodedProblem = encodeRepairProblemDescription(problem.trim(), {
        Design: design.trim(),
        KI: ki.trim(),
        roll_no: rollNo.trim(),
        priority: urgency,
        repair_type: repairType,
      })

      // Monthly running number, same pattern as existing records (RR202609-0056)
      let requestNo = null
      try {
        const existing = await RepairRequestAPI.list()
        requestNo = buildMonthlyRequestNo(existing)
      } catch (e) {
        console.warn('Repair request_no generation warning:', e)
      }

      let insertPayload = {
        request_no: requestNo,
        cylinder_serial: serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || null,
        cylinder_location: cylinder?.Location || null,
        cylinder_standard: cylinder?.Standard || null,
        machine_mc: cylinder?.NewMC || null,
        Design: design.trim() || null,
        KI: ki.trim() ? Number(ki) : null,
        roll_no: rollNo.trim() ? Number(rollNo) : null,
        problem_description: encodedProblem,
        priority: urgency,
        reported_by: reporter.trim(),
        repair_type: repairType,
        status: isEasy ? 'APPROVED' : 'PENDING',
        technician_name: isEasy ? assignedTech.trim() : null,
        approved_by: isEasy ? 'ผู้แจ้งซ่อม (งานง่าย)' : null,
        approved_at: isEasy ? new Date().toISOString() : null,
        approval_notes: isEasy ? 'งานทั่วไป/งานง่าย (เลือกช่างตรง)' : null,
      }
      const { data } = await createRepairRequest(insertPayload, { cylinder })

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
      {onBack && (
        <div style={{ padding: '14px 18px 0' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ArrowLeft size={16} /> เปลี่ยนเมนู (แจ้งซ่อม / เบิกเข็ม Spare)
          </button>
        </div>
      )}
      <StepHeader
        activeStep={1}
        title="📝 ใบแจ้งซ่อมเครื่องจักร / กระบอกสูบ"
        subtitle={
          repairType === 'EASY'
            ? '⚡ งานทั่วไป (เลือกช่างตรง): ระบบอนุมัติอัตโนมัติ แจ้งเตือนเข้าช่างทันที ไม่ต้องรอหัวหน้าอนุมัติ'
            : '🛡️ งานยาก/งานซ่อมใหญ่: ส่งแจ้งเตือนหาหัวหน้าช่างเพื่อพิจารณาอนุมัติและมอบหมายช่าง'
        }
      />

      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <StepReportTypeSelector repairType={repairType} setRepairType={setRepairType} techList={techList} assignedTech={assignedTech} setAssignedTech={setAssignedTech} inputStyle={inputStyle} />

        
        {/* 2-Column Responsive Grid Layout: ซ้าย = ข้อมูลเครื่อง & งานผลิต & ผู้แจ้ง, ขวา = รายละเอียดปัญหา & อาการเสีย */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
          
          {/* 👈 ฝั่งซ้าย: ข้อมูลเครื่องจักร, ข้อมูลงานผลิต, ผู้แจ้งซ่อม */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 🏭 ส่วนที่ 1: ข้อมูลเครื่องจักรและกระบอกสูบเป้าหมาย 🏭 */}
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
                  <span>📋 ข้อมูลงานผลิต (Production Info)</span>
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

          {/* 👉 ฝั่งขวา: ปัญหาและรายละเอียดอาการเสีย (Problem & Issue Details) */}
          <StepReportProblem problem={problem} setProblem={setProblem} urgency={urgency} setUrgency={setUrgency} error={error} saving={saving} submit={submit} COMMON_ISSUES={COMMON_ISSUES} inputStyle={inputStyle} />


        </div>


      </div>
    </div>
  )
}

/* ── Step 3: Complete (บันทึกผลงานช่าง & ปิดงาน) ──────────────────────────── */
export function StepComplete({ request, onUpdated }) {
  const [details, setDetails] = useState(request.repair_details || '')
  const [tech, setTech] = useState(request.technician_name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 📦 Hybrid Spare Part Selector State
  const [catalogParts, setCatalogParts] = useState([])
  const [selectedPartId, setSelectedPartId] = useState('')
  const [partQty, setPartQty] = useState(1)
  const [selectedPartsList, setSelectedPartsList] = useState([])
  const [customPartsText, setCustomPartsText] = useState(request.parts_used || '')
  const [loadingParts, setLoadingParts] = useState(false)

  // ⏸️ Interruption / Lost Time State for Repair Completion
  const [interruptionLogs, setInterruptionLogs] = useState(() => {
    let raw = request.interruption_logs || request.Interruption_Logs || []
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw) } catch { raw = [] }
    }
    return Array.isArray(raw) ? raw : []
  })
  const [intTaskName, setIntTaskName] = useState('')
  const [intMins, setIntMins] = useState('')
  const [showIntSection, setShowIntSection] = useState(false)

  const startTimeStr = request.approved_at || request.created_at || new Date().toISOString()
  const durationRes = calculateDuration(startTimeStr, new Date().toISOString(), interruptionLogs)

  useEffect(() => {
    let active = true
    const loadParts = async () => {
      setLoadingParts(true)
      try {
        const list = await SparePartAPI.list()
        if (active && Array.isArray(list)) {
          setCatalogParts(list)
        }
      } catch (e) {
        console.warn('Failed to load spare parts for repair closure:', e)
      }
      if (active) setLoadingParts(false)
    }
    loadParts()
    return () => {
      active = false
    }
  }, [])

  if (request.status === 'PENDING') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <AlertTriangle size={52} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ไม่สามารถปิดงานได้</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>งานซ่อมนี้ยังไม่ได้รับการอนุมัติจากหัวหน้า กรุณารอการอนุมัติก่อน</div>
      </div>
    )
  }

  if (request.status === 'REJECTED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <XCircle size={52} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>งานถูกปฏิเสธแล้ว</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ไม่สามารถบันทึกผลซ่อมสำหรับงานที่ไม่อนุมัติได้</div>
      </div>
    )
  }

  if (request.status === 'COMPLETED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ปิดงานซ่อมเสร็จสมบูรณ์</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>บันทึกผลการซ่อมเข้าสู่ระบบเรียบร้อยแล้ว</div>
      </div>
    )
  }

  const handleAddCatalogPart = () => {
    if (!selectedPartId) return
    const p = catalogParts.find((item) => item.id === selectedPartId || item._id === selectedPartId)
    if (!p) return
    const qty = Math.max(1, Number(partQty) || 1)

    setSelectedPartsList((prev) => {
      const existsIdx = prev.findIndex((item) => item.id === p.id)
      if (existsIdx >= 0) {
        const next = [...prev]
        next[existsIdx] = { ...next[existsIdx], qty: next[existsIdx].qty + qty }
        return next
      }
      return [
        ...prev,
        {
          id: p.id || p._id,
          PartNumber: p.Part_Code || p.PartNumber || p.Code || '',
          PartName: p.Part_Name_EN || p.Part_Name_TH || p.PartName || p.Name || 'อะไหล่',
          Unit: p.Unit || 'ชิ้น',
          UnitPrice: Number(p.Unit_Price ?? p.UnitPrice ?? 0),
          QuantityOnHand: Number(p.Stock_Qty ?? p.QuantityOnHand ?? p.Stock ?? 0),
          Location_Store: p.Location_Store || '',
          qty,
        },
      ]
    })
    setSelectedPartId('')
    setPartQty(1)
  }

  const handleRemovePart = (idx) => {
    setSelectedPartsList((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAddInterruption = () => {
    const name = intTaskName.trim()
    const mins = parseInt(intMins, 10)
    if (!name) return alert('กรุณาระบุชื่องานแทรก เช่น ไปขึ้นด้าย เครื่อง 12334')
    if (!mins || mins <= 0) return alert('กรุณาระบุจำนวนนาทีที่สูญเสียไป')

    const newLog = {
      id: `INT-${Date.now()}`,
      task_name: name,
      duration_minutes: mins,
      duration_hours: Math.round((mins / 60) * 100) / 100,
      created_at: new Date().toISOString(),
    }
    setInterruptionLogs((prev) => [...prev, newLog])
    setIntTaskName('')
    setIntMins('')
  }

  const handleRemoveInterruption = (id) => {
    setInterruptionLogs((prev) => prev.filter((item) => item.id !== id))
  }

  const submit = async () => {
    if (saving) return
    if (!details.trim()) return setError('กรุณาระบุรายละเอียดการซ่อม / วิธีแก้ไข')
    if (!tech.trim()) return setError('กรุณาระบุชื่อช่างผู้ปฏิบัติงาน')
    setSaving(true)
    setError('')

    // 1. Build summary of parts used
    const catalogSummary = selectedPartsList
      .map((p) => `${p.PartName}${p.PartNumber ? ` [${p.PartNumber}]` : ''} (${p.qty} ${p.Unit})`)
      .join(', ')
    const partsSummary = [catalogSummary, customPartsText.trim()].filter(Boolean).join(', ')

    // 2. Duration with Interruption subtraction
    const now = new Date()
    const netHours = durationRes.netHoursDecimal
    const grossHours = durationRes.grossHoursDecimal
    const lostHours = durationRes.lostHoursDecimal

    try {
      // 3. Update repair_requests in Supabase (with schema-resilient retry loop)
      const { data } = await completeRepairRequest(request.id, {
        repair_details: details.trim(),
        parts_used: partsSummary,
        completed_at: now.toISOString(),
        completed_by: tech.trim(),
        interruption_logs: interruptionLogs,
        gross_duration_hours: grossHours,
        sunday_duration_hours: durationRes.sundayHoursDecimal,
        lost_duration_hours: lostHours,
        net_working_hours: netHours,
        machine_mc: request.machine_mc,
        cylinder_serial: request.cylinder_serial,
      })

      // 4. Auto-Sync Q1: Create the workorder row (only real DB columns —
      //    unknown column names are stripped by the schema-retry loop, which
      //    used to leave work orders without WO_ID / technician / dates).
      try {
        const woId = `WO-${request.request_no || request.id}`
        const existingWOs = await WorkOrderAPI.list().catch(() => [])
        const alreadySynced = (Array.isArray(existingWOs) ? existingWOs : []).some(
          (w) => String(w.WO_ID || '') === woId
        )
        if (!alreadySynced) {
          await WorkOrderAPI.create(buildRepairWorkOrderPayload({
            woId,
            record: request,
            techName: tech.trim(),
            startIso: startTimeStr,
            endIso: now.toISOString(),
            durationHours: netHours,
            detail: details.trim(),
            extraComment: {
              gross_duration_hours: grossHours,
              sunday_duration_hours: durationRes.sundayHoursDecimal,
              lost_duration_hours: lostHours,
              net_working_hours: netHours,
              interruption_logs: interruptionLogs,
            },
          }))
        }
      } catch (woErr) {
        console.warn('Work order auto-sync warning (will continue):', woErr)
      }

      // 5. Auto-Deduct Q2: Deduct stock from spareparts & insert stocktransactions
      for (const p of selectedPartsList) {
        try {
          const currentStock = Number(p.QuantityOnHand || 0)
          const nextStock = Math.max(0, currentStock - p.qty)
          await SparePartAPI.update(p.id, {
            Stock_Qty: nextStock,
            QuantityOnHand: nextStock,
            updated_at: now.toISOString(),
          })
          const machineCode = String(request.machine_mc || request.mc || '').trim()
          await StockTxnAPI.create({
            TXN_ID: `TXN-USE-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            TXN_Type: 'USE',
            Part_ID: p.id,
            Part_Code: p.PartNumber,
            Part_Name_EN: p.PartName,
            Location_Store: p.Location_Store || '',
            Quantity: -Math.abs(p.qty),
            Qty_Change: Math.abs(p.qty),
            Reference: request.request_no,
            Reference_ID: request.request_no,
            MC: machineCode,
            Machine_MC: machineCode,
            Remarks: `เบิกใช้ในงานแจ้งซ่อม ${request.request_no}${machineCode ? ` (เครื่อง ${machineCode})` : ''}${p.Location_Store ? ` [คลัง ${p.Location_Store}]` : ''}`,
            Note: `เบิกใช้ในงานแจ้งซ่อม ${request.request_no}${machineCode ? ` (เครื่อง ${machineCode})` : ''}${machineCode ? `\nMC: ${machineCode}` : ''}${p.Location_Store ? `\nคลัง: ${p.Location_Store}` : ''}`,
            Created_By: tech.trim(),
            Performed_By: tech.trim(),
            Date: now.toISOString(),
            created_date: now.toISOString(),
          })
        } catch (stockErr) {
          console.warn(`Stock deduction warning for ${p.PartName}:`, stockErr)
        }
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
        
        {/* 2-Column Responsive Grid Layout: ซ้าย = เครื่อง/งานผลิต/บันทึกผลงาน, ขวา = รายละเอียดปัญหา & คำสั่งหัวหน้า */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
          
          {/* 👈 ฝั่งซ้าย: ข้อมูลเครื่องจักร & งานผลิต & ผลการซ่อมของช่าง */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 🏭 ส่วนที่ 1: ข้อมูลเครื่องจักรเป้าหมาย */}
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
                🎯 ข้อมูลเครื่องจักรเป้าหมาย (Target Asset)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 900, color: '#ffffff' }}>
                  <Cpu size={16} style={{ color: '#60a5fa' }} />
                  <span>M/C: <span style={{ color: '#93c5fd' }}>{request.machine_mc || '—'}</span></span>
                </div>
                <span style={{ color: '#475569' }}>|</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff' }}>
                  ซีเรียล: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{request.cylinder_serial || '—'}</span>
                </div>
                {request.cylinder_location && (
                  <>
                    <span style={{ color: '#475569' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>
                      <MapPin size={13} style={{ color: '#f87171' }} /> {request.cylinder_location}
                    </div>
                  </>
                )}
                {request.cylinder_standard && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.12)', color: '#e2e8f0', fontWeight: 700 }}>
                    {request.cylinder_standard}
                  </span>
                )}
              </div>
            </div>

            {/* 🌟 ส่วนที่ 2: ข้อมูลงานผลิต */}
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
                <span>📋 ข้อมูลงานผลิต (Production Info)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🎨 Design</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', wordBreak: 'break-word' }}>{request.Design || '—'}</span>
                </div>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>🧾 KI</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{request.KI !== undefined && request.KI !== null && request.KI !== '' ? request.KI : '—'}</span>
                </div>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: 12, border: '1px solid #dbeafe' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>📦 เลขม้วน</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>{request.roll_no || request.RollNo || request.roll_number || '—'}</span>
                </div>
              </div>
            </div>

            {/* 👨‍🔧 ชื่อช่าง */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                👨‍🔧 ชื่อช่างผู้ดำเนินการซ่อม *
              </label>
              <input
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                placeholder="ชื่อช่างผู้ปฏิบัติงาน"
                style={inputStyle}
              />
            </div>

            {/* 🛠️ รายละเอียดการซ่อม / วิธีแก้ไข & quick chips */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                🛠️ รายละเอียดการซ่อม / วิธีแก้ไข *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {COMMON_SOLUTIONS.map((sol) => {
                  const isSelected = isItemInText(details, sol)
                  return (
                    <button
                      key={sol}
                      type="button"
                      onClick={() => setDetails((prev) => toggleItemInText(prev, sol))}
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? 800 : 700,
                        padding: '5px 10px',
                        borderRadius: 20,
                        background: isSelected ? '#10b981' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#334155',
                        border: isSelected ? '1.5px solid #059669' : '1px solid #e2e8f0',
                        boxShadow: isSelected ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontWeight: 900 }}>{isSelected ? '✓' : '+'}</span>
                      <span>{sol}</span>
                    </button>
                  )
                })}
              </div>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="อธิบายวิธีแก้ไข เช่น เปลี่ยนเข็มใหม่, ตั้งศูนย์กระบอก, หยอดน้ำมัน..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: 74 }}
              />
            </div>

            {/* 📦 ส่วนที่ 3: ระบบเบิกใช้อะไหล่ (Hybrid Spare Part Selector) */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 14, border: '1.5px solid #cbd5e1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                📦 อะไหล่ที่เบิกใช้ (ตัดสต็อกอัตโนมัติ)
              </label>

              {/* 1. Catalog Part Picker */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minHeight: 40, fontSize: 13, padding: '6px 10px' }}
                >
                  <option value="">-- เลือกอะไหล่จากคลัง --</option>
                  {catalogParts.map((p) => {
                    const id = p.id || p._id
                    const stock = Number(p.Stock_Qty ?? p.QuantityOnHand ?? p.Stock ?? 0)
                    const code = p.Part_Code || p.PartNumber || p.Code || ''
                    const name = p.Part_Name_EN || p.Part_Name_TH || p.PartName || p.Name || 'อะไหล่'
                    const loc = p.Location_Store || p.location || ''
                    const locBadge = loc ? ` · คลัง ${loc}` : ''
                    return (
                      <option key={id} value={id}>
                        {name} {code ? `[${code}]` : ''}{locBadge} (คงเหลือ: {stock} {p.Unit || 'ชิ้น'})
                      </option>
                    )
                  })}
                </select>

                <input
                  type="number"
                  min={1}
                  value={partQty}
                  onChange={(e) => setPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ ...inputStyle, width: 70, minHeight: 40, textAlign: 'center', fontSize: 13, padding: '6px 4px' }}
                  title="จำนวนที่เบิกใช้"
                />

                <button
                  type="button"
                  onClick={handleAddCatalogPart}
                  disabled={!selectedPartId}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    background: selectedPartId ? '#2563eb' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 12,
                    border: 'none',
                    cursor: selectedPartId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  + เพิ่ม
                </button>
              </div>

              {/* List of Added Catalog Parts */}
              {selectedPartsList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {selectedPartsList.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      <span>📦 {item.PartName} × {item.qty} {item.Unit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontWeight: 900,
                          cursor: 'pointer',
                          padding: '0 2px',
                        }}
                        title="ลบรายการ"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 2. Free-text for custom / external parts */}
              <input
                value={customPartsText}
                onChange={(e) => setCustomPartsText(e.target.value)}
                placeholder="ระบุอะไหล่อื่นๆ / วัสดุภายนอกเพิ่มเติม (ถ้ามี)..."
                style={{ ...inputStyle, minHeight: 38, fontSize: 13 }}
              />
            </div>
          </div>

          {/* 👉 ฝั่งขวา: ปัญหาที่แจ้งและคำสั่งการหัวหน้า (Problem & Supervisor Notes) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#f8fafc',
              padding: '16px',
              borderRadius: 18,
              border: '1.5px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️ ปัญหาที่แจ้ง & คำสั่งหัวหน้าช่าง</span>
            </div>
            <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} mono highlight />
            <FieldRow label="ระดับความเร่งด่วน" value={<PriorityBadge priority={request.priority} />} />
            <FieldRow label="ผู้แจ้งซ่อม" value={request.reported_by} />
            <FieldRow label="วันที่แจ้ง" value={request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : null} />

            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', display: 'block', marginBottom: 4 }}>
                รายละเอียดปัญหาที่ได้รับแจ้ง:
              </span>
              <div
                style={{
                  background: '#ffffff',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #fed7aa',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1e293b',
                  minHeight: 80,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {request.problem_description || 'ไม่มีรายละเอียด'}
              </div>
            </div>

            {request.approval_notes && (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', display: 'block', marginBottom: 4 }}>
                  📝 คำสั่งการจากหัวหน้าช่าง (Supervisor Notes):
                </span>
                <div
                  style={{
                    background: '#eff6ff',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1.5px solid #bfdbfe',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1e40af',
                    minHeight: 60,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {request.approval_notes}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ⏱️ ส่วนสรุประยะเวลา & บันทึกงานแทรก/เวลาที่สูญเสียไป */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', border: '1.5px solid #cbd5e1', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} style={{ color: '#f59e0b' }} />
              <span>สรุปเวลาปฏิบัติงาน & หักลบงานแทรก</span>
            </div>
            <button
              type="button"
              onClick={() => setShowIntSection(!showIntSection)}
              style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {showIntSection ? 'ซ่อนการบันทึกงานแทรก' : '+ เพิ่มงานแทรก / เวลาที่เสียไป'}
            </button>
          </div>

          {/* Duration Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: durationRes.sundayMinutes > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
            <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>เวลารวม (Gross)</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>{durationRes.grossDurationText}</div>
            </div>
            {durationRes.sundayMinutes > 0 && (
              <div style={{ background: '#f0f9ff', padding: '8px 10px', borderRadius: 10, border: '1px solid #bae6fd', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#0284c7', fontWeight: 700 }}>🏖️ หักวันอาทิตย์</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>- {durationRes.sundayDurationText}</div>
              </div>
            )}
            <div style={{ background: '#fffbeb', padding: '8px 10px', borderRadius: 10, border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700 }}>เวลาที่สูญเสียไป</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#b45309', fontFamily: 'monospace' }}>- {durationRes.lostDurationText}</div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #a7f3d0', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#059669', fontWeight: 800 }}>👉 เวลาทำงานจริง</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#047857', fontFamily: 'monospace' }}>{durationRes.netDurationText}</div>
            </div>
          </div>

          {/* Quick Interruption Add Form */}
          {showIntSection && (
            <div style={{ background: '#ffffff', padding: 12, borderRadius: 12, border: '1px solid #dbeafe', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8' }}>
                ระบุงานแทรก (เช่น ไปขึ้นด้าย เครื่อง 12334)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {QUICK_INTERRUPTION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setIntTaskName(preset.template)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="ชื่องานแทรก / รายละเอียด..."
                  value={intTaskName}
                  onChange={(e) => setIntTaskName(e.target.value)}
                  style={{ ...inputStyle, flex: 2, minHeight: 36, fontSize: 12 }}
                />
                <input
                  type="number"
                  placeholder="นาที (เช่น 30)"
                  value={intMins}
                  onChange={(e) => setIntMins(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minHeight: 36, fontSize: 12, fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  onClick={handleAddInterruption}
                  style={{ padding: '6px 12px', borderRadius: 10, background: '#f59e0b', color: '#ffffff', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer' }}
                >
                  + เพิ่ม
                </button>
              </div>

              {/* List of Interruptions */}
              {interruptionLogs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {interruptionLogs.map((item) => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '5px 8px', borderRadius: 8, border: '1px solid #fed7aa', fontSize: 11 }}
                    >
                      <span style={{ fontWeight: 700, color: '#92400e' }}>
                        🧵 {item.task_name} ({formatMinutesToThai(item.duration_minutes)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterruption(item.id)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', fontWeight: 900, cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

        <Btn onClick={submit} loading={saving} variant="success" style={{ marginTop: 4, padding: '14px 20px', fontSize: 16 }}>
          <CheckCircle size={18} /> ยืนยันบันทึกปิดงานซ่อม
        </Btn>
      </div>
    </div>
  )
}
