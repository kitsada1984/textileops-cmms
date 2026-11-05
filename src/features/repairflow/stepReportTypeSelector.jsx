import { UserCheck } from 'lucide-react'

export function StepReportTypeSelector({ repairType, setRepairType, techList, assignedTech, setAssignedTech, inputStyle }) {
  return (
        <div
          style={{
            background: repairType === 'EASY' ? '#f0fdf4' : '#eff6ff',
            border: repairType === 'EASY' ? '2px solid #10b981' : '2px solid #3b82f6',
            borderRadius: 18,
            padding: '16px',
            boxShadow: repairType === 'EASY' ? '0 4px 16px rgba(16,185,129,0.12)' : '0 4px 16px rgba(59,130,246,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            transition: 'all 200ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: repairType === 'EASY' ? '#065f46' : '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚙️ ขั้นตอนการแจ้งซ่อม (Repair Workflow) *</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 20,
                background: repairType === 'EASY' ? '#dcfce7' : '#dbeafe',
                color: repairType === 'EASY' ? '#15803d' : '#1d4ed8',
              }}
            >
              {repairType === 'EASY' ? '⚡ ไม่ต้องรออนุมัติ (Auto-Approve)' : '🛡️ ต้องรอหัวหน้าอนุมัติ'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
            {/* Option 1: งานทั่วไป / งานง่าย */}
            <div
              onClick={() => setRepairType('EASY')}
              style={{
                cursor: 'pointer',
                padding: '14px 16px',
                borderRadius: 14,
                border: repairType === 'EASY' ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                background: '#ffffff',
                boxShadow: repairType === 'EASY' ? '0 4px 12px rgba(16,185,129,0.15)' : 'none',
                transition: 'all 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: repairType === 'EASY' ? '#065f46' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚡ งานทั่วไป / งานง่าย (เลือกช่างตรง)</span>
                </span>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: repairType === 'EASY' ? '6px solid #10b981' : '2px solid #94a3b8',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: repairType === 'EASY' ? '#047857' : '#64748b', lineHeight: 1.4, fontWeight: 600 }}>
                ผู้แจ้งระบุช่างได้ทันที ระบบอนุมัติอัตโนมัติ ช่างเริ่มงานได้เลยโดยไม่ต้องรอหัวหน้าช่างอนุมัติ
              </div>
            </div>

            {/* Option 2: งานยาก / ซ่อมใหญ่ */}
            <div
              onClick={() => setRepairType('COMPLEX')}
              style={{
                cursor: 'pointer',
                padding: '14px 16px',
                borderRadius: 14,
                border: repairType === 'COMPLEX' ? '2px solid #3b82f6' : '1.5px solid #cbd5e1',
                background: '#ffffff',
                boxShadow: repairType === 'COMPLEX' ? '0 4px 12px rgba(59,130,246,0.15)' : 'none',
                transition: 'all 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: repairType === 'COMPLEX' ? '#1e40af' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🛡️ งานยาก / งานซ่อมใหญ่ (รออนุมัติ)</span>
                </span>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: repairType === 'COMPLEX' ? '6px solid #3b82f6' : '2px solid #94a3b8',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: repairType === 'COMPLEX' ? '#1d4ed8' : '#64748b', lineHeight: 1.4, fontWeight: 600 }}>
                ส่งเข้าสู่การพิจารณาของหัวหน้าช่าง เพื่อวางแผน สั่งการ และมอบหมายช่างผู้รับผิดชอบ
              </div>
            </div>
          </div>

          {/* Technician selector dropdown when EASY */}
          {repairType === 'EASY' && (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #86efac',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 2,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: '#065f46' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserCheck size={16} style={{ color: '#059669' }} /> 👨‍🔧 เลือกช่างผู้รับผิดชอบงานนี้ (Technician) *
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: '#bbf7d0', color: '#14532d', padding: '2px 8px', borderRadius: 20 }}>
                  จำเป็น
                </span>
              </label>
              <select
                value={techList.some((t) => t.name === assignedTech) ? assignedTech : assignedTech ? '__custom__' : ''}
                onChange={(e) => setAssignedTech(e.target.value === '__custom__' ? '' : e.target.value)}
                style={{ ...inputStyle, border: '1.5px solid #10b981', background: '#f8fafc', fontWeight: 700 }}
              >
                <option value="">— กรุณาเลือกช่างผู้รับผิดชอบ —</option>
                {techList.map((t, i) => (
                  <option key={i} value={t.name}>
                    {t.name}
                  </option>
                ))}
                <option value="__custom__">➕ พิมพ์ระบุชื่อเอง</option>
              </select>
              {!techList.some((t) => t.name === assignedTech) && (
                <input
                  value={assignedTech}
                  onChange={(e) => setAssignedTech(e.target.value)}
                  placeholder="พิมพ์ชื่อช่างผู้รับผิดชอบ..."
                  style={{ ...inputStyle, marginTop: 4, border: '1.5px solid #10b981' }}
                />
              )}
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>💡 ระบบจะยิงแจ้งเตือนใบสั่งงานเข้า Telegram & LINE ของช่างท่านนี้ทันที</span>
              </div>
            </div>
          )}
        </div>
  )
}
