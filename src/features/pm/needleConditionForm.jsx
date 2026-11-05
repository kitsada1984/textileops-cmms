import Modal from '../../components/ui/Modal'
import { Camera, Check, Image as ImageIcon, QrCode, RefreshCw, Sparkles, Upload } from 'lucide-react'
import { FormPhotoCard } from './needleConditionParts.jsx'
import { NEEDLE_STATUSES } from '../../api/entities'
import { normalizeCylinderType } from '../../utils/needleConditionSync'
import { computeCounterDiff } from '../../utils/counterDiff'

export function NeedleConditionForm({ formModalOpen, setFormModalOpen, formData, setFormData, saving, uploadingImage, cylinders, machines, cylinderTypeOptions, handleSubmitForm, handlePhotoUpload, removePhoto, openQrScanner, populateFromSerial, populateFromMachine, setPreviewImageModal, t }) {
  return (
      <Modal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={formData.id ? 'แก้ไขข้อมูลสภาพเข็ม' : 'บันทึกสภาพเข็ม (Needle Inspection)'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              className="btn-outline px-4"
              onClick={() => setFormModalOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn-primary px-5"
              onClick={handleSubmitForm}
              disabled={saving || uploadingImage}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{formData.id ? 'บันทึกการแก้ไข' : 'ยืนยันบันทึกข้อมูลล่าสุด'}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          {/* Quick Select Autocomplete / Scan Hint */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-blue-600 flex-shrink-0" />
              <span>พิมพ์หรือเลือกซีเรียลเดิม/เครื่องเพื่อดึงข้อมูลกระบอกอัตโนมัติ</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormModalOpen(false)
                openQrScanner()
              }}
              className="btn-outline text-[11px] py-1 px-2 flex items-center gap-1 font-bold flex-shrink-0"
            >
              <QrCode size={12} />
              <span>สแกน QR ใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Serial */}
            <div className="sm:col-span-2">
              <label className="label font-bold">ซีเรียลกระบอก (Serial) *</label>
              <input
                type="text"
                list="needle-serial-datalist"
                value={formData.serial}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({ ...prev, serial: val }))
                  populateFromSerial(val, { silent: true })
                }}
                placeholder="เช่น SN-2024-001 หรือเลือกจากลิสต์"
                className="input font-mono font-bold text-blue-600 dark:text-blue-400"
                required
              />
              <datalist id="needle-serial-datalist">
                {cylinders.map((cyl, i) => (
                  <option
                    key={i}
                    value={cyl.Serial_OLD || cyl.Serial_NOW}
                    label={`${cyl.NewMC || cyl.Standard || ''} (${normalizeCylinderType(cyl.Type)})`}
                  />
                ))}
              </datalist>
            </div>

            {/* Machine MC */}
            <div>
              <label className="label font-bold">เครื่องจักร (MC)</label>
              <input
                type="text"
                list="needle-machine-datalist"
                value={formData.machine_mc}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({ ...prev, machine_mc: val }))
                  populateFromMachine(val)
                }}
                placeholder="เช่น MC-01"
                className="input font-bold"
              />
              <datalist id="needle-machine-datalist">
                {machines.map((m, i) => (
                  <option key={i} value={m.Mc || m.Machine_MC || m.name} />
                ))}
              </datalist>
            </div>

            {/* Location */}
            <div>
              <label className="label font-bold">ตำแหน่ง (Location)</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="เช่น In-use, คลัง"
                className="input"
              />
            </div>

            {/* Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label font-bold mb-0">ประเภทเครื่อง / กระบอก</label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  (ดึงจากเมนูกระบอก)
                </span>
              </div>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="select font-semibold"
              >
                {cylinderTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Single Jersey'
                      ? 'Single Jersey (S)'
                      : opt === 'Double Jersey'
                      ? 'Double Jersey (D)'
                      : opt === 'Jacquard'
                      ? 'Jacquard (Jac.)'
                      : opt}
                  </option>
                ))}
                {formData.type && !cylinderTypeOptions.includes(formData.type) && (
                  <option value={formData.type}>{formData.type}</option>
                )}
              </select>
            </div>

            {/* Date (Auto today) */}
            <div>
              <label className="label font-bold">วันที่ตรวจ (อัตโนมัติ) *</label>
              <input
                type="date"
                value={formData.doc_date}
                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                className="input font-mono font-semibold"
                required
              />
            </div>

            {/* Counter */}
            <div>
              <label className="label font-bold text-teal-600 dark:text-teal-400">
                ตัวเลข Counter (รอบเครื่อง) *
              </label>
              <input
                type="number"
                min="0"
                value={formData.counter}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    counter: val,
                    counter_diff: computeCounterDiff(val, prev.counter_prev),
                  }))
                }}
                placeholder="เช่น 1540200"
                className="input font-mono font-black text-teal-600 dark:text-teal-400 text-sm"
                required
              />
              {(formData.counter_prev || formData.counter_diff > 0) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
                  {formData.counter_prev ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      ครั้งก่อน: {Number(formData.counter_prev).toLocaleString()}
                      {formData.counter_prev_date ? ` (${formData.counter_prev_date})` : ''}
                    </span>
                  ) : null}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ผลต่างรอบ: +{Number(formData.counter_diff || 0).toLocaleString()} รอบ
                  </span>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="label font-bold">สภาพเข็ม *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="select font-bold"
              >
                {NEEDLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {/* Custom status input when "ระบุเอง" is selected */}
              {formData.status === 'ระบุเอง' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={formData.custom_status || ''}
                    onChange={(e) => setFormData({ ...formData, custom_status: e.target.value })}
                    placeholder="พิมพ์ระบุสภาพเข็มเอง..."
                    className="input font-bold border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    required
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Detailed Observations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold">รายละเอียดสภาพเข็ม / ข้อสังเกต</label>
              <input
                type="text"
                value={formData.needle_condition}
                onChange={(e) => setFormData({ ...formData, needle_condition: e.target.value })}
                placeholder="เช่น ลิ้นเข็มคลอนเล็กน้อย, เข็มคอดแถว 2, ปลายเข็มทู่"
                className="input"
              />
            </div>

            <div>
              <label className="label font-bold">ผู้ตรวจ / ช่างผู้บันทึก</label>
              <input
                type="text"
                value={formData.inspector}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                placeholder="ชื่อช่างผู้ตรวจ"
                className="input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label font-bold">หมายเหตุเพิ่มเติม</label>
              <textarea
                rows={2}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="ข้อคิดเห็นหรือข้อความแจ้งเตือนเพิ่มเติม"
                className="input"
              />
            </div>
          </div>

          {/* Photo upload section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera size={14} className="text-blue-500" />
                <span>รูปถ่ายสภาพเข็ม / ร่องเข็ม ({formData.images?.length || 0} รูป)</span>
              </div>

              <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5">
                {uploadingImage ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    <span>ถ่ายรูป / แนบไฟล์</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo thumbnails list with Google Drive direct preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-h-[80px]">
              {(formData.images || []).length === 0 ? (
                <div className="col-span-2 sm:col-span-4 flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  <ImageIcon size={24} className="opacity-40 mb-1" />
                  <span className="text-[11px]">ยังไม่มีรูปถ่ายสภาพเข็มแนบ</span>
                </div>
              ) : (
                formData.images.map((imgUrl, imgIdx) => (
                  <FormPhotoCard
                    key={imgIdx}
                    url={imgUrl}
                    index={imgIdx + 1}
                    onRemove={() => removePhoto(imgIdx)}
                    onPreview={() =>
                      setPreviewImageModal({
                        url: imgUrl,
                        title: `รูปถ่ายสภาพเข็ม (${imgIdx + 1})`,
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>
  )
}
