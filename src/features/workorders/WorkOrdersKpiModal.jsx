import { Check } from 'lucide-react'
import Modal from '../../components/ui/Modal'

// Quick KPI-settings modal moved verbatim from WorkOrders (props only).
export function WorkOrdersKpiModal({ kpiModalOpen, draftKpi, setDraftKpi, setKpiModalOpen, handleSaveKpiSettings }) {
  return (
    <>
      {kpiModalOpen && (
        <Modal
          open={kpiModalOpen}
          onClose={() => setKpiModalOpen(false)}
          title="ปรับแต่งเป้าหมาย KPI SLA แต่ละประเภทงาน"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed">
              💡 กำหนดจำนวนวันเป้าหมาย (SLA Target Days) โดยคิดฐานเวลาทำงาน 12 ชม./วัน (จันทร์-เสาร์ 08:00 - 20:00 น. ไม่นับวันอาทิตย์และเวลานอนข้ามคืน) ระบบจะนำไปคำนวณเป้าชั่วโมงและอัตราความสำเร็จบนแดชบอร์ดทันที
            </div>

            <div>
              <label className="label">🛠️ งานแก้ไข (Repair) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.REPAIR}
                  onChange={(e) => setDraftKpi({ ...draftKpi, REPAIR: parseFloat(e.target.value) || 1.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div>
              <label className="label">🎨 งานปรับแบบ (Design) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.DESIGN}
                  onChange={(e) => setDraftKpi({ ...draftKpi, DESIGN: parseFloat(e.target.value) || 3.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div>
              <label className="label">🧹 งาน PM / ล้างเครื่อง (PM) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.PM}
                  onChange={(e) => setDraftKpi({ ...draftKpi, PM: parseFloat(e.target.value) || 2.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div>
              <label className="label">⚙️ งานเตรียมเครื่อง (Setup) (เป้าหมายวัน)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draftKpi.SETUP ?? 1.0}
                  onChange={(e) => setDraftKpi({ ...draftKpi, SETUP: parseFloat(e.target.value) || 1.0 })}
                  className="input font-mono font-bold"
                />
                <span className="font-bold" style={{ color: 'var(--text-500)' }}>วัน</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setKpiModalOpen(false)}
                className="btn-outline"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveKpiSettings}
                className="btn-primary"
              >
                <Check size={14} />
                <span>บันทึกเป้าหมาย</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
