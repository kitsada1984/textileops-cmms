import { Check, RefreshCw } from 'lucide-react'

export function CenterCheckFormTail({ formData, setFormData, editingId, saving, setActiveSubTab }) {
  return (
    <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="space-y-2">
                <label className="label font-bold text-slate-700 dark:text-slate-300">
                  ✍️ ช่างผู้ตั้งศูนย์ (Mechanic)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อผู้ลงนามช่าง"
                    value={formData.sign_name}
                    onChange={(e) => setFormData({ ...formData, sign_name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="date"
                    value={formData.sign_date}
                    onChange={(e) => setFormData({ ...formData, sign_date: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label font-bold text-slate-700 dark:text-slate-300">
                  👑 หัวหน้างาน / ผู้ตรวจสอบ (Supervisor)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ชื่อหัวหน้างาน"
                    value={formData.sup_name}
                    onChange={(e) => setFormData({ ...formData, sup_name: e.target.value })}
                    className="input"
                  />
                  <input
                    type="date"
                    value={formData.sup_date}
                    onChange={(e) => setFormData({ ...formData, sup_date: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className="btn-outline px-4"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-6"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{editingId ? 'บันทึกการแก้ไข' : 'บันทึกใบบันทึกเช็คศูนย์'}</span>
                  </>
                )}
              </button>
            </div>
    </>
  )
}
