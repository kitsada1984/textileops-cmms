import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { Check, Disc, ExternalLink, Image as ImageIcon, Layers, RefreshCw, Upload, Zap } from 'lucide-react'
import { EMPTY } from '../../utils/cylinderMachineImport'
import { stripCylinderImageMeta } from '../../utils/cylinderImage'
import { CYL_STATUS } from '../../api/entities'
import { MACHINE_REF_OPTIONS } from './cylinderParts.jsx'

export function CylinderEditModal({ modal, setModal, form, setForm, saving, uploadingImage, submit, handleFieldChange, handleSelectMachineToImport, selectedImportMcKey, setSelectedImportMcKey, machineOptions, unlinkedMachines, onPickImageFile, t }) {
  return (
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form._id || form.id ? '✏️ แก้ไขข้อมูลกระบอก' : '➕ เพิ่มข้อมูลกระบอกใหม่'}
        size="xl"
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
          {/* Machine Spec Auto-Fill Tool (Add Mode Only) */}
          {!form._id && !form.id && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900/50 border border-blue-200/80 dark:border-blue-800/60 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Zap size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ⚡ ดึงข้อมูลจากเครื่องจักรที่ยังไม่มีกระบอก
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 hidden sm:inline">
                      (ใช้ซีเรียลเดิมเป็น Key)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 whitespace-nowrap">
                  {unlinkedMachines.length} เครื่องพร้อมดึง
                </span>
              </div>

              <div>
                <SearchableDropdown
                  value={selectedImportMcKey}
                  onChange={handleSelectMachineToImport}
                  options={machineOptions}
                  placeholder={
                    unlinkedMachines.length > 0
                      ? 'เลือกเครื่องจักร หรือพิมพ์ค้นหา (รหัสเครื่อง, ซีเรียลเดิม, สเปก)...'
                      : 'ไม่มีเครื่องจักรใหม่ที่มีซีเรียลเดิมที่ยังไม่ถูกเพิ่มในกระบอก'
                  }
                  disabled={unlinkedMachines.length === 0}
                  allowCustom={false}
                  emptyText="ไม่พบเครื่องจักรที่ตรงกับคำค้นหา หรือเครื่องจักรนี้มีในกระบอกแล้ว"
                  helperText="เลือกเครื่องจักรเพื่อดึงซีเรียลเดิม รหัสเครื่อง ประเภท ขนาด เกจ เข็ม ฯลฯ ลงฟอร์ม (กรุณากรอกซีเรียลปัจจุบันเพิ่ม)"
                />
              </div>
            </div>
          )}

          {/* Section 1: General Info */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Disc size={14} className="text-blue-500" />
              <span>ข้อมูลหลักและสถานะกระบอก</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField label={`${t('cyl_th_serial_now')} *`} id="Serial_NOW" form={form} onChange={handleFieldChange} placeholder="ซีเรียลปัจจุบัน" />
              <FormField label={t('status')} id="Status_Now" form={form} onChange={handleFieldChange} opts={CYL_STATUS} />
              <FormField label={t('cyl_th_item')} id="ITEM" form={form} onChange={handleFieldChange} type="number" placeholder="ลำดับ" />
              <FormField label={t('cyl_th_loc')} id="Location" form={form} onChange={handleFieldChange} placeholder="ตำแหน่ง" />
              <FormField label={t('cyl_th_standard')} id="Standard" form={form} onChange={handleFieldChange} placeholder="มาตรฐาน MC" />
              <FormField label={t('cyl_th_newmc')} id="NewMC" form={form} onChange={handleFieldChange} placeholder="เครื่องปัจจุบัน" />
              <FormField label={t('cyl_th_serial_old')} id="Serial_OLD" form={form} onChange={handleFieldChange} placeholder="ซีเรียลเดิม" />
              <FormField label={t('cyl_th_machine_ref')} id="Machine_Ref" form={form} onChange={handleFieldChange} opts={MACHINE_REF_OPTIONS} />
            </div>
          </div>

          {/* Section 2: Specs */}
          <div className="space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers size={14} className="text-blue-500" />
              <span>สเปกและคุณลักษณะกระบอก</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <FormField label={t('cyl_th_type')} id="Type" form={form} onChange={handleFieldChange} placeholder="ประเภท เช่น S หรือ D" />
              <FormField label={t('cyl_th_mfr')} id="Manufacturer" form={form} onChange={handleFieldChange} placeholder="ผู้ผลิต" />
              <FormField label={t('cyl_th_feeder')} id="Feeder" form={form} onChange={handleFieldChange} placeholder="ฟีดเดอร์" />
              <FormField label={t('cyl_th_dia')} id="Diameter" form={form} onChange={handleFieldChange} placeholder="เส้นผ่าศูนย์" />
              <FormField label={t('cyl_th_gauge')} id="Gauge" form={form} onChange={handleFieldChange} placeholder="เกจ" />
              <FormField label={t('cyl_th_needle')} id="Needle" form={form} onChange={handleFieldChange} placeholder="เข็ม" />
            </div>
          </div>

          {/* Section 3: Photo & Comments */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
              <ImageIcon size={14} className="text-indigo-500" />
              <span>รูปถ่ายกระบอก & หมายเหตุ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold">อัปโหลดรูปกระบอกเข้า Google Drive</label>
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
                <FormField label="หรือวางลิงก์รูป (URL)" id="ImageUrl" form={form} onChange={handleFieldChange} placeholder="https://..." />
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
                <FormField
                  label={t('cyl_th_comment')}
                  id="Comment"
                  form={form}
                  onChange={(id, value) => setForm((p) => ({ ...p, [id]: stripCylinderImageMeta(value) }))}
                  placeholder="ข้อสังเกต หรือข้อมูลประกอบกระบอก"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
  )
}
