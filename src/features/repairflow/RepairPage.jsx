import { useState, useEffect, useCallback } from 'react'
import { useRealtimeTables } from '../../api/realtimeSync'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { db } from '../../api/dbClient'
import { loadTelegramSettingsDB } from '../../utils/telegram'
import {
  createRepairRequest,
  approveRepairRequest,
  completeRepairRequest,
  normalizeRepairRecord,
  encodeRepairProblemDescription,
  buildMonthlyRequestNo,
  buildRepairWorkOrderPayload,
} from '../../modules/repair'
import {
  TechnicianAPI,
  SparePartAPI,
  StockTxnAPI,
  WorkOrderAPI,
  SpareNeedleRequestAPI,
  RepairRequestAPI,
  calculateDuration,
  formatMinutesToThai,
  calculateInterruptionTotal,
} from '../../api/entities'
import { QUICK_INTERRUPTION_PRESETS } from '../../pages/WorkOrders'
import PdfPreviewModal from '../../components/ui/PdfPreviewModal'
import { generateRepairRequestPdfProps } from '../../utils/pdfDocGenerators'
import { PROBLEM_CAUSE_OPTIONS, getProblemCauseMeta } from '../../constants/problemCause'
import { isItemInText, toggleItemInText } from '../../utils/textToggle'
import {
  ActionChoiceModal,
  StepSpareNeedleRequest,
  StepPrepareSpareNeedle,
  StepAcknowledgeSpareNeedle,
} from '../../components/repair/SpareNeedleFlow'
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
  Pause,
  Play,
  History,
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
  UserCheck,
  ArrowLeft,
} from 'lucide-react'
import gemmaLogo from '../../assets/logo-gemma.png'
import { COMMON_ISSUES, COMMON_SOLUTIONS, Btn, PriorityBadge, FieldRow, StepHeader, StepReport, StepComplete } from './repairSteps.jsx'

