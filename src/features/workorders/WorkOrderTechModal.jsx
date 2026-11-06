import Modal from '../../components/ui/Modal'
import { Check } from 'lucide-react'

// Tech add/edit modal moved verbatim from WorkOrders (props only).
const UI_SKILL_LEVELS = [
  { value: 'Junior', label: 'Junior', desc: 'ช่างฝึกหัด / ผู้ช่วยช่าง', icon: '🔰' },
  { value: 'Technician', label: 'Technician', desc: 'ช่างชำนาญงานทั่วไป', icon: '🎖️' },
  { value: 'Senior', label: 'Senior', desc: 'ช่างอาวุโส / ปรับแต่งชำนาญ', icon: '🥈' },
  { value: 'Master', label: 'Master', desc: 'หัวหน้าช่าง / ผู้เชี่ยวชาญพิเศษ', icon: '🥇' },
]

const UI_SPECIALIZATIONS = [
  { value: 'เตรียมเครื่อง', label: 'เตรียมเครื่อง', icon: '🛠️' },
  { value: 'ปรับเครื่อง', label: 'ปรับเครื่อง', icon: '⚄' },
  { value: 'แก้ปัญหาเครื่อง', label: 'แก้ปัญหาเครื่อง', icon: '🔧' },
  { value: 'ตั้งศูนย์เครื่อง', label: 'ตั้งศูนย์เครื่อง', icon: '📐' },
]

