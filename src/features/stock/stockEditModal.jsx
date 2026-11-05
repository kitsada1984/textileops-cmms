import Modal from '../../components/ui/Modal'
import F from '../../components/ui/FormField'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { ArrowLeftRight, CalendarDays, Check, Cpu, Package, RefreshCw, Tag } from 'lucide-react'
import { TXN_TYPE } from '../../api/entities'
import { WAREHOUSE_OPTIONS } from './stockMovementHelpers.jsx'

export function StockEditModal({ modal, setModal, form, setForm, saving, submit, parts, t, applyPartNameToForm, applyPartToForm, categoryOptions, mcOptions, partCodeOptions, partNameOptions, warehousePartOptions }) {
  return (
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขรายการเคลื่อนไหวสต๊อก' : '➕ บันทึกเคลื่อนไหวสต๊อกใหม่'}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button type="button" className="btn-outline px-4" onClick={() => setModal(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="btn-primary px-5" onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-5 text-xs">
          {/* Section 1: Transaction Type & Part Picker */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight size={14} className="text-blue-500" />
                <span>ประเภทรายการและอะไหล่</span>
              </div>
              {parts?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">เลือกด่วน:</span>
                  <select
                    className="select text-[11px] py-0.5 px-2 max-w-[240px]"
                    onChange={(e) => {
                      const idx = e.target.selectedIndex - 1
                      if (idx >= 0 && warehousePartOptions[idx]) {
                        const opt = warehousePartOptions[idx]
                        applyPartToForm(opt.partCode, opt.location)
                      }
                    }}
                    value=""
                  >
                    <option value="">— เลือกจากเมนูอะไหล่ (แยกตามคลัง) —</option>
                    {warehousePartOptions.map((p, idx) => (
                      <option key={`${p.partCode}_${p.location}_${idx}`} value={p.partCode}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label flex items-center gap-1">
                  <CalendarDays size={12} className="text-blue-500" />
                  <span>วันที่ทำรายการ *</span>
                </label>
                <input
                  type="date"
                  className="input text-xs w-full font-mono"
                  value={form.created_date || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, created_date: e.target.value }))}
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">ใส่อัตโนมัติ (แก้ไขได้)</span>
              </div>
              <F form={form} setForm={setForm} label="ประเภทรายการ" id="TXN_Type" opts={TXN_TYPE} />
              <F form={form} setForm={setForm} label="หมวดหมู่" id="Category" opts={categoryOptions} />
              <div>
                <SearchableDropdown
                  id="Part_Code"
                  label="รหัสอะไหล่"
                  required
                  icon={Tag}
                  value={form.Part_Code || ''}
                  onChange={(val) => applyPartToForm(val)}
                  options={partCodeOptions}
                  placeholder="เลือกจากดรอปดาวน์ หรือพิมพ์รหัสใหม่..."
                  inputClassName="font-mono font-bold text-blue-600 dark:text-blue-400"
                  helperText="คลิกลูกศรเพื่อเลือกดรอปดาวน์ หรือพิมพ์รหัสใหม่"
                />
              </div>

              <div className="sm:col-span-2">
                <SearchableDropdown
                  id="Part_Name_EN"
                  label="ชื่ออะไหล่"
                  icon={Package}
                  value={form.Part_Name_EN || ''}
                  onChange={(val) => applyPartNameToForm(val)}
                  options={partNameOptions}
                  placeholder="เลือกจากดรอปดาวน์ หรือพิมพ์ชื่อใหม่..."
                  helperText="คลิกลูกศรเพื่อเลือกดรอปดาวน์ หรือพิมพ์ชื่อใหม่"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Quantities & Preview */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Package size={14} className="text-blue-500" />
              <span>การปรับจำนวนสต๊อก</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="label text-slate-500">คงเหลือก่อนทำ</label>
                <div className="font-mono font-bold text-base text-slate-700 dark:text-slate-300">
                  {Number(form.Qty_Before || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{form.Unit}</span>
                </div>
              </div>

              <div>
                <F form={form} setForm={setForm} label="จำนวนที่ทำรายการ *" id="Qty_Change" type="number" placeholder="0" />
              </div>

              <div>
                <label className="label text-slate-500">คงเหลือหลังทำ (คำนวณอัตโนมัติ)</label>
                <div className={`font-mono font-black text-base ${Number(form.Qty_After || 0) < 0 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                  {Number(form.Qty_After || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{form.Unit}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <F form={form} setForm={setForm} label="หน่วยนับ" id="Unit" placeholder="เช่น ชิ้น, อัน" />
              <F form={form} setForm={setForm} label="ราคาต่อหน่วย" id="Unit_Price" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label="คลัง/สถานที่เก็บ" id="Location_Store" opts={WAREHOUSE_OPTIONS} />
            </div>
          </div>

          {/* Section 3: Reference, Machine & Notes */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Tag size={14} className="text-emerald-500" />
              <span>เครื่องจักร เอกสารอ้างอิง และผู้ดำเนินการ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <SearchableDropdown
                  id="MC"
                  label="เครื่องจักร (M/C)"
                  required={form.TXN_Type === 'ISSUE'}
                  icon={Cpu}
                  value={form.MC || ''}
                  onChange={(val) => setForm((prev) => ({ ...prev, MC: val }))}
                  options={mcOptions}
                  placeholder="เช่น SB-361M, DB-3411T..."
                  inputClassName="font-mono font-bold"
                  helperText={form.TXN_Type === 'ISSUE' ? 'จำเป็นต้องระบุสำหรับรายการเบิกใช้' : 'คลิกลูกศรเพื่อเลือกดรอปดาวน์ หรือพิมพ์เลขเครื่อง'}
                />
              </div>
              <F form={form} setForm={setForm} label="เอกสารอ้างอิง / เลขที่งาน" id="Reference" placeholder="เช่น WO-2026-001 หรือ PO-001" />
              <F form={form} setForm={setForm} label="ผู้ทำรายการ" id="Performed_By" placeholder="ชื่อผู้เบิกหรือผู้รับของ" />
              <div className="sm:col-span-3">
                <F
                  form={form}
                  setForm={setForm}
                  label="หมายเหตุ (Note)"
                  id="Note"
                  placeholder="สาเหตุการเบิก การใช้งาน หรือข้อสังเกต"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
  )
}
