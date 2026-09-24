import { useState, useEffect } from 'react'
import {
  Wrench,
  Layers,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  ChevronRight,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Package,
  Send,
  Loader,
  ArrowLeft,
  Check,
  Tag,
  Calendar,
  MessageSquare,
  Cpu,
} from 'lucide-react'
import {
  SpareNeedleRequestAPI,
  TechnicianAPI,
  NeedleSetAPI,
  NeedleHistoryAPI,
} from '../../api/entities'
import {
  notifySpareNeedleRequested,
  notifySpareNeedlePrepared,
  notifySpareNeedleReceived,
  loadTelegramSettingsDB,
} from '../../utils/telegram'
import {
  notifyLineSpareNeedleRequested,
  notifyLineSpareNeedlePrepared,
  notifyLineSpareNeedleReceived,
  loadLineSettingsDB,
} from '../../utils/line'

/* ── UI Helpers ──────────────────────────────────────────────────────────── */
function Card({ children, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: '#ffffff',
        borderRadius: 20,
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Btn({ type = 'button', onClick, disabled, loading, children, variant = 'primary', style }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
    },
    amber: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
    },
    outline: {
      background: '#ffffff',
      color: '#334155',
      border: '1.5px solid #cbd5e1',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 20px',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        ...styles[variant],
        ...style,
      }}
    >
      {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

/* ── 1. Action Choice Modal (แจ้งซ่อม vs เบิกเข็ม Spare) ───────────────────── */
export function ActionChoiceModal({ cylinder, serial, onSelectAction, onCancel }) {
  const mc = cylinder?.Machine || cylinder?.NewMC || '—'
  const gauge = cylinder?.Gauge || '—'
  const serialNo = serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Scanned Machine Info Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: 16,
          padding: '16px 18px',
          color: '#ffffff',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            เครื่องจักรที่สแกน
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {gauge}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {mc}
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>กระบอก Serial:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ffffff' }}>{serialNo}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          เลือกประเภทการทำรายการ
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          กรุณาเลือกเมนูที่ต้องการดำเนินการสำหรับเครื่องจักรนี้
        </p>
      </div>

      {/* 2 Big Action Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Card 1: แจ้งซ่อมเครื่องจักร */}
        <button
          type="button"
          onClick={() => onSelectAction('repair')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '18px 16px',
            borderRadius: 18,
            border: '2px solid #e2e8f0',
            background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wrench size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
              แจ้งซ่อมเครื่องจักร
            </div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
              แจ้งปัญหาเครื่องเสีย / ผ้าแตก / เข็มหัก ส่งแจ้งเตือนขออนุมัติซ่อม
            </div>
          </div>
          <ChevronRight size={20} style={{ color: '#94a3b8' }} />
        </button>

        {/* Card 2: เบิกเข็ม Spare ประจำเครื่อง */}
        <button
          type="button"
          onClick={() => onSelectAction('spare_needle')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '18px 16px',
            borderRadius: 18,
            border: '2px solid #818cf8',
            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            boxShadow: '0 6px 18px rgba(99,102,241,0.15)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4f46e5'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#818cf8'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(99,102,241,0.3)',
            }}
          >
            <Layers size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#312e81', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>เบิกเข็ม Spare ประจำเครื่อง</span>
              <span style={{ fontSize: 10, padding: '2px 6px', background: '#6366f1', color: '#fff', borderRadius: 4 }}>
                ใหม่
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#4338ca', lineHeight: 1.4 }}>
              เช็คลิสต์เบิกเข็ม Dial (Track 1-2) และ Cylinder (Track 1-4) ไปยังผู้จ่ายเข็ม
            </div>
          </div>
          <ChevronRight size={20} style={{ color: '#6366f1' }} />
        </button>
      </div>

      {onCancel && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
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
            <ArrowLeft size={14} /> กลับหน้าหลัก
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 2. Track Counter Item Component ─────────────────────────────────────── */
function TrackCounterItem({ label, checked, quantity, onToggle, onChangeQty }) {
  const PRESETS = [50, 100, 150, 200, 250, 300]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 14,
        background: checked ? '#f0fdf4' : '#f8fafc',
        border: checked ? '1.5px solid #86efac' : '1px solid #e2e8f0',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {checked ? (
            <CheckSquare size={20} style={{ color: '#16a34a' }} />
          ) : (
            <Square size={20} style={{ color: '#94a3b8' }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: checked ? '#166534' : '#334155' }}>
            {label}
          </span>
        </div>
        {checked && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#15803d',
              background: '#dcfce7',
              padding: '2px 10px',
              borderRadius: 6,
              border: '1px solid #bbf7d0',
            }}
          >
            {quantity} ตัว
          </span>
        )}
      </div>

      {checked && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px dashed #bbf7d0',
          }}
        >
          {/* Preset Buttons: 50, 100, 150, 200, 250, 300 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>
              เลือกจำนวน (ครั้งละ 50):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PRESETS.map((val) => {
                const isSelected = quantity === val
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeQty(val)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: isSelected ? '1px solid #16a34a' : '1px solid #cbd5e1',
                      background: isSelected ? '#16a34a' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stepper & Custom Input: -50 / +50 / +100 and direct input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              background: '#ffffff',
              padding: '6px 8px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => onChangeQty(Math.max(1, quantity - 50))}
                title="ลด 50 ตัว"
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                -50
              </button>
              <button
                type="button"
                onClick={() => onChangeQty(quantity + 50)}
                title="เพิ่ม 50 ตัว"
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #86efac',
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => onChangeQty(quantity + 100)}
                title="เพิ่ม 100 ตัว"
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #86efac',
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +100
              </button>
            </div>

            {/* Manual input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>กรอกเอง:</span>
              <input
                type="number"
                min="1"
                step="50"
                value={quantity}
                onChange={(e) => onChangeQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="ระบุ"
                style={{
                  width: 58,
                  height: 30,
                  textAlign: 'center',
                  borderRadius: 6,
                  border: '1px solid #86efac',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#15803d',
                  background: '#f0fdf4',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 3. StepSpareNeedleRequest (ช่างขอเบิกเข็ม Spare) ───────────────────────── */
export function StepSpareNeedleRequest({ cylinder, serial, onSubmitted, onBack }) {
  const mc = cylinder?.Machine || cylinder?.NewMC || '—'
  const gauge = cylinder?.Gauge || '—'
  const serialNo = serial || cylinder?.Serial_NOW || cylinder?.Serial_OLD || '—'

  const [techList, setTechList] = useState([])
  const [technician, setTechnician] = useState('')
  const [shift, setShift] = useState('กะเช้า')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Track selection state - defaults to 50
  const [dialTracks, setDialTracks] = useState({
    t1: { active: false, qty: 50 },
    t2: { active: false, qty: 50 },
  })

  const [cylTracks, setCylTracks] = useState({
    t1: { active: false, qty: 50 },
    t2: { active: false, qty: 50 },
    t3: { active: false, qty: 50 },
    t4: { active: false, qty: 50 },
  })


  const [keeperSummary, setKeeperSummary] = useState('')

  useEffect(() => {
    Promise.all([loadTelegramSettingsDB(), loadLineSettingsDB()])
      .then(([tg, line]) => {
        const tgKeepers = (tg?.needle_keepers || []).map((k) => k.name).filter(Boolean)
        const lineKeepers = (line?.needle_keepers || []).map((k) => k.name).filter(Boolean)
        const names = Array.from(new Set([...tgKeepers, ...lineKeepers]))
        if (names.length > 0) {
          setKeeperSummary(names.join(', '))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    TechnicianAPI.list().then((list) => {
      const active = (list || []).filter((t) => t.Active !== false && t.Active !== 'false')
      setTechList(active)
      if (active.length > 0 && !technician) {
        setTechnician(active[0].Name || active[0].name || '')
      }
    })
  }, [])

  const hasAnySelection =
    dialTracks.t1.active ||
    dialTracks.t2.active ||
    cylTracks.t1.active ||
    cylTracks.t2.active ||
    cylTracks.t3.active ||
    cylTracks.t4.active

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setErrorMsg('')

    if (!technician.trim()) {
      setErrorMsg('กรุณาเลือกชื่อช่างผู้ขอเบิก')
      return
    }

    if (!hasAnySelection) {
      setErrorMsg('กรุณาติ๊กเลือก Track เข็มที่ต้องการเบิกอย่างน้อย 1 รายการ')
      return
    }

    setSubmitting(true)
    try {
      const tracksPayload = {
        dial: {
          t1: dialTracks.t1.active ? dialTracks.t1.qty : 0,
          t2: dialTracks.t2.active ? dialTracks.t2.qty : 0,
        },
        cylinder: {
          t1: cylTracks.t1.active ? cylTracks.t1.qty : 0,
          t2: cylTracks.t2.active ? cylTracks.t2.qty : 0,
          t3: cylTracks.t3.active ? cylTracks.t3.qty : 0,
          t4: cylTracks.t4.active ? cylTracks.t4.qty : 0,
        },
      }

      const reqNo = `SNR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

      const newRequest = await SpareNeedleRequestAPI.create({
        id: reqNo,
        request_no: reqNo,
        machine_mc: mc,
        cylinder_serial: serialNo,
        gauge,
        technician_name: technician.trim(),
        shift,
        tracks_requested: tracksPayload,
        request_comment: comment.trim(),
        status: 'PENDING',
        created_at: new Date().toISOString(),
      })

      // Send Notifications in background
      notifySpareNeedleRequested(newRequest, cylinder).catch(console.warn)
      notifyLineSpareNeedleRequested(newRequest, cylinder).catch(console.warn)

      if (onSubmitted) onSubmitted(newRequest)
    } catch (err) {
      console.error('Submit spare needle error:', err)
      const msg = 'เกิดข้อผิดพลาดในการบันทึกคำขอ: ' + (err.message || err)
      setErrorMsg(msg)
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '20px 18px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> กลับ
        </button>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>
          ฟอร์มขอเบิกเข็ม Spare
        </span>
      </div>

      {/* Machine summary badge */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: 14,
          padding: '12px 16px',
          color: '#ffffff',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>เครื่องจักรประจำกระบอก</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8' }}>{mc}</div>
          <div style={{ fontSize: 11, color: '#cbd5e1' }}>Serial: {serialNo}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Gauge</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{gauge}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Technician & Shift */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              👷 ชื่อช่างผู้ขอเบิก *
            </label>
            <select
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              {techList.map((t) => {
                const name = t.Name || t.name
                return (
                  <option key={t.id || name} value={name}>
                    {name}
                  </option>
                )
              })}
              {!techList.some((t) => (t.Name || t.name) === technician) && technician && (
                <option value={technician}>{technician}</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              ⏰ กะการทำงาน
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="กะเช้า">กะเช้า (08:00 - 20:00)</option>
              <option value="กะดึก">กะดึก (20:00 - 08:00)</option>
              <option value="กะบ่าย">กะบ่าย</option>
            </select>
          </div>
        </div>

        {/* Section 1: Dial Tracks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            🔘 Dial (จานบน) — เลือก Track ที่ต้องการ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <TrackCounterItem
              label="Track 1"
              checked={dialTracks.t1.active}
              quantity={dialTracks.t1.qty}
              onToggle={() =>
                setDialTracks((prev) => ({
                  ...prev,
                  t1: { ...prev.t1, active: !prev.t1.active },
                }))
              }
              onChangeQty={(qty) =>
                setDialTracks((prev) => ({
                  ...prev,
                  t1: { ...prev.t1, qty },
                }))
              }
            />
            <TrackCounterItem
              label="Track 2"
              checked={dialTracks.t2.active}
              quantity={dialTracks.t2.qty}
              onToggle={() =>
                setDialTracks((prev) => ({
                  ...prev,
                  t2: { ...prev.t2, active: !prev.t2.active },
                }))
              }
              onChangeQty={(qty) =>
                setDialTracks((prev) => ({
                  ...prev,
                  t2: { ...prev.t2, qty },
                }))
              }
            />
          </div>
        </div>

        {/* Section 2: Cylinder Tracks */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
            ⚙️ Cylinder (กระบอกล่าง) — เลือก Track ที่ต้องการ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <TrackCounterItem
              label="Track 1"
              checked={cylTracks.t1.active}
              quantity={cylTracks.t1.qty}
              onToggle={() =>
                setCylTracks((prev) => ({
                  ...prev,
                  t1: { ...prev.t1, active: !prev.t1.active },
                }))
              }
              onChangeQty={(qty) =>
                setCylTracks((prev) => ({
                  ...prev,
                  t1: { ...prev.t1, qty },
                }))
              }
            />
            <TrackCounterItem
              label="Track 2"
              checked={cylTracks.t2.active}
              quantity={cylTracks.t2.qty}
              onToggle={() =>
                setCylTracks((prev) => ({
                  ...prev,
                  t2: { ...prev.t2, active: !prev.t2.active },
                }))
              }
              onChangeQty={(qty) =>
                setCylTracks((prev) => ({
                  ...prev,
                  t2: { ...prev.t2, qty },
                }))
              }
            />
            <TrackCounterItem
              label="Track 3"
              checked={cylTracks.t3.active}
              quantity={cylTracks.t3.qty}
              onToggle={() =>
                setCylTracks((prev) => ({
                  ...prev,
                  t3: { ...prev.t3, active: !prev.t3.active },
                }))
              }
              onChangeQty={(qty) =>
                setCylTracks((prev) => ({
                  ...prev,
                  t3: { ...prev.t3, qty },
                }))
              }
            />
            <TrackCounterItem
              label="Track 4"
              checked={cylTracks.t4.active}
              quantity={cylTracks.t4.qty}
              onToggle={() =>
                setCylTracks((prev) => ({
                  ...prev,
                  t4: { ...prev.t4, active: !prev.t4.active },
                }))
              }
              onChangeQty={(qty) =>
                setCylTracks((prev) => ({
                  ...prev,
                  t4: { ...prev.t4, qty },
                }))
              }
            />
          </div>
        </div>

        {/* Comment field */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            💬 หมายเหตุ / รายละเอียดเพิ่มเติม
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="เช่น เข็มหักจากลายริ้ว, เปลี่ยนยก Track, หรือข้อความถึงสโตร์..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Notification Recipient Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <Send size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span>
            ยิงแจ้งเตือนเด้งตรงไปยัง:{' '}
            <strong style={{ color: '#15803d' }}>
              {keeperSummary ? `คนคัดเข็ม (${keeperSummary})` : 'คนคัดเข็ม / ผู้ดูแลสต็อกเข็ม'}
            </strong>{' '}
            (LINE & Telegram)
          </span>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <Btn
          type="submit"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!hasAnySelection || submitting}
          variant="primary"
          style={{ width: '100%', padding: '14px', fontSize: 15 }}
        >
          <Send size={18} /> ส่งคำขอเบิกเข็ม Spare ไปยังผู้จ่ายเข็ม
        </Btn>
      </form>
    </div>
  )
}

/* ── 4. StepPrepareSpareNeedle (ผู้จ่ายเข็มจัดเตรียมและตัดสต็อก) ─────────────── */
export function StepPrepareSpareNeedle({ snr, cylinder, onPrepared, onClose }) {
  const [stockSets, setStockSets] = useState([])
  const [loadingSets, setLoadingSets] = useState(true)
  const [issuerName, setIssuerName] = useState('')
  const [issuerComment, setIssuerComment] = useState('')
  const [selectedSetId, setSelectedSetId] = useState('')
  const [issueQty, setIssueQty] = useState(10)
  const [issuedItems, setIssuedItems] = useState(snr.issued_items || [])
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    NeedleSetAPI.list().then((list) => {
      const available = (list || []).filter((s) => (parseInt(s.quantity, 10) || 0) > 0)
      setStockSets(available)
      setLoadingSets(false)

      // Try auto-selecting matching machine or gauge
      const match = available.find(
        (s) => s.machineId === (snr.machine_mc || cylinder?.Machine) || s.gauge === snr.gauge
      )
      if (match) {
        setSelectedSetId(match.id)
      } else if (available.length > 0) {
        setSelectedSetId(available[0].id)
      }
    })
  }, [snr.machine_mc, snr.gauge])

  const selectedSet = stockSets.find((s) => s.id === selectedSetId)

  const handleAddIssuedItem = () => {
    if (!selectedSet) return
    const qty = parseInt(issueQty, 10) || 0
    if (qty <= 0) {
      setErrorMsg('กรุณาระบุจำนวนที่ต้องการตัดจ่ายมากกว่า 0')
      return
    }
    if (qty > selectedSet.quantity) {
      setErrorMsg(`จำนวนคงเหลือในสต็อกไม่เพียงพอ (มี ${selectedSet.quantity} ตัว)`)
      return
    }

    setIssuedItems((prev) => [
      ...prev,
      {
        setId: selectedSet.id,
        needleModel: selectedSet.needleModel,
        gauge: selectedSet.gauge,
        grade: selectedSet.grade,
        quantity: qty,
      },
    ])
    setErrorMsg('')
  }

  const handleRemoveIssuedItem = (index) => {
    setIssuedItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirmPrepare = async () => {
    setErrorMsg('')
    if (issuedItems.length === 0) {
      setErrorMsg('กรุณาเลือกรายการเข็มที่จะตัดจ่ายออกจากสต็อกอย่างน้อย 1 รายการ')
      return
    }
    if (!issuerName.trim()) {
      setErrorMsg('กรุณาระบุชื่อผู้จ่ายเข็ม / สโตร์')
      return
    }

    setSubmitting(true)
    try {
      // 1. Deduct stock and log to history for each issued item
      for (const item of issuedItems) {
        const setRecord = stockSets.find((s) => s.id === item.setId)
        if (setRecord) {
          const currentBal = parseInt(setRecord.quantity, 10) || 0
          const deductQty = parseInt(item.quantity, 10) || 0
          const newBal = Math.max(0, currentBal - deductQty)

          // Update stock balance
          await NeedleSetAPI.update(item.setId, {
            ...setRecord,
            quantity: newBal,
            Quantity: newBal,
          })

          // Create history log
          await NeedleHistoryAPI.create({
            id: `LOG-SPARE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            setId: item.setId,
            actionType: 'ISSUE_SPARE',
            oldGrade: setRecord.grade,
            newGrade: setRecord.grade,
            conditionDetail: setRecord.conditionDetail,
            quantity: deductQty,
            dateAction: new Date().toISOString().slice(0, 10),
            technician: snr.technician_name,
            remarks: `เบิกเข็ม Spare สำหรับ ${snr.machine_mc} (${snr.request_no}) โดย ${issuerName}`,
            targetMachine: snr.machine_mc,
            qtyChange: `-${deductQty}`,
            balanceAfter: newBal,
            stockDetail: 'SPARE',
          })
        }
      }

      // 2. Update Spare Needle Request status to PREPARED
      const updated = await SpareNeedleRequestAPI.update(snr.id, {
        status: 'PREPARED',
        issued_items: issuedItems,
        issuer_name: issuerName.trim(),
        issuer_comment: issuerComment.trim(),
        prepared_at: new Date().toISOString(),
      })

      // 3. Send Telegram and LINE notifications to technician
      notifySpareNeedlePrepared(updated, cylinder).catch(console.warn)
      notifyLineSpareNeedlePrepared(updated, cylinder).catch(console.warn)

      if (onPrepared) onPrepared(updated)
    } catch (err) {
      console.error('Prepare spare needle error:', err)
      setErrorMsg('เกิดข้อผิดพลาดในการตัดสต็อก: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  const dial = snr.tracks_requested?.dial || {}
  const cyl = snr.tracks_requested?.cylinder || {}

  return (
    <div style={{ padding: '20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> ย้อนกลับ
          </button>
        )}
        <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>
          📦 ขั้นตอนผู้จ่ายเข็ม / ตัดสต็อก
        </span>
      </div>

      {/* Summary card of what technician requested */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b' }}>เลขที่ใบเบิก</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{snr.request_no}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>เครื่องจักร / Gauge</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>
              {snr.machine_mc} ({snr.gauge})
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>
          ช่างผู้ขอ: <b>{snr.technician_name}</b> ({snr.shift}) ·{' '}
          {new Date(snr.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
        </div>

        {/* Tracks summary badge list */}
        <div style={{ background: '#ffffff', borderRadius: 10, padding: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
            รายการ Track ที่ช่างต้องการ:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {dial.t1 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>Dial T1: {dial.t1} ตัว</span>}
            {dial.t2 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>Dial T2: {dial.t2} ตัว</span>}
            {cyl.t1 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>Cyl T1: {cyl.t1} ตัว</span>}
            {cyl.t2 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>Cyl T2: {cyl.t2} ตัว</span>}
            {cyl.t3 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>Cyl T3: {cyl.t3} ตัว</span>}
            {cyl.t4 > 0 && <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>Cyl T4: {cyl.t4} ตัว</span>}
          </div>
          {snr.request_comment && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', background: '#fffbeb', padding: '6px 8px', borderRadius: 6 }}>
              💬 หมายเหตุจากช่าง: {snr.request_comment}
            </div>
          )}
        </div>
      </div>

      {/* Stock Selection & Deduction Section */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Package size={18} style={{ color: '#2563eb' }} />
          เลือกชุดเข็มจากสต็อกเพื่อตัดจ่ายจริง
        </div>

        {loadingSets ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                เลือกชุดเข็มในสต็อก ({stockSets.length} รายการพร้อมจ่าย)
              </label>
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#ffffff',
                }}
              >
                {stockSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.setId}] {s.needleModel} ({s.gauge}) · {s.grade} · คงเหลือ {s.quantity} ตัว
                  </option>
                ))}
              </select>
            </div>

            {selectedSet && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                  padding: '8px 10px',
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  รุ่น: <b>{selectedSet.needleModel}</b> · เกรด: <b>{selectedSet.grade}</b>
                  <div style={{ color: '#64748b' }}>คงเหลือปัจจุบัน: <span style={{ color: '#16a34a', fontWeight: 800 }}>{selectedSet.quantity} ตัว</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="1"
                    max={selectedSet.quantity}
                    value={issueQty}
                    onChange={(e) => setIssueQty(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: 60,
                      padding: '6px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  />
                  <Btn onClick={handleAddIssuedItem} variant="primary" style={{ padding: '8px 12px', fontSize: 12 }}>
                    <Plus size={14} /> เพิ่มรายการ
                  </Btn>
                </div>
              </div>
            )}

            {/* List of items queued to deduct */}
            {issuedItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  รายการเข็มที่เตรียมจ่าย ({issuedItems.length} รายการ):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {issuedItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <b>{item.needleModel}</b> ({item.gauge}) · {item.grade}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#2563eb' }}>{item.quantity} ตัว</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIssuedItem(idx)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Issuer name & Comment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 18 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            👨‍💼 ชื่อผู้จ่ายเข็ม / เจ้าหน้าที่สโตร์ *
          </label>
          <input
            type="text"
            value={issuerName}
            onChange={(e) => setIssuerName(e.target.value)}
            placeholder="เช่น พี่ตุ๊ก, ช่างประจำสโตร์..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
            💬 หมายเหตุจากผู้จ่ายเข็ม (Comment)
          </label>
          <input
            type="text"
            value={issuerComment}
            onChange={(e) => setIssuerComment(e.target.value)}
            placeholder="เช่น เข็มเบอร์ตรง จัดเตรียมวางไว้ที่โต๊ะช่างสโตร์แล้ว..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      <Btn
        onClick={handleConfirmPrepare}
        loading={submitting}
        disabled={submitting || issuedItems.length === 0}
        variant="amber"
        style={{ width: '100%', padding: '14px', fontSize: 15 }}
      >
        <CheckCircle2 size={18} /> ยืนยันการจัดเตรียมเข็ม & ตัดสต็อก
      </Btn>
    </div>
  )
}

/* ── 5. StepAcknowledgeSpareNeedle (ช่างกดรับทราบ) ─────────────────────────── */
export function StepAcknowledgeSpareNeedle({ snr, cylinder, onAcknowledged, onHome }) {
  const [submitting, setSubmitting] = useState(false)
  const isCompleted = snr.status === 'COMPLETED'

  const handleAcknowledge = async () => {
    setSubmitting(true)
    try {
      const updated = await SpareNeedleRequestAPI.update(snr.id, {
        status: 'COMPLETED',
        acknowledged_at: new Date().toISOString(),
      })

      // Notify completion
      notifySpareNeedleReceived(updated, cylinder).catch(console.warn)
      notifyLineSpareNeedleReceived(updated, cylinder).catch(console.warn)

      if (onAcknowledged) onAcknowledged(updated)
    } catch (err) {
      console.error('Ack error:', err)
      alert('เกิดข้อผิดพลาดในการกดรับทราบ: ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }

  const dial = snr.tracks_requested?.dial || {}
  const cyl = snr.tracks_requested?.cylinder || {}

  return (
    <div style={{ padding: '24px 20px', textAlign: 'center' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: isCompleted ? '#dcfce7' : '#fef3c7',
          color: isCompleted ? '#16a34a' : '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        {isCompleted ? <CheckCircle2 size={36} /> : <Package size={36} />}
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
        {isCompleted ? 'รับเข็ม Spare เรียบร้อย (ปิดงานสมบูรณ์)' : 'เข็ม Spare จัดเตรียมพร้อมรับแล้ว'}
      </h3>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
        เลขที่ใบเบิก: <b style={{ color: '#0f172a' }}>{snr.request_no}</b> · เครื่องจักร: <b style={{ color: '#2563eb' }}>{snr.machine_mc}</b>
      </p>

      {/* Requisition Summary Card */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: '16px',
          border: '1px solid #e2e8f0',
          textAlign: 'left',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 10 }}>
          📦 รายการเข็มที่ตัดจ่ายและจัดเตรียม:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {(snr.issued_items || []).map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: 13,
              }}
            >
              <div>
                <b>{item.needleModel}</b> ({item.gauge}) · {item.grade}
              </div>
              <span style={{ fontWeight: 800, color: '#16a34a' }}>{item.quantity} ตัว</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
          <div>👨‍💼 ผู้จ่ายเข็ม: <b>{snr.issuer_name || 'สโตร์เข็ม'}</b></div>
          {snr.issuer_comment && <div>💬 ข้อความจากผู้จ่าย: <i>{snr.issuer_comment}</i></div>}
          {snr.prepared_at && (
            <div>⏰ เวลาจัดเตรียม: {new Date(snr.prepared_at).toLocaleString('th-TH')}</div>
          )}
          {snr.acknowledged_at && (
            <div style={{ color: '#16a34a', fontWeight: 700 }}>
              ✅ ช่างกดรับทราบเมื่อ: {new Date(snr.acknowledged_at).toLocaleString('th-TH')}
            </div>
          )}
        </div>
      </div>

      {!isCompleted ? (
        <Btn
          onClick={handleAcknowledge}
          loading={submitting}
          variant="success"
          style={{ width: '100%', padding: '16px', fontSize: 16 }}
        >
          <CheckCircle2 size={20} /> ✅ ได้รับเข็มเรียบร้อย (กดรับทราบ)
        </Btn>
      ) : (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn onClick={onHome} variant="primary" style={{ flex: 1 }}>
            🏠 กลับหน้าหลัก
          </Btn>
        </div>
      )}
    </div>
  )
}
