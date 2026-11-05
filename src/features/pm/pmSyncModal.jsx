import Modal from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'
import { RefreshCw } from 'lucide-react'
import { PMCountdownBadge } from './pmHelpers.jsx'

export function PMSyncModal({ syncModal, setSyncModal, syncForm, setSyncForm, pmSyncPreviewRows, syncCycleDays, syncNextPMDate, syncingPM, handleSyncSourceChange, updatePMPlansFromCylinders, syncLocationOptions, syncMachineOptions, syncSerialOptions, t }) {
  return (
          <Modal
            open={syncModal}
            onClose={() => setSyncModal(false)}
            title="อัพเดตแผน PM จากเมนูกระบอก"
            size="xl"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <button type="button" className="btn-outline px-4" onClick={() => setSyncModal(false)}>
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  className="btn-primary px-5"
                  onClick={updatePMPlansFromCylinders}
                  disabled={syncingPM || !pmSyncPreviewRows.length || !syncCycleDays || !syncNextPMDate}
                >
                  <RefreshCw size={14} className={syncingPM ? 'animate-spin' : ''} />
                  <span>{syncingPM ? 'กำลังอัพเดต...' : 'ยืนยันอัพเดต + เพิ่ม Log PM'}</span>
                </button>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">รายการจากกระบอก In-use</div>
                  <div className="text-2xl font-black mt-0.5 text-blue-600">{pmSyncPreviewRows.length}</div>
                </div>
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">เพิ่มใหม่</div>
                  <div className="text-2xl font-black mt-0.5 text-emerald-600">
                    {pmSyncPreviewRows.filter((r) => r.action === 'เพิ่มใหม่').length}
                  </div>
                </div>
                <div className="card p-3 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-bold">อัพเดต/เพิ่ม Log</div>
                  <div className="text-2xl font-black mt-0.5 text-indigo-600">
                    {pmSyncPreviewRows.filter((r) => r.action !== 'เพิ่มใหม่').length}
                  </div>
                </div>
              </div>

              <div className="text-slate-500">
                ระบบจะดึง `ซีเรียลเดิม`, `เครื่องปัจจุบัน`, `ตำแหน่ง`, `ประเภท` จากเมนูกระบอกอัตโนมัติ และเพิ่มแถวใน Log PM ทุกครั้งที่ยืนยัน
              </div>

              <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300">เลือกข้อมูลจากเมนูกระบอก</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="label font-bold">Location อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-location-list"
                      value={syncForm.Location}
                      onChange={(e) => handleSyncSourceChange('Location', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-location-list">
                      {syncLocationOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label font-bold">เครื่องปัจจุบัน อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-machine-list"
                      value={syncForm.Machine_MC}
                      onChange={(e) => handleSyncSourceChange('Machine_MC', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-machine-list">
                      {syncMachineOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="label font-bold">ซีเรียลเดิม อัตโนมัติ</label>
                    <input
                      className="input text-xs"
                      list="pm-sync-serial-list"
                      value={syncForm.Machine_KI}
                      onChange={(e) => handleSyncSourceChange('Machine_KI', e.target.value)}
                      placeholder="ทั้งหมด / เลือกหรือพิมพ์"
                    />
                    <datalist id="pm-sync-serial-list">
                      {syncSerialOptions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="card p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-300">ข้อมูล PM ที่จะบันทึก</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="label font-bold">รอบ PM</label>
                    <select
                      className="select text-xs"
                      value={syncForm.PM_Cycle}
                      onChange={(e) => setSyncForm((p) => ({ ...p, PM_Cycle: e.target.value }))}
                    >
                      <option value="30">30 วัน</option>
                      <option value="90">90 วัน</option>
                      <option value="120">120 วัน</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  {syncForm.PM_Cycle === 'CUSTOM' && (
                    <div>
                      <label className="label font-bold">Custom (วัน)</label>
                      <input
                        className="input text-xs"
                        type="number"
                        min="1"
                        value={syncForm.Custom_PM_Days}
                        onChange={(e) => setSyncForm((p) => ({ ...p, Custom_PM_Days: e.target.value }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="label font-bold">PM ล่าสุด</label>
                    <input
                      className="input text-xs"
                      type="date"
                      value={syncForm.Last_PM_Date}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Last_PM_Date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label font-bold">PM ครั้งถัดไป</label>
                    <input className="input text-xs font-mono" value={syncNextPMDate || ''} readOnly />
                  </div>
                  <div>
                    <label className="label font-bold">นับถอยหลัง</label>
                    <div className="input text-xs flex items-center">
                      {syncNextPMDate ? <PMCountdownBadge date={syncNextPMDate} /> : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="label font-bold">ช่าง</label>
                    <input
                      className="input text-xs"
                      value={syncForm.Assigned_Tech}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Assigned_Tech: e.target.value }))}
                      placeholder="ชื่อช่าง"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label font-bold">URL รูป</label>
                    <input
                      className="input text-xs"
                      value={syncForm.ImageUrl}
                      onChange={(e) => setSyncForm((p) => ({ ...p, ImageUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="label font-bold">หมายเหตุ</label>
                    <textarea
                      className="input text-xs"
                      rows={2}
                      value={syncForm.Remark}
                      onChange={(e) => setSyncForm((p) => ({ ...p, Remark: e.target.value }))}
                      placeholder="เพิ่มหมายเหตุ"
                    />
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden border border-slate-200 dark:border-slate-800" style={{ maxHeight: 350, overflow: 'auto' }}>
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                      <th className="py-2 px-3 text-left">ซีเรียลเดิม</th>
                      <th className="py-2 px-3 text-left">เครื่องปัจจุบัน</th>
                      <th className="py-2 px-3 text-left">ตำแหน่ง</th>
                      <th className="py-2 px-3 text-left">รอบ PM</th>
                      <th className="py-2 px-3 text-left">รายการที่จะทำ</th>
                      <th className="py-2 px-3 text-left">ซ้ำ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {pmSyncPreviewRows.map((row, i) => (
                      <tr key={`${row.serialOld}-${row.machine}-${i}`}>
                        <td className="font-mono font-bold py-2 px-3 text-blue-600">{row.serialOld}</td>
                        <td className="py-2 px-3 font-semibold">{row.machine}</td>
                        <td className="py-2 px-3">{row.location || '—'}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600">
                            {syncCycleDays ? `${syncCycleDays} วัน` : '—'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <StatusBadge value={row.action} />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.duplicateCount ? `${row.duplicateCount} แถว` : '—'}</td>
                      </tr>
                    ))}
                    {!pmSyncPreviewRows.length && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          ไม่พบข้อมูล In-use จากเมนูกระบอก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
  )
}
