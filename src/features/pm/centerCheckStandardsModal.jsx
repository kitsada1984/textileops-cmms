import Modal from '../../components/ui/Modal'
import { Plus, Trash2, Check, RefreshCw } from 'lucide-react'

export function CenterCheckStandardsModal({ standardsModalOpen, setStandardsModalOpen, standardsDraft, setStandardsDraft, standardsTab, setStandardsTab, savingStandards, handleSaveStandards, handleResetStandards, handleAddDraftItem, handleDraftItemChange, handleRemoveDraftItem }) {
  return (
    <>
      {standardsModalOpen && (
        <Modal
          open={standardsModalOpen}
          onClose={() => setStandardsModalOpen(false)}
          title="⚙️ ตั้งค่ามาตรฐานการตรวจเช็คศูนย์ (Center Check Standards)"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleResetStandards}
                disabled={savingStandards}
                className="btn-outline text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="ล้างค่าที่กำหนดเองและใช้ค่ามาตรฐานเริ่มต้นจากโรงงาน"
              >
                คืนค่าเริ่มต้นโรงงาน
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStandardsModalOpen(false)}
                  disabled={savingStandards}
                  className="btn-outline text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveStandards}
                  disabled={savingStandards}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {savingStandards ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>บันทึกค่ามาตรฐาน</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStandardsTab('Double')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    standardsTab === 'Double'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Double Jersey ({(standardsDraft.Double || []).length} ข้อ)
                </button>
                <button
                  type="button"
                  onClick={() => setStandardsTab('Single')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    standardsTab === 'Single'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Single Jersey ({(standardsDraft.Single || []).length} ข้อ)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddDraftItem(standardsTab)}
                className="btn-outline text-xs px-2.5 py-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <Plus size={13} />
                <span>เพิ่มรายการตรวจ</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 leading-relaxed">
              💡 <b>คำแนะนำ:</b> ค่ามาตรฐานนี้จะถูกบันทึกลงระบบคลาวด์ Supabase และแคชไว้ในบราวเซอร์ เพื่อนำไปใช้เป็นค่ามาตรฐานตั้งต้นเมื่อเปิดเอกสารตรวจเช็คศูนย์ใบใหม่ทุกครั้ง
            </div>

            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="table w-full text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                  <tr className="text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3 text-center w-12">ข้อ</th>
                    <th className="py-2.5 px-3 text-left">รายการตรวจ</th>
                    <th className="py-2.5 px-3 text-center w-36">ค่ามาตรฐาน</th>
                    <th className="py-2.5 px-3 text-center w-16">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(standardsDraft[standardsTab] || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={item.item || ''}
                          placeholder="ชื่อรายการตรวจสอบ"
                          onChange={(e) => handleDraftItemChange(standardsTab, idx, 'item', e.target.value)}
                          className="input text-xs py-1 w-full"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={item.std ?? ''}
                          placeholder="ค่ามาตรฐาน (เช่น 0.03)"
                          onChange={(e) => handleDraftItemChange(standardsTab, idx, 'std', e.target.value)}
                          className="input text-center font-mono text-xs py-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 w-full"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(standardsTab, idx)}
                          disabled={(standardsDraft[standardsTab] || []).length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="ลบรายการนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
