import Modal from '../../components/ui/Modal'
import { AlertCircle, Check, CheckCircle, Eye, EyeOff, Lock, RefreshCw, Shield, ShieldAlert } from 'lucide-react'

export function AdminSecurityModal({ adminModalOpen, setAdminModalOpen, adminSubmitting, adminModalMode, adminFormName, setAdminFormName, adminFormChatId, setAdminFormChatId, adminAuthPwd, setAdminAuthPwd, adminAuthError, setAdminAuthError, adminStep, setAdminStep, showAdminPwd, setShowAdminPwd, handleVerifyAdminPassword, handleConfirmAdminAction, user }) {
  return (
    <>
      {adminModalOpen && (
        <Modal open={adminModalOpen} onClose={() => !adminSubmitting && setAdminModalOpen(false)}>
          <Modal.Header
            title={
              adminModalMode === 'add'
                ? '🛡️ เพิ่มผู้ดูแลระบบ (Admin)'
                : adminModalMode === 'edit'
                ? '✏️ แก้ไขข้อมูลผู้ดูแลระบบ (Admin)'
                : '🗑️ ลบผู้ดูแลระบบ (Admin)'
            }
          />
          <Modal.Body className="space-y-4">
            {adminStep === 1 ? (
              <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Lock size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">ขั้นตอนที่ 1/2: การยืนยันสิทธิ์ความปลอดภัย</span>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      การจัดการรายชื่อผู้ดูแลระบบเป็นสิทธิ์ระดับสูง กรุณากรอกรหัสผ่านของคุณ ({user?.username || 'ผู้ใช้'}) เพื่อดำเนินการ
                    </p>
                  </div>
                </div>

                {adminModalMode !== 'delete' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs font-semibold">ชื่อผู้ดูแลระบบ / แอดมิน *</label>
                      <input
                        type="text"
                        className="input text-sm w-full"
                        value={adminFormName}
                        onChange={(e) => setAdminFormName(e.target.value)}
                        placeholder="เช่น กฤษดา (Admin)"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs font-semibold">Telegram Chat ID *</label>
                      <input
                        type="text"
                        className="input font-mono text-xs w-full"
                        value={adminFormChatId}
                        onChange={(e) => setAdminFormChatId(e.target.value)}
                        placeholder="เช่น 6981653027 หรือ -100..."
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        ตัวเลข Chat ID ส่วนตัว หรือ Group ID ที่ติดลบ (-100...)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <span className="font-semibold text-rose-700 dark:text-rose-400">
                      คุณกำลังจะลบแอดมิน:
                    </span>
                    <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                      {adminFormName} (Chat ID: {adminFormChatId})
                    </div>
                  </div>
                )}

                <div>
                  <label className="label text-xs font-semibold">รหัสผ่านของคุณ ({user?.username}) *</label>
                  <div className="relative">
                    <input
                      type={showAdminPwd ? 'text' : 'password'}
                      className="input text-sm w-full pr-9"
                      value={adminAuthPwd}
                      onChange={(e) => {
                        setAdminAuthPwd(e.target.value)
                        setAdminAuthError('')
                      }}
                      placeholder="กรอกรหัสผ่านเพื่อยืนยัน"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPwd(!showAdminPwd)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {adminAuthError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-1.5"
                    onClick={() => setAdminModalOpen(false)}
                    disabled={adminSubmitting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                    <span>ถัดไป: ตรวจสอบและยืนยันรอบที่ 2 →</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Final Double Confirmation */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <ShieldAlert size={20} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    ⚠️ ยืนยันการดำเนินการรอบที่ 2 (ขั้นตอนสุดท้าย)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    โปรดตรวจสอบความถูกต้อง ข้อมูลนี้จะมีผลต่อการรับแจ้งเตือนข้อผิดพลาดระบบ (Crash Alerts) ทันที
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">การดำเนินการ:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {adminModalMode === 'add' ? 'เพิ่มผู้ดูแลระบบ' : adminModalMode === 'edit' ? 'แก้ไขผู้ดูแลระบบ' : 'ลบผู้ดูแลระบบ'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ชื่อแอดมิน:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{adminFormName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telegram Chat ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{adminFormChatId}</span>
                  </div>
                </div>

                {adminAuthError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {adminAuthError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-1.5"
                    onClick={() => setAdminStep(1)}
                    disabled={adminSubmitting}
                  >
                    ← ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    className={adminModalMode === 'delete' ? 'btn-danger text-xs px-4 py-1.5' : 'btn-primary text-xs px-4 py-1.5'}
                    onClick={handleConfirmAdminAction}
                    disabled={adminSubmitting}
                  >
                    {adminSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    <span>ยืนยันและบันทึกข้อมูล ✓</span>
                  </button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      )}
    </>
  )
}
