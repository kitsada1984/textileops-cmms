import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { notifySupervisor, notifyTechnician, notifyCompleted, loadTelegramSettingsDB } from '../utils/telegram'
import { TechnicianAPI } from '../api/entities'
import { CheckCircle, Clock, Wrench, AlertTriangle, ChevronRight, Loader } from 'lucide-react'
import gemmaLogo from '../assets/logo-gemma.png'

const STATUS_LABEL = {
  PENDING:    { label: 'รอการอนุมัติ',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  APPROVED:   { label: 'อนุมัติแล้ว',   color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  REJECTED:   { label: 'ไม่อนุมัติ',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  IN_PROGRESS:{ label: 'กำลังซ่อม',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  COMPLETED:  { label: 'ซ่อมเสร็จ',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 20,
      border: '1px solid #e8edf5',
      boxShadow: '0 4px 24px rgba(0,8,24,0.08)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  )
}

function Btn({ onClick, disabled, loading, children, variant = 'primary' }) {
  const styles = {
    primary: { background: 'linear-gradient(135deg,#1a2745,#0d1629)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 8px rgba(10,20,50,0.3)' },
    success: { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' },
    danger:  { background: 'linear-gradient(135deg,#f43f5e,#dc2626)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' },
    outline: { background: '#fff', color: '#415a78', border: '1px solid #dce2ef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
      cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      opacity: (disabled || loading) ? 0.6 : 1,
      transition: 'all 150ms',
      ...styles[variant],
    }}>
      {loading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

function FieldRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f4fb' }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#90aabf', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f1d35', flex: 1 }}>{value}</span>
    </div>
  )
}

/* ── Step 1: Report ──────────────────────────────────────────────────────── */
function StepReport({ serial, cylinder, onSubmitted }) {
  const [problem,    setProblem]    = useState('')
  const [reporter,   setReporter]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const submit = async () => {
    if (!problem.trim()) return setError('กรุณาระบุปัญหา')
    if (!reporter.trim()) return setError('กรุณาระบุชื่อผู้แจ้ง')
    setSaving(true); setError('')
    try {
      const { data, error: err } = await supabase
        .from('repair_requests')
        .insert({
          cylinder_serial:     serial,
          cylinder_location:   cylinder?.Location || null,
          cylinder_standard:   cylinder?.Standard || null,
          machine_mc:          cylinder?.NewMC || null,
          problem_description: problem.trim(),
          reported_by:         reporter.trim(),
          status:              'PENDING',
        })
        .select().single()
      if (err) throw err
      try {
        await notifySupervisor(data, cylinder)
      } catch (tgErr) {
        console.warn('Telegram notification warning:', tgErr)
      }
      onSubmitted(data)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeff8' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ขั้นตอนที่ 1</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#06101e' }}>แจ้งซ่อมกระบอก</div>
      </div>
      <div style={{ padding: '24px' }}>
        {cylinder && (
          <div style={{ background: '#f6f8fd', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid #eaeff8' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#90aabf', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>ข้อมูลกระบอก</div>
            {cylinder.NewMC    && <div style={{ fontSize: 12, color: '#607d9a', marginTop: 3 }}>🏭 {cylinder.NewMC}</div>}
            {cylinder.Location && <div style={{ fontSize: 12, color: '#607d9a', marginTop: 3 }}>📍 {cylinder.Location}</div>}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ปัญหา / อาการเสีย *
          </label>
          <textarea
            value={problem} onChange={e => setProblem(e.target.value)}
            rows={4} placeholder="อธิบายปัญหาที่พบ..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ชื่อผู้แจ้ง *
          </label>
          <input
            value={reporter} onChange={e => setReporter(e.target.value)}
            placeholder="ชื่อ-นามสกุล หรือรหัสพนักงาน"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <Btn onClick={submit} loading={saving} variant="primary">
          <ChevronRight size={16} /> ยืนยันแจ้งซ่อม
        </Btn>
      </div>
    </div>
  )
}

/* ── Step 2: Approve ─────────────────────────────────────────────────────── */
function StepApprove({ request, onUpdated }) {
  const [techList, setTechList] = useState([])
  const [tech,   setTech]   = useState(request.technician_name || '')
  const [notes,  setNotes]  = useState(request.approval_notes || '')
  const [saving, setSaving] = useState('')
  const [error,  setError]  = useState('')

  useEffect(() => {
    Promise.allSettled([
      loadTelegramSettingsDB(),
      TechnicianAPI.list(),
    ]).then(([tgRes, techRes]) => {
      const tgTechs = tgRes.status === 'fulfilled' ? (tgRes.value?.technicians || []) : []
      const regTechs = techRes.status === 'fulfilled' && Array.isArray(techRes.value) ? techRes.value.map(t => ({ name: t.Name || t.name, chat_id: '' })) : []
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

  if (['APPROVED','IN_PROGRESS','COMPLETED'].includes(request.status)) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#06101e' }}>อนุมัติแล้ว</div>
          <div style={{ fontSize: 13, color: '#607d9a', marginTop: 4 }}>ช่าง: {request.technician_name}</div>
        </div>
      </div>
    )
  }

  const handle = async (action) => {
    if (saving) return
    if (action === 'approve' && !tech.trim()) return setError('กรุณาระบุชื่อช่าง')
    setSaving(action); setError('')
    try {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      const { data, error: err } = await supabase
        .from('repair_requests')
        .update({ status, technician_name: tech.trim(), approval_notes: notes.trim(), approved_at: new Date().toISOString(), approved_by: tech.trim() || 'Supervisor' })
        .eq('id', request.id)
        .select().single()
      if (err) throw err
      if (action === 'approve') {
        try {
          await notifyTechnician(data)
        } catch (tgErr) {
          console.warn('Telegram technician notify warning:', tgErr)
        }
      }
      onUpdated(data)
    } catch (e) { setError(e.message) }
    setSaving('')
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }

  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeff8' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ขั้นตอนที่ 2 · Supervisor</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#06101e' }}>อนุมัติและมอบหมายช่าง</div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ background: '#f6f8fd', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid #eaeff8' }}>
          <FieldRow label="ซีเรียล" value={request.cylinder_serial} />
          <FieldRow label="เครื่องปัจจุบัน" value={request.machine_mc} />
          <FieldRow label="ปัญหา" value={request.problem_description} />
          <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
          <FieldRow label="เลขที่" value={request.request_no} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            มอบหมายช่าง *
          </label>
          <select
            value={techList.some(t => t.name === tech) ? tech : (tech ? '__custom__' : '')}
            onChange={e => setTech(e.target.value === '__custom__' ? '' : e.target.value)}
            style={inputStyle}>
            <option value="">— เลือกช่าง —</option>
            {techList.map((t, i) => (
              <option key={i} value={t.name}>{t.name}</option>
            ))}
            <option value="__custom__">อื่นๆ (พิมพ์เอง)</option>
          </select>
          {!techList.some(t => t.name === tech) && (
            <input value={tech}
              onChange={e => setTech(e.target.value)}
              placeholder="พิมพ์ชื่อช่าง..."
              style={{ ...inputStyle, marginTop: 8 }} />
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            หมายเหตุ (ถึงช่าง)
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="คำแนะนำหรือรายละเอียดเพิ่มเติม..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => handle('approve')} loading={saving === 'approve'} variant="success">
            <CheckCircle size={15} /> ยืนยันอนุมัติซ่อม
          </Btn>
          <Btn onClick={() => handle('reject')} loading={saving === 'reject'} variant="danger">
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
  const [parts,   setParts]   = useState(request.parts_used || '')
  const [tech,    setTech]    = useState(request.technician_name || '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  if (request.status === 'COMPLETED') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <CheckCircle size={48} style={{ color: '#10b981', margin: '8px auto 16px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#06101e' }}>ซ่อมเสร็จเรียบร้อย</div>
        <div style={{ fontSize: 13, color: '#607d9a', marginTop: 6 }}>บันทึกเรียบร้อยแล้ว</div>
      </div>
    )
  }

  const submit = async () => {
    if (saving) return
    if (!details.trim()) return setError('กรุณาระบุรายละเอียดการซ่อม')
    if (!tech.trim()) return setError('กรุณาระบุชื่อช่าง')
    setSaving(true); setError('')
    try {
      const { data, error: err } = await supabase
        .from('repair_requests')
        .update({ status: 'COMPLETED', repair_details: details.trim(), parts_used: parts.trim(), completed_at: new Date().toISOString(), completed_by: tech.trim() })
        .eq('id', request.id)
        .select().single()
      if (err) throw err
      try {
        await notifyCompleted(data)
      } catch (tgErr) {
        console.warn('Telegram completed notify warning:', tgErr)
      }
      onUpdated(data)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eaeff8' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>ขั้นตอนที่ 3 · ช่างเทคนิค</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#06101e' }}>บันทึกผลการซ่อม</div>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ background: '#f6f8fd', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid #eaeff8' }}>
          <FieldRow label="ซีเรียล" value={request.cylinder_serial} />
          <FieldRow label="เครื่องปัจจุบัน" value={request.machine_mc} />
          <FieldRow label="ปัญหา" value={request.problem_description} />
          <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
          {request.approval_notes && <FieldRow label="หมายเหตุ Supervisor" value={request.approval_notes} />}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>ชื่อช่างที่ทำการซ่อม *</label>
          <input value={tech} onChange={e => setTech(e.target.value)} placeholder="ชื่อช่าง"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>รายละเอียดการซ่อม *</label>
          <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4}
            placeholder="อธิบายวิธีการแก้ไขปัญหา..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#607d9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>อะไหล่ที่ใช้ (ถ้ามี)</label>
          <input value={parts} onChange={e => setParts(e.target.value)} placeholder="ชื่อและจำนวนอะไหล่..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #dce2ef', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

        <Btn onClick={submit} loading={saving} variant="success">
          <CheckCircle size={15} /> ยืนยันซ่อมเสร็จ
        </Btn>
      </div>
    </div>
  )
}

/* ── Status view ─────────────────────────────────────────────────────────── */
function StatusView({ request }) {
  const s = STATUS_LABEL[request.status] || STATUS_LABEL.PENDING
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: s.bg, border: `1px solid ${s.color}30` }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.label}</span>
        <span style={{ fontSize: 12, color: '#90aabf', marginLeft: 'auto' }}>{request.request_no}</span>
      </div>
      <FieldRow label="ซีเรียล" value={request.cylinder_serial} />
      <FieldRow label="เครื่องปัจจุบัน" value={request.machine_mc} />
      <FieldRow label="ตำแหน่ง" value={request.cylinder_location} />
      <FieldRow label="ปัญหา" value={request.problem_description} />
      <FieldRow label="ผู้แจ้ง" value={request.reported_by} />
      <FieldRow label="วันที่แจ้ง" value={request.created_at ? new Date(request.created_at).toLocaleString('th-TH') : null} />
      <FieldRow label="ช่าง" value={request.technician_name} />
      <FieldRow label="หมายเหตุ" value={request.approval_notes} />
      <FieldRow label="รายละเอียดซ่อม" value={request.repair_details} />
      <FieldRow label="อะไหล่ที่ใช้" value={request.parts_used} />
      <FieldRow label="เสร็จเมื่อ" value={request.completed_at ? new Date(request.completed_at).toLocaleString('th-TH') : null} />
    </div>
  )
}

/* ── Main RepairPage ─────────────────────────────────────────────────────── */
export default function RepairPage() {
  const { serial }             = useParams()
  const [searchParams]         = useSearchParams()
  const reqId                  = searchParams.get('req')
  const step                   = searchParams.get('step')   // approve | complete | view

  const [cylinder, setCylinder] = useState(null)
  const [request,  setRequest]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [done,     setDone]     = useState(false)

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
          // Fetch cylinder info: check Serial_NOW first, fallback to Serial_OLD
          const { data: foundNow } = await supabase
            .from('cylinders').select('*')
            .eq('Serial_NOW', decodedSerial).maybeSingle()
          cyl = foundNow
          if (!cyl) {
            const { data: foundOld } = await supabase
              .from('cylinders').select('*')
              .eq('Serial_OLD', decodedSerial).maybeSingle()
            cyl = foundOld
          }
        }
        setCylinder(cyl)

        // Fetch request if ID provided
        if (reqId) {
          const { data: req } = await supabase
            .from('repair_requests').select('*')
            .eq('id', reqId).maybeSingle()
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

  const renderStep = () => {
    if (loading) return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader size={28} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <div style={{ marginTop: 12, color: '#90aabf', fontSize: 13 }}>กำลังโหลด...</div>
      </div>
    )
    if (done && request) return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: '#06101e', marginBottom: 6 }}>
          {request.status === 'COMPLETED' ? 'บันทึกผลซ่อมเรียบร้อย' : request.status === 'PENDING' ? 'ส่งแจ้งซ่อมเรียบร้อย' : 'บันทึกเรียบร้อย'}
        </div>
        <div style={{ fontSize: 13, color: '#607d9a', marginBottom: 20 }}>เลขที่ {request.request_no}</div>
        {request && <StatusView request={request} />}
      </div>
    )

    if (step === 'approve' && request) return <StepApprove request={request} onUpdated={handleDone} />
    if (step === 'complete' && request) return <StepComplete request={request} onUpdated={handleDone} />
    if ((step === 'view' || reqId) && request) return <StatusView request={request} />
    return <StepReport serial={serial} cylinder={cylinder} onSubmitted={handleDone} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#050a16 0%,#0c1628 50%,#050a16 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>

      {/* Logo bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <img src={gemmaLogo} alt="Gemma" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Gemma Knits</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CMMS · Repair Request</div>
        </div>
      </div>

      {/* Card */}
      <Card style={{ width: '100%', maxWidth: 480 }}>
        {renderStep()}
      </Card>

      <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        TextileOps CMMS · {new Date().getFullYear()}
      </div>
    </div>
  )
}
