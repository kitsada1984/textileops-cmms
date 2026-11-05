import { X } from 'lucide-react'

export function CenterCheckFormHead({ formType, editingId, setActiveSubTab, formData }) {
  return (
    <>
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide text-white ${
                    formType === 'Double' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {formType} Jersey
                  </span>
                  <h2 className="text-base font-extrabold" style={{ color: 'var(--text-900)' }}>
                    {editingId ? 'แก้ไขใบบันทึกการตั้งศูนย์' : 'แบบบันทึกการตั้งศูนย์เครื่องถักกลม'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  กรอกข้อมูลเครื่องจักร ค่าการตรวจ 10 รายการ และลายมือชื่อช่างผู้ตรวจ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">เลขที่เอกสาร</div>
                  <div className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                    {formData.doc_no}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('history')}
                  className="btn-outline text-xs px-3"
                >
                  <X size={14} />
                  <span>ยกเลิก</span>
                </button>
              </div>
            </div>
    </>
  )
}
