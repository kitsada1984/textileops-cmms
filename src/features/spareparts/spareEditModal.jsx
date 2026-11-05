import Modal from '../../components/ui/Modal'
import F from '../../components/ui/FormField'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { Check, DollarSign, ExternalLink, Image as ImageIcon, Layers, Package, RefreshCw, Sparkles, Upload } from 'lucide-react'
import { preserveRemarkWithSparePartImageMeta } from '../../utils/sparePartImage'
import { WAREHOUSE_OPTIONS } from './sparePartHelpers.jsx'

export function SpareEditModal({ modal, setModal, form, setForm, saving, uploadingImage, submit, handleCopyBasePartInfo, onPickImageFile, t, otherWarehousesForForm, setCategoryModalOpen, allCategories }) {
  return (
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลอะไหล่' : '➕ เพิ่มข้อมูลอะไหล่ใหม่'}
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
          {/* Section 1: Basic Info */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Package size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและหมวดหมู่อะไหล่</span>
            </div>
            {otherWarehousesForForm.length > 0 && (
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-blue-900 dark:text-blue-200">
                      พบรหัส {form.Part_Code} ในคลังอื่นแล้ว:
                    </div>
                    <div className="text-blue-700 dark:text-blue-300 font-medium">
                      {otherWarehousesForForm.map((w) => `${w.location} (${w.stock} ${w.unit || ''})`).join(', ')}
                    </div>
                    <div className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                      ระบบรองรับการแยกสต๊อกอิสระต่อคลังสินค้า หากเป็นอะไหล่เดียวกันสามารถกดคัดลอกข้อมูลได้
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBasePartInfo}
                  className="btn-outline text-[11px] py-1.5 px-3 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 flex-shrink-0 flex items-center gap-1 font-bold shadow-xs"
                >
                  <Sparkles size={12} />
                  <span>คัดลอกข้อมูลอะไหล่</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F form={form} setForm={setForm} label={`${t('sp_th_code')} *`} id="Part_Code" placeholder="เช่น SP-001" />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">{t('sp_th_cat')}</label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    title="เปิดหน้าต่างจัดการหมวดหมู่"
                  >
                    <Layers size={11} />
                    <span>จัดการหมวดหมู่</span>
                  </button>
                </div>
                <SearchableDropdown
                  id="Category"
                  value={form.Category ?? 'อะไหล่'}
                  onChange={(val) => setForm((p) => ({ ...p, Category: val }))}
                  options={allCategories.map((c) => ({ value: c, label: c }))}
                  placeholder="เลือก หรือพิมพ์หมวดหมู่ใหม่..."
                  allowCustom={true}
                  className="w-full"
                />
              </div>
              <F form={form} setForm={setForm} label={`${t('sp_th_name_en')} *`} id="Part_Name_EN" placeholder="ชื่ออะไหล่ภาษาอังกฤษหรือไทย" />
              <F form={form} setForm={setForm} label={t('field_unit')} id="Unit" placeholder="เช่น ชิ้น, อัน, ตัว, กล่อง" />
              <div>
                <F form={form} setForm={setForm} label={t('field_warehouse')} id="Location_Store" opts={WAREHOUSE_OPTIONS} />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  💡 สามารถใช้รหัสเดียวกันในคลังต่างกันได้ (แยกสต๊อกอิสระ)
                </span>
              </div>
              <F form={form} setForm={setForm} label={t('field_supplier')} id="Supplier" placeholder="ผู้ผลิตหรือร้านค้าที่ซื้อ" />
            </div>
          </div>

          {/* Section 2: Stock & Price */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <DollarSign size={14} className="text-blue-500" />
              <span>สต๊อกและราคา</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <F form={form} setForm={setForm} label={t('sp_th_stock')} id="Stock_Qty" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label={t('sp_th_min')} id="Min_Qty" type="number" placeholder="0" />
              <F form={form} setForm={setForm} label={t('sp_th_price')} id="Unit_Price" type="number" placeholder="0" />
              <div className="sm:col-span-3">
                <F form={form} setForm={setForm} label="เครื่องที่ใช้ได้ (คั่นด้วยจุลภาค)" id="Compatible_Machines" placeholder="เช่น SA-301M, SA-302M" />
              </div>
            </div>
          </div>

          {/* Section 3: Photo & Remark */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายอะไหล่ & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปอะไหล่เข้า Google Drive</label>
                <div className="flex items-center gap-2">
                  <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 flex-1 justify-center">
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>กำลังอัปโหลด...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>เลือกไฟล์รูปถ่าย</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ''
                        if (picked) onPickImageFile(picked)
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <F form={form} setForm={setForm} label="หรือวางลิงก์รูป (URL)" id="ImageUrl" useBuilder={false} placeholder="https://..." />
              </div>

              {form.ImageUrl && (
                <div className="col-span-1 sm:col-span-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={16} className="text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-blue-700 dark:text-blue-300 truncate">{form.ImageUrl}</span>
                  </div>
                  <a
                    href={form.ImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-[11px] py-1 px-2 flex-shrink-0 flex items-center gap-1"
                  >
                    <span>ดูรูป</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}

              <div className="col-span-1 sm:col-span-2">
                <F
                  form={form}
                  setForm={setForm}
                  label={t('remark')}
                  id="Remark"
                  placeholder="ข้อคิดเห็น หรือรายละเอียดเพิ่มเติมของอะไหล่"
                  onChange={(value) => setForm((p) => ({
                    ...p,
                    Remark: preserveRemarkWithSparePartImageMeta(p.Remark, value),
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
  )
}
