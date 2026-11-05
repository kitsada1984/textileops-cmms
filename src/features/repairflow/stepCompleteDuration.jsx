import { Clock } from 'lucide-react'
import { QUICK_INTERRUPTION_PRESETS } from '../../pages/WorkOrders'
import { formatMinutesToThai } from '../../api/entities'

// Duration summary + interruption form moved verbatim from StepComplete (props only).
export function StepCompleteDuration({ durationRes, showIntSection, setShowIntSection, intTaskName, setIntTaskName, intMins, setIntMins, interruptionLogs, handleAddInterruption, handleRemoveInterruption, inputStyle }) {
  return (
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
  )
}
