import Modal from '../ui/Modal'
import { Check } from 'lucide-react'
import { THAI_MONTHS } from './monthlyPlanGenerate'

// Add/edit modal moved verbatim from PMMonthlyScheduleView (props only).
export function MonthlyAddEditModal({ addEditModalOpen, setAddEditModalOpen, editItemForm, setEditItemForm, selectedMonth, selectedYear, effectiveMachines, handleSelectMachinePreset, handleSaveItem }) {
  return (
      <Modal
        open={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        title={editItemForm.id ? `แก้ไขแผน: ${editItemForm.mc}` : `เพิ่มเครื่องจักรในแผน (${THAI_MONTHS[selectedMonth - 1]} ${selectedYear})`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddEditModalOpen(false)}
              className="btn-outline text-xs px-3 py-1.5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Check size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">รหัสเครื่องจักร (MC) *</label>
              <input
                type="text"
                list="active-machines-datalist"
                placeholder="เช่น MC-01"
                value={editItemForm.mc}
                onChange={(e) => handleSelectMachinePreset(e.target.value)}
                className="input font-bold font-mono text-xs uppercase"
                required
              />
              <datalist id="active-machines-datalist">
                {effectiveMachines.map((m, i) => (
                  <option key={i} value={m.NewMC || m.mc || m.Machine_MC}>
                    {m.NewMC || m.mc || m.Machine_MC} {m.location ? `(${m.location})` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">รหัสงาน (KI) / ซีเรียล</label>
              <input
                type="text"
                placeholder="เช่น KI-9012"
                value={editItemForm.ki}
                onChange={(e) => setEditItemForm({ ...editItemForm, ki: e.target.value.toUpperCase() })}
                className="input font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">สถานที่ (Location)</label>
              <input
                type="text"
                placeholder="เช่น GMK1"
                value={editItemForm.location}
                onChange={(e) => setEditItemForm({ ...editItemForm, location: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">ประเภทเครื่อง</label>
              <input
                type="text"
                placeholder="Single / Double"
                value={editItemForm.type}
                onChange={(e) => setEditItemForm({ ...editItemForm, type: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">วันเริ่มตามแผน (Start Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedStartDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedStartDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
            <div>
              <label className="label">วันเสร็จตามแผน (End Date) *</label>
              <input
                type="date"
                value={editItemForm.plannedEndDate}
                onChange={(e) => setEditItemForm({ ...editItemForm, plannedEndDate: e.target.value })}
                className="input font-mono text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">ช่างผู้รับผิดชอบ</label>
            <input
              type="text"
              placeholder="ระบุชื่อช่าง..."
              value={editItemForm.assignedTech}
              onChange={(e) => setEditItemForm({ ...editItemForm, assignedTech: e.target.value })}
              className="input text-xs font-semibold"
            />
          </div>
        </form>
      </Modal>
  )
}