export function WorkOrderTechModal({ techModalOpen, setTechModalOpen, editingTechId, techForm, setTechForm, selectedUserId, systemUsers, technicians, handleSaveTech, handleSelectUserForTech }) {
  return (
    <>
      {techModalOpen && (
        <Modal
          open={techModalOpen}
          onClose={() => setTechModalOpen(false)}
          title={editingTechId ? 'แก้ไขข้อมูลช่าง' : 'เพิ่มข้อมูลช่าง'}
        >
          <div className="space-y-4 text-xs pb-1">
            {/* User Quick-Select from System Users (LINE Login) */}
            {systemUsers.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-slate-50 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900/60 border border-emerald-500/25 dark:border-emerald-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="label font-bold flex items-center gap-1.5 mb-0 text-slate-800 dark:text-slate-200">
                    <span className="text-emerald-500 font-bold">🟢</span>
                    <span>เลือกจากรายชื่อผู้ใช้งาน (ดึงชื่อ & LINE User ID อัตโนมัติ)</span>
                  </label>
                  {techForm.Line_ID && (
                    <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      ✓ ผูก LINE ID แล้ว
                    </span>
                  )}
                </div>

                <select
                  value={selectedUserId}
                  onChange={(e) => handleSelectUserForTech(e.target.value)}
                  className="select text-xs font-medium"
                >
                  <option value="">-- พิมพ์เอง หรือเลือกผู้ใช้เพื่อเติมข้อมูลอัตโนมัติ --</option>
                  {systemUsers.map((u) => {
                    const hasLine = Boolean(u.line_user_id)
                    const isRegistered = technicians.some(
                      (t) =>
                        (t.id !== editingTechId && t.Technician_ID !== editingTechId) &&
                        ((t.Line_ID && t.Line_ID === u.line_user_id) ||
                         (t.Name && t.Name.toLowerCase() === (u.full_name || u.line_display_name || '').toLowerCase()))
                    )
                    const label = `${u.full_name || u.line_display_name || u.username} (${u.role || 'user'})${hasLine ? ' [🟢 LINE]' : ''}${isRegistered ? ' (มีในทะเบียนช่างแล้ว)' : ''}`
                    return (
                      <option key={u.id || u.username} value={u.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[10px] text-slate-400">
                  เมื่อเลือกผู้ใช้ ระบบจะดึงชื่อและ LINE User ID มากรอกให้อัตโนมัติทันที
                </p>
              </div>
            )}

            {/* 1. Name */}
            <div>
              <label className="label font-bold">ชื่อช่าง *</label>
              <input
                type="text"
                placeholder="เช่น ช.หนุ่ม"
                value={techForm.Name}
                onChange={(e) => setTechForm({ ...techForm, Name: e.target.value })}
                className="input"
                required
              />
            </div>

            {/* 2. Phone */}
            <div>
              <label className="label font-bold">เบอร์ติดต่อ</label>
              <input
                type="text"
                placeholder="เช่น 081-234-5678"
                value={techForm.Phone}
                onChange={(e) => setTechForm({ ...techForm, Phone: e.target.value })}
                className="input font-mono"
              />
            </div>

            {/* 3. Skill Level (2x2 Grid) */}
            <div className="space-y-2">
              <label className="label font-bold flex items-center gap-1.5">
                <span className="text-blue-500">🎗️</span>
                <span>ระดับทักษะช่าง (Skill Level) *</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {UI_SKILL_LEVELS.map((s) => {
                  const isSelected = (techForm.SkillLevel || 'Junior').toLowerCase() === s.value.toLowerCase()
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTechForm({ ...techForm, SkillLevel: s.value })}
                      className={`p-3 rounded-2xl text-left transition-all border ${
                        isSelected
                          ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span>{s.icon}</span>
                        <span className={isSelected ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''}>{s.label}</span>
                      </div>
                      <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 pl-5">
                        {s.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Specialization (2x2 Grid Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label font-bold flex items-center gap-1.5 mb-0">
                  <span className="text-blue-500">🔧</span>
                  <span>ความถนัดเฉพาะทาง (Specialization)</span>
                </label>
                <span className="text-[10px] text-slate-400">คลิกเลือกได้มากกว่า 1 ทักษะ</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {UI_SPECIALIZATIONS.map((spec) => {
                  const selectedSpecs = (techForm.Specialization || '')
                    .split(',')
                    .map((str) => str.trim())
                    .filter(Boolean)
                  const isSelected = selectedSpecs.some(
                    (sel) => sel.toLowerCase().includes(spec.value.toLowerCase()) || spec.value.toLowerCase().includes(sel.toLowerCase())
                  )
                  return (
                    <button
                      key={spec.value}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? selectedSpecs.filter(
                              (sel) => !sel.toLowerCase().includes(spec.value.toLowerCase()) && !spec.value.toLowerCase().includes(sel.toLowerCase())
                            )
                          : [...selectedSpecs, spec.value]
                        setTechForm({ ...techForm, Specialization: next.join(', ') })
                      }}
                      className={`py-2.5 px-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all border ${
                        isSelected
                          ? 'border-2 border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{spec.icon}</span>
                      <span>{spec.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Notification Identifiers (LINE & Telegram) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🔔 การแจ้งเตือนใบสั่งงานซ่อม (Direct Notifications)</span>
              </div>
              
              {/* LINE User ID */}
              <div>
                <label className="label font-bold flex items-center gap-1.5 mb-1">
                  <span className="text-emerald-500 font-bold">🟢</span>
                  <span>LINE User ID (id:line)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น U66f2b207af94e739c10a3cf937af2965"
                  value={techForm.Line_ID || ''}
                  onChange={(e) => setTechForm({ ...techForm, Line_ID: e.target.value })}
                  className="input font-mono text-xs"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  ระบบจะยิงใบสั่งงานซ่อมตรงเข้า LINE ช่างคนนี้ทันทีเมื่อหัวหน้ากดมอบหมาย
                </p>
              </div>

              {/* Telegram Chat ID */}
              <div>
                <label className="label font-bold flex items-center gap-1.5 mb-1">
                  <span className="text-sky-500 font-bold">✈️</span>
                  <span>Telegram Chat ID (id:telegram)</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 8207474130"
                  value={techForm.Telegram_ID || ''}
                  onChange={(e) => setTechForm({ ...techForm, Telegram_ID: e.target.value })}
                  className="input font-mono text-xs"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  ระบบจะยิงใบสั่งงานซ่อมตรงเข้า Telegram ช่างคนนี้ทันทีเมื่อหัวหน้ากดมอบหมาย
                </p>
              </div>
            </div>

            {/* 6. Status */}
            <div>
              <label className="label font-bold">สถานะ</label>
              <select
                value={techForm.Status || 'ACTIVE'}
                onChange={(e) => setTechForm({ ...techForm, Status: e.target.value })}
                className="select font-semibold"
              >
                <option value="ACTIVE">ใช้งานปกติ (Active)</option>
                <option value="INACTIVE">พักงาน/ลาออก (Inactive)</option>
              </select>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTechModalOpen(false)}
                className="btn-outline px-4"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveTech}
                className="btn-primary px-5"
              >
                <Check size={14} />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
