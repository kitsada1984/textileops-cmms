import { Camera, CheckCircle2, Plus, RefreshCw, Sliders } from 'lucide-react'
import { NEEDLE_COND_OPTIONS, STANDARD_NEEDLE_CONDS, CenterCheckPhotoCard } from './centerCheckParts.jsx'
import { CenterCheckFormTail } from './centerCheckFormTail.jsx'
import { CenterCheckFormHead } from './centerCheckFormHead.jsx'

export function CenterCheckForm({ activeSubTab, setActiveSubTab, formType, editingId, formData, setFormData, saving, uploadingImage, standardsConfig, rawMachines, rawTechs, handleSubmitForm, handleMcChange, handleSerialChange, handleCounterLatestChange, handleItemChange, handleImageUpload, removeImage, setPreviewImage, setStandardsDraft, setStandardsTab, setStandardsModalOpen }) {
  return (
    <>
      {(activeSubTab === 'single_form' || activeSubTab === 'double_form') && (
        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="card p-6 space-y-6 border border-blue-500/20">
            {/* Header info */}
            <CenterCheckFormHead formType={formType} editingId={editingId} setActiveSubTab={setActiveSubTab} formData={formData} />


            {/* Section 1: Basic info & Counter */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
              <div>
                <label className="label font-bold">วันที่ตรวจ *</label>
                <input
                  type="date"
                  value={formData.doc_date}
                  onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                  className="input font-mono"
                  required
                />
              </div>

              <div>
                <label className="label font-bold">เครื่องจักร (M/C) *</label>
                <input
                  type="text"
                  placeholder="เช่น MC-01, M05"
                  value={formData.mc}
                  onChange={(e) => handleMcChange(e.target.value)}
                  className="input font-bold"
                  required
                  list="mc-datalist"
                />
                <datalist id="mc-datalist">
                  {(rawMachines || []).map((m, idx) => (
                    <option key={idx} value={m.Machine_MC || m.MC || m.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="label font-bold">Serial No.</label>
                <input
                  type="text"
                  placeholder="เช่น SN-2024-889"
                  value={formData.serial}
                  onChange={(e) => handleSerialChange(e.target.value)}
                  className="input font-mono"
                />
              </div>

              <div>
                <label className="label font-bold flex items-center justify-between">
                  <span>ตำแหน่ง (Location)</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">ดึงอัตโนมัติ</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น โรงทอ 1, โรงทอ 2"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input font-semibold bg-blue-50/20 dark:bg-blue-950/20"
                  list="loc-datalist"
                />
                <datalist id="loc-datalist">
                  <option value="โรงทอ 1" />
                  <option value="โรงทอ 2" />
                  <option value="โรงทอ 3" />
                  <option value="โรงทอ" />
                  <option value="แผนกซ่อมบำรุง" />
                </datalist>
              </div>

              <div>
                <label className="label font-bold">ช่างตั้งศูนย์ *</label>
                <input
                  type="text"
                  placeholder="ชื่อช่างผู้ปฏิบัติงาน"
                  value={formData.mechanic}
                  onChange={(e) => setFormData({ ...formData, mechanic: e.target.value, sign_name: e.target.value })}
                  className="input"
                  required
                  list="tech-datalist"
                />
                <datalist id="tech-datalist">
                  {(rawTechs || []).map((t, idx) => (
                    <option key={idx} value={t.Name || t.name} />
                  ))}
                </datalist>
              </div>

              {/* Counter Analytics Box */}
              <div className="col-span-1 md:col-span-2 lg:col-span-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label font-bold text-slate-500">Counter ล่าสุด (รอบ)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.counter_latest}
                    onChange={(e) => handleCounterLatestChange(e.target.value)}
                    className="input font-mono font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="label font-bold text-slate-500">Counter ครั้งก่อน</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.counter_prev}
                    onChange={(e) => {
                      const prev = parseFloat(e.target.value) || 0
                      const latest = parseFloat(formData.counter_latest) || 0
                      const diff = latest > 0 && prev > 0 ? Math.max(0, latest - prev) : 0
                      setFormData({ ...formData, counter_prev: e.target.value, counter_total: diff })
                    }}
                    className="input font-mono bg-slate-100 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="label font-bold text-slate-500">ผลต่างรอบเครื่อง (Diff)</label>
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 font-mono font-black text-teal-600 dark:text-teal-400 text-sm text-center">
                    +{Number(formData.counter_total || 0).toLocaleString()} รอบ
                  </div>
                </div>

                <div>
                  <label className="label font-bold text-slate-500">ระยะห่างจากการตรวจก่อน</label>
                  <div className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs text-center">
                    {formData.days_since_last || 0} วัน {formData.prev_doc_date ? `(${formData.prev_doc_date})` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Checklist Items Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-900)' }}>
                    <Sliders size={16} className="text-blue-500" />
                    <span>รายการตรวจสอบมาตรฐาน ({formType} Jersey)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setStandardsDraft(JSON.parse(JSON.stringify(standardsConfig)))
                      setStandardsTab(formType === 'Double' ? 'Double' : 'Single')
                      setStandardsModalOpen(true)
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 flex items-center gap-1.5 font-bold transition-all shadow-sm"
                    title="ตั้งค่าแม่แบบมาตรฐานของระบบ"
                  >
                    <Sliders size={13} />
                    <span>⚙️ ตั้งค่าแม่แบบมาตรฐาน</span>
                  </button>
                </div>
                <span className={`badge text-xs font-bold ${
                  formData.status === 'ผ่าน' ? 'badge-green' : 'badge-red'
                }`}>
                  ผลรวม: {formData.status === 'ผ่าน' ? '✅ ผ่านมาตรฐาน' : '❌ ไม่ผ่าน'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-900 text-slate-600 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2.5 px-3 text-center w-12">ข้อ</th>
                      <th className="py-2.5 px-3 text-left">รายการตรวจ</th>
                      <th className="py-2.5 px-3 text-center w-36">
                        <span className="inline-flex items-center gap-1">
                          ค่ามาตรฐาน
                          <span className="text-[10px] text-blue-500 font-normal">(ปรับได้)</span>
                        </span>
                      </th>
                      <th className="py-2.5 px-3 text-center w-28">ก่อนทำ</th>
                      <th className="py-2.5 px-3 text-center w-28">หลังทำ</th>
                      <th className="py-2.5 px-3 text-center w-32">ผลการตรวจ</th>
                      <th className="py-2.5 px-3 text-left">ข้อสังเกต / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(formData.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {item.no || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.item}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="text"
                            placeholder="ค่ามาตรฐาน"
                            value={item.std ?? ''}
                            onChange={(e) => handleItemChange(idx, 'std', e.target.value)}
                            className="input text-center font-mono text-xs py-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 w-full"
                            title="สามารถแก้ไขค่ามาตรฐานเฉพาะใบงานนี้ได้ทันที"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="ก่อนทำ"
                            value={item.val_before || ''}
                            onChange={(e) => handleItemChange(idx, 'val_before', e.target.value)}
                            className="input text-center font-mono text-xs py-1"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="หลังทำ"
                            value={item.val_after || ''}
                            onChange={(e) => handleItemChange(idx, 'val_after', e.target.value)}
                            className="input text-center font-mono text-xs py-1 font-bold text-blue-600"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <select
                            value={item.result || 'ผ่าน'}
                            onChange={(e) => handleItemChange(idx, 'result', e.target.value)}
                            className={`select text-xs font-bold py-1 px-2 text-center ${
                              item.result === 'ผ่าน'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                : 'text-red-600 dark:text-red-400 bg-red-500/10'
                            }`}
                          >
                            <option value="ผ่าน">ผ่าน</option>
                            <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                          </select>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="ระบุข้อสังเกต (ถ้ามี)"
                            value={item.remark || ''}
                            onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                            className="input text-xs py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2.5: Maintenance Checklist (อัดจารบี, ถ่ายน้ำมันเกียร์, สายพานส่งด้าย) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                <CheckCircle2 size={15} className="text-teal-500" />
                <span>รายการตรวจเช็คบำรุงรักษาเพิ่มเติม (Maintenance Checklist)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. งานหล่อลื่นและเกียร์ */}
                <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    งานหล่อลื่น & ระบบขับเคลื่อน
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      formData.greasing
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!formData.greasing}
                        onChange={(e) => setFormData({ ...formData, greasing: e.target.checked })}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs">อัดจารบี</span>
                    </label>

                    <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      formData.oil_change
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-900 dark:text-blue-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!formData.oil_change}
                        onChange={(e) => setFormData({ ...formData, oil_change: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs">ถ่ายน้ำมันเกียร์</span>
                    </label>
                  </div>
                </div>

                {/* 2. สายพานส่งด้าย เทป 1-5 */}
                <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      สายพานส่งด้าย (Quality Feed Belts)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allChecked = [1, 2, 3, 4, 5].every((n) => formData[`belt_tape${n}`])
                        setFormData((prev) => ({
                          ...prev,
                          belt_tape1: !allChecked,
                          belt_tape2: !allChecked,
                          belt_tape3: !allChecked,
                          belt_tape4: !allChecked,
                          belt_tape5: !allChecked,
                        }))
                      }}
                      className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {[1, 2, 3, 4, 5].every((n) => formData[`belt_tape${n}`]) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด (1-5)'}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((tapeNum) => {
                      const key = `belt_tape${tapeNum}`
                      const isChecked = !!formData[key]
                      return (
                        <label
                          key={tapeNum}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mb-1"
                          />
                          <span className="text-[11px]">เทป {tapeNum}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Needle Condition & Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-3">
                <div>
                  <label className="label font-bold">สภาพเข็ม (Needle Condition)</label>
                  <select
                    value={
                      STANDARD_NEEDLE_CONDS.includes(formData.needle_cond)
                        ? formData.needle_cond
                        : (formData.needle_cond === 'ปกติ' || !formData.needle_cond ? 'สึกเล็กน้อย' : 'ระบุเอง')
                    }
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'ระบุเอง') {
                        setFormData({
                          ...formData,
                          needle_cond: STANDARD_NEEDLE_CONDS.includes(formData.needle_cond) || formData.needle_cond === 'ปกติ' ? '' : formData.needle_cond,
                        })
                      } else {
                        setFormData({ ...formData, needle_cond: val })
                      }
                    }}
                    className="select font-bold"
                  >
                    {NEEDLE_COND_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  {/* Custom input box if "ระบุเอง" is selected */}
                  {(!STANDARD_NEEDLE_CONDS.includes(formData.needle_cond) && formData.needle_cond !== 'ปกติ') && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="พิมพ์ระบุสภาพเข็มเอง..."
                        value={formData.needle_cond || ''}
                        onChange={(e) => setFormData({ ...formData, needle_cond: e.target.value })}
                        className="input font-bold border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                        required
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="label font-bold">การเรียงเข็ม (Needle Arrangement)</label>
                  <input
                    type="text"
                    placeholder="เช่น ลายเรียง 1-1, ตามแบบมาตรฐาน"
                    value={formData.needle_arr}
                    onChange={(e) => setFormData({ ...formData, needle_arr: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label font-bold">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    placeholder="ข้อคิดเห็น ชิ้นส่วนที่ต้องเฝ้าระวัง หรือข้อมูลอื่นๆ"
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Photos upload */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="label font-bold flex items-center gap-1.5 mb-0">
                    <Camera size={15} className="text-blue-500" />
                    <span>รูปถ่ายสภาพเข็ม / ชิ้นส่วน</span>
                  </label>
                  <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>แนบรูปถ่าย</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2 min-h-[90px]">
                  {(formData.needle_images || []).length === 0 ? (
                    <div className="col-span-3 flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                      <Camera size={24} className="opacity-40 mb-1" />
                      <span className="text-[11px]">ยังไม่มีรูปถ่ายแนบ</span>
                    </div>
                  ) : (
                    formData.needle_images.map((img, imgIdx) => (
                      <CenterCheckPhotoCard
                        key={imgIdx}
                        url={img}
                        index={imgIdx}
                        onRemove={() => removeImage(imgIdx)}
                        onPreview={() => setPreviewImage(img)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Signatures */}
            <CenterCheckFormTail formData={formData} setFormData={setFormData} editingId={editingId} saving={saving} setActiveSubTab={setActiveSubTab} />
import { CenterCheckFormHead } from './centerCheckFormHead.jsx'

          </div>
        </form>
      )}
    </>
  )
}