const STATUS_LABEL = {
  PENDING:    { label: 'รอการอนุมัติ',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', dot: '#f59e0b' },
  APPROVED:   { label: 'อนุมัติแล้ว (รอดำเนินการ)', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', dot: '#6366f1' },
  REJECTED:   { label: 'ไม่อนุมัติ',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)', dot: '#ef4444' },
  IN_PROGRESS:{ label: 'กำลังดำเนินการซ่อม', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', dot: '#3b82f6' },
  WAIT_PARTS: { label: 'รออะไหล่',      color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', dot: '#a855f7' },
  COMPLETED:  { label: 'ซ่อมเสร็จสมบูรณ์', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', dot: '#10b981' },
}


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

  if (request.status === 'REJECTED') {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <XCircle size={52} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ไม่อนุมัติ — งานถูกปฏิเสธแล้ว</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          หากต้องการแจ้งซ่อมใหม่ กรุณาสแกน QR Code อีกครั้ง
        </div>
      </div>
    )
  }

  if (['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(request.status)) {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>อนุมัติและมอบหมายเรียบร้อยแล้ว</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          ช่างผู้รับผิดชอบ: <strong style={{ color: '#2563eb' }}>{request.technician_name}</strong>
        </div>
        {request.status !== 'COMPLETED' && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <Btn
              onClick={() => {
                const serialParam = encodeURIComponent(request.cylinder_serial || '')
                window.location.href = `/repair/${serialParam}?req=${request.id}&step=complete`
              }}
              variant="primary"
              style={{ padding: '12px 22px', fontSize: 14, fontWeight: 800 }}
            >
              <Wrench size={16} /> ไปที่ขั้นตอนบันทึกผลการซ่อม (Step 3)
            </Btn>
          </div>
        )}
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
      const { data } = await approveRepairRequest(request.id, {
        status,
        technician_name: tech.trim(),
        approval_notes: notes.trim(),
        approved_at: new Date().toISOString(),
        approved_by: tech.trim() || 'Supervisor',
      })
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
        
        {/* 2-Column Responsive Grid Layout: ซ้าย = เครื่อง/งานผลิต/มอบหมายช่าง, ขวา = รายละเอียดปัญหา & อาการเสีย */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
          
          {/* 👈 ฝั่งซ้าย: ข้อมูลเครื่องจักร & งานผลิต & มอบหมายช่าง */}
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

            {/* 🌟 ส่วนที่ 2: ข้อมูลงานผลิต (จากใบแจ้งซ่อม) */}
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

            {/* 👨‍💼 มอบหมายช่าง */}
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

            {/* คำสั่งการเพิ่มเติม */}
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
          </div>

          {/* 👉 ฝั่งขวา: รายละเอียดปัญหาและข้อมูลใบแจ้งซ่อม (Problem & Issue Details) */}
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
              <span>⚠️ ข้อมูลปัญหาและอาการเสียที่แจ้ง</span>
            </div>
            <FieldRow label="เลขที่ใบแจ้ง" value={request.request_no} mono highlight />
            <FieldRow label="ระดับความเร่งด่วน" value={<PriorityBadge priority={request.priority} />} />
            <FieldRow label="ผู้แจ้งซ่อม" value={request.reported_by} />
            <FieldRow label="วันที่แจ้ง" value={request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : null} />

            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', display: 'block', marginBottom: 4 }}>
                รายละเอียดปัญหา / อาการเสียที่พบ:
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
                  minHeight: 110,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {request.problem_description || 'ไม่มีรายละเอียด'}
              </div>
            </div>
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
              fontWeight: 800,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn onClick={() => handle('approve')} loading={saving === 'approve'} variant="success" style={{ flex: 2, padding: '14px 20px', fontSize: 16 }}>
            <CheckCircle size={18} /> ยืนยันอนุมัติและมอบหมาย
          </Btn>
          <Btn onClick={() => handle('reject')} loading={saving === 'reject'} variant="danger" style={{ flex: 1, padding: '14px 16px', fontSize: 16 }}>
            ไม่อนุมัติ
          </Btn>
        </div>
      </div>
    </div>
  )
}


/* ── Status & Digital Work Order View (ใบสรุปประวัติงาน) ─────────────────── */
function StatusView({ request, onOpenPdf }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const s = STATUS_LABEL[request.status] || STATUS_LABEL.PENDING

  const copyUrl = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
      } else {
        const input = document.createElement('input')
        input.value = window.location.href
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('Clipboard copy error:', e)
    }
  }

  const shareLine = () => {
    const text = `📋 ใบแจ้งซ่อมเลขที่: ${request.request_no || request.id}\nเครื่องจักร: ${request.machine_mc || '—'}\nซีเรียล: ${request.cylinder_serial || '—'}\nDesign: ${request.Design || '—'}\nสถานะ: ${s.label}\nลิงก์: ${window.location.href}`
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  const isEasy = request.repair_type === 'EASY' || (!request.repair_type && (request.approved_by?.includes('งานง่าย') || (request.status === 'APPROVED' && request.technician_name)))

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

      {/* Prominent Action Button for Next Step */}
      {request.status === 'APPROVED' && (
        <Btn
          onClick={() => {
            const serialParam = encodeURIComponent(request.cylinder_serial || '')
            navigate(`/repair/${serialParam}?req=${request.id}&step=complete`)
          }}
          variant="primary"
          style={{
            padding: '14px 20px',
            fontSize: 16,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Wrench size={18} /> 🛠️ ช่างเริ่มงาน / บันทึกผลการซ่อม (Step 3)
        </Btn>
      )}

      {request.status === 'PENDING' && (
        <Btn
          onClick={() => {
            const serialParam = encodeURIComponent(request.cylinder_serial || '')
            navigate(`/repair/${serialParam}?req=${request.id}&step=approve`)
          }}
          variant="primary"
          style={{
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <UserCheck size={18} /> 👨‍💼 สำหรับหัวหน้าช่าง: อนุมัติและมอบหมายงาน (Step 2)
        </Btn>
      )}

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

      {/* 🌟 ส่วนที่ 2: ข้อมูลงานผลิต 🌟 */}
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
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', wordBreak: 'break-word' }}>{request.Design || '—'}</span>
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
        <FieldRow
          label="ประเภทงาน"
          value={
            isEasy ? (
              <span style={{ color: '#059669', fontWeight: 800 }}>⚡ งานทั่วไป (เลือกช่างตรง / อนุมัติอัตโนมัติ)</span>
            ) : (
              <span style={{ color: '#2563eb', fontWeight: 800 }}>🛡️ งานยาก / ซ่อมใหญ่ (รออนุมัติ)</span>
            )
          }
        />
        <FieldRow label="ระดับความเร่งด่วน" value={<PriorityBadge priority={request.priority} />} />
        <FieldRow
          label="สาเหตุปัญหา"
          value={
            request.problem_cause ? (
              (() => {
                const meta = getProblemCauseMeta(request.problem_cause)
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${meta.badgeClass}`}>
                    {meta.icon} {meta.label}
                  </span>
                )
              })()
            ) : null
          }
        />
        <FieldRow label="อาการเสียที่แจ้ง" value={request.problem_description} full />
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

/* ── Session required screen (deep link opened without a valid login) ─────── */
function SessionRequiredScreen({ navigate }) {
  const rememberAndGoLogin = () => {
    try { sessionStorage.setItem('textileops_return_to', window.location.href) } catch {}
    navigate('/')
  }
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🔐</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>ต้องเข้าสู่ระบบก่อน</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 600 }}>
        ลิงก์นี้ยังใช้งานได้ — กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ
        <br />ระบบจะพากลับมาที่หน้านี้อัตโนมัติ
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn onClick={rememberAndGoLogin} variant="primary" style={{ padding: '14px 28px', fontSize: 15 }}>
          🔐 เข้าสู่ระบบ
        </Btn>
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
  const step = searchParams.get('step') // approve | complete | view | prepare | ack
  const needleReqId = searchParams.get('needle_req')

  const [cylinder, setCylinder] = useState(null)
  const [request, setRequest] = useState(null)
  const [needleRequest, setNeedleRequest] = useState(null)
  const [needleDone, setNeedleDone] = useState(false)
  const [authMissing, setAuthMissing] = useState(false)
  const [activeAction, setActiveAction] = useState(null) // null | 'repair' | 'spare_needle'
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [pdfItem, setPdfItem] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      let decodedSerial = String(serial || '').trim()
      try {
        decodedSerial = decodeURIComponent(decodedSerial).trim()
      } catch {}

      let cyl = null
      let authFailed = false
      const noteError = (error) => {
        if (error && /unauthor|401/i.test(String(error.message || ''))) authFailed = true
      }
      if (decodedSerial) {
        const { data: foundNow, error: errNow } = await db
          .from('cylinders')
          .select('*')
          .eq('Serial_NOW', decodedSerial)
          .maybeSingle()
        noteError(errNow)
        cyl = foundNow
        if (!cyl) {
          const { data: foundOld, error: errOld } = await db
            .from('cylinders')
            .select('*')
            .eq('Serial_OLD', decodedSerial)
            .maybeSingle()
          noteError(errOld)
          cyl = foundOld
        }
      }
      setCylinder(cyl)

      if (reqId) {
        const { data: req, error: reqErr } = await db
          .from('repair_requests')
          .select('*')
          .eq('id', reqId)
          .maybeSingle()
        noteError(reqErr)
        setRequest(req ? normalizeRepairRecord(req) : null)
      }

      if (needleReqId) {
        try {
          const snr = await SpareNeedleRequestAPI.getById(needleReqId)
          setNeedleRequest(snr)
        } catch (err) {
          noteError(err)
        }
      }
      setAuthMissing(authFailed)
    } catch (e) {
      console.error('Error loading repair data:', e)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [serial, reqId, needleReqId])

  useRealtimeTables(['cylinders', 'repair_requests', 'spare_needle_requests'], () => {
    load({ silent: true })
  })

  useEffect(() => {
    load()
  }, [load])

  const handleDone = (updated) => {
    setRequest(updated ? normalizeRepairRecord(updated) : null)
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

    {/* ── Spare Needle Deep Links (?needle_req=...) ─────────────── */}
    if (needleReqId && needleRequest) {
      if (step === 'prepare') {
        return (
          <StepPrepareSpareNeedle
            snr={needleRequest}
            cylinder={cylinder}
            onPrepared={(updated) => {
              setNeedleRequest(updated)
              setNeedleDone(true)
            }}
            onClose={() => navigate('/')}
          />
        )
      }
      if (needleRequest.status !== 'PREPARED' && needleRequest.status !== 'COMPLETED') {
        // Not prepared by the stock keeper yet — the technician can only close.
        return (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>⏳</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              รอสโตร์เข็มจัดเตรียม
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 600 }}>
              ใบเบิก {needleRequest.request_no} (เครื่อง {needleRequest.machine_mc}) —
              ระบบจะแจ้งเตือนเมื่อจัดเตรียมเรียบร้อยแล้ว
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn onClick={() => navigate('/')} variant="success" style={{ padding: '14px 28px', fontSize: 15 }}>
                ✅ แจ้งเบิกเข็มแล้ว
              </Btn>
            </div>
          </div>
        )
      }
      return (
        <StepAcknowledgeSpareNeedle
          snr={needleRequest}
          cylinder={cylinder}
          onAcknowledged={(updated) => {
            setNeedleRequest(updated)
            setNeedleDone(true)
          }}
          onHome={() => navigate('/')}
        />
      )
    }

    if (needleReqId && !needleRequest && !loading) {
      if (authMissing) return <SessionRequiredScreen navigate={navigate} />
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <XCircle size={52} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>❌ ไม่พบข้อมูลคำขอเบิกเข็ม Spare</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 600 }}>
            ใบเบิกนี้อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => navigate('/')} variant="primary">🏠 กลับหน้าหลัก</Btn>
          </div>
        </div>
      )
    }

    if (needleDone && needleRequest) {
      const snrReady = needleRequest.status === 'PREPARED' || needleRequest.status === 'COMPLETED'
      return (
        <div style={{ padding: '24px 18px', textAlign: 'center' }}>
          <CheckCircle2 size={54} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
            {needleRequest.status === 'PREPARED'
              ? 'จัดเตรียมเข็มและตัดสต็อกเรียบร้อยแล้ว'
              : needleRequest.status === 'COMPLETED'
              ? 'บันทึกการรับเข็ม Spare ปิดงานเรียบร้อย'
              : 'ส่งคำขอเบิกเข็ม Spare เข้าสู่ระบบเรียบร้อย'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, fontWeight: 600 }}>
            ระบบส่งแจ้งเตือนเข้า Telegram & LINE เรียบร้อยแล้ว
          </div>
          {snrReady ? (
            <>
              <StepAcknowledgeSpareNeedle
                snr={needleRequest}
                cylinder={cylinder}
                onAcknowledged={(updated) => setNeedleRequest(updated)}
                onHome={() => navigate('/')}
              />
              <div style={{ marginTop: 16 }}>
                <Btn onClick={() => navigate('/')} variant="outline">
                  🏠 กลับหน้าหลัก
                </Btn>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, fontWeight: 600 }}>
                ⏳ รอสโตร์เข็มจัดเตรียม — ระบบจะแจ้งเตือนอีกครั้งเมื่อพร้อมรับ
              </div>
              <Btn
                onClick={() => navigate('/')}
                variant="success"
                style={{ width: '100%', padding: '16px', fontSize: 16 }}
              >
                <CheckCircle2 size={20} /> ✅ แจ้งเบิกเข็มแล้ว
              </Btn>
            </div>
          )}
        </div>
      )
    }

    {/* ── Repair Request Done ─────────────────────────────── */}
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

    {/* M6 Fix: If reqId was given but request is null, show error instead of blank form */}
    if (reqId && !request && !loading) {
      if (authMissing) return <SessionRequiredScreen navigate={navigate} />
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <XCircle size={52} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>❌ ไม่พบข้อมูลใบแจ้งซ่อม</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 600 }}>
            ใบแจ้งซ่อมนี้อาจถูกลบไปแล้ว หรือลิงก์หมดอายุ
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={() => navigate('/')} variant="primary">🏠 กลับหน้าหลัก</Btn>
          </div>
        </div>
      )
    }

    {/* ── Initial Scan Entry Point ─────────────────────────────── */}
    if (!activeAction && !reqId && !step && !needleReqId) {
      return (
        <ActionChoiceModal
          cylinder={cylinder}
          serial={serial}
          onSelectAction={(act) => setActiveAction(act)}
          onCancel={() => navigate('/')}
        />
      )
    }

    if (activeAction === 'spare_needle') {
      return (
        <StepSpareNeedleRequest
          cylinder={cylinder}
          serial={serial}
          onSubmitted={(newSnr) => {
            setNeedleRequest(newSnr)
            setNeedleDone(true)
          }}
          onBack={() => setActiveAction(null)}
        />
      )
    }

    return (
      <StepReport
        serial={serial}
        cylinder={cylinder}
        onSubmitted={handleDone}
        onBack={() => setActiveAction(null)}
      />
    )
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
          maxWidth: 860,
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
      <Card style={{ maxWidth: 860, width: '100%' }}>{renderContent()}</Card>

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
