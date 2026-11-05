import { ChevronRight, Send } from 'lucide-react'
import { Btn } from './repairSteps.jsx'
import { toggleItemInText, isItemInText } from '../../utils/textToggle'

export function StepReportProblem({ problem, setProblem, urgency, setUrgency, error, saving, submit, COMMON_ISSUES, inputStyle }) {
  return (
    <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: '#f8fafc',
              padding: '16px',
              borderRadius: 18,
              border: '1.5px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️ รายละเอียดปัญหาและอาการเสีย</span>
            </div>

            {/* Priority Selection */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                🚨 ระดับความเร่งด่วน (Priority)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
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

            {/* Quick Problem Chips & Problem Details Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
                ⚠️ อาการเสีย / ปัญหาที่พบ (รายละเอียด) *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {COMMON_ISSUES.map((issue) => {
                  const isSelected = isItemInText(problem, issue)
                  return (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => setProblem((prev) => toggleItemInText(prev, issue))}
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? 800 : 700,
                        padding: '5px 10px',
                        borderRadius: 20,
                        background: isSelected ? '#10b981' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#334155',
                        border: isSelected ? '1.5px solid #059669' : '1px solid #cbd5e1',
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
                      <span>{issue}</span>
                    </button>
                  )
                })}
              </div>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={5}
                placeholder="อธิบายรายละเอียดอาการเสีย เช่น เข็มหัก 2 เล่ม, กระบอกหมุนติดขัด, ผ้าเป็นทาง..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
              />
            </div>

            {/* Telegram & LINE indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: 11,
                color: '#64748b',
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Send size={13} style={{ color: '#0ea5e9' }} /> Realtime เข้า Telegram & LINE
              </span>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                ● พร้อมส่ง
              </span>
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
        <Btn onClick={submit} loading={saving} variant="primary" style={{ marginTop: 4, padding: '14px 20px', fontSize: 16 }}>
          <ChevronRight size={18} /> ยืนยันส่งใบแจ้งซ่อม
        </Btn>
    </>
  )
}
