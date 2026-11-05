import Modal from '../../components/ui/Modal'
import F from '../../components/ui/FormField'
import { Check, ExternalLink, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react'
import { PMCountdownBadge, appendPMImageMeta } from './pmHelpers.jsx'

export function PMEditModal({ modal, setModal, form, setForm, saving, uploadingImage, submit, handleLastPMDateChange, handlePMCycleChange, onPickImageFile, t }) {
  return (
          <Modal
            open={modal}
            onClose={() => setModal(false)}
            title={t('pm_edit')}
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
                      <span>{t('saving')}</span>
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
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label font-bold">ซีเรียลเดิม</label>
                  <input className="input font-mono" value={form.Machine_KI || ''} readOnly />
                </div>
                <div>
                  <label className="label font-bold">เครื่องปัจจุบัน *</label>
                  <input className="input font-bold" value={form.Machine_MC || ''} readOnly />
                </div>
                <div>
                  <label className="label font-bold">PM ล่าสุด</label>
                  <input
                    type="date"
                    className="input font-mono text-xs"
                    value={form.Last_PM_Date || ''}
                    onChange={(e) => handleLastPMDateChange(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label font-bold mb-0">PM ครั้งถัดไป *</label>
                    {form.Next_PM_Date && <PMCountdownBadge date={form.Next_PM_Date} />}
                  </div>
                  <input
                    type="date"
                    className="input font-mono font-bold text-xs"
                    value={form.Next_PM_Date || ''}
                    onChange={(e) => setForm((p) => ({ ...p, Next_PM_Date: e.target.value }))}
                    required
                  />
                </div>

                {/* รอบ PM (วัน) Selector */}
                <div className="space-y-1 sm:col-span-2 bg-blue-50/60 dark:bg-blue-950/25 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <label className="label font-bold text-blue-900 dark:text-blue-200">รอบ PM (วัน) *</label>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {form.PM_Cycle_Select === 'CUSTOM'
                        ? (Number(form.Custom_PM_Days) > 0 ? `${form.Custom_PM_Days} วัน (Custom)` : 'ระบุเอง')
                        : `${form.PM_Cycle_Select || 90} วัน`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="select font-bold text-xs bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700"
                      value={form.PM_Cycle_Select || '90'}
                      onChange={(e) => handlePMCycleChange(e.target.value, form.Custom_PM_Days)}
                    >
                      <option value="30">⚡ 30 วัน (1 เดือน)</option>
                      <option value="60">⚡ 60 วัน (2 เดือน)</option>
                      <option value="90">⚡ 90 วัน (3 เดือน / ไตรมาส)</option>
                      <option value="120">⚡ 120 วัน (4 เดือน)</option>
                      <option value="CUSTOM">✏️ กำหนดจำนวนวันเอง (Custom)...</option>
                    </select>

                    {form.PM_Cycle_Select === 'CUSTOM' && (
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          placeholder="ระบุจำนวนวัน เช่น 45..."
                          className="input font-bold text-xs pr-10 bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700"
                          value={form.Custom_PM_Days || ''}
                          onChange={(e) => handlePMCycleChange('CUSTOM', e.target.value)}
                          autoFocus
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                          วัน
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 pt-1 border-t border-blue-100 dark:border-blue-900/40">
                    <span className="text-blue-500">💡</span>
                    <span>
                      ระบบคำนวณ PM ถัดไปจาก: <strong>{form.Last_PM_Date ? 'วัน PM ล่าสุด' : 'วันที่ปัจจุบัน'}</strong> + <strong>{
                        form.PM_Cycle_Select === 'CUSTOM' ? (Number(form.Custom_PM_Days) || 0) : Number(form.PM_Cycle_Select || 90)
                      } วัน</strong> (สามารถคลิกแก้ไขวันที่ด้านบนได้อิสระ)
                    </span>
                  </div>
                </div>

                <F form={form} setForm={setForm} label={t('pm_th_tech')} id="Assigned_Tech" placeholder="ชื่อช่างที่รับผิดชอบ" />
              </div>

              {/* Photo upload section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-blue-500" />
                  <span>รูปถ่ายประวัติเช็คศูนย์ / สภาพเครื่อง</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label font-bold">อัปโหลดรูปเข้า Google Drive</label>
                    <label className="btn-primary text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5 justify-center">
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
                      placeholder="หมายเหตุหรือรายละเอียดเพิ่มเติม"
                      onChange={(value) => setForm((p) => ({ ...p, Remark: appendPMImageMeta(value, p.ImageUrl) }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Modal>
  )
}
