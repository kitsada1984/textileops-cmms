import Modal from '../../components/ui/Modal'
import { Printer } from 'lucide-react'
import { CenterCheckPhotoCard } from './centerCheckParts.jsx'

export function CenterCheckViewModal({ viewRecord, setViewRecord, setPrintRecord, getLatestLocation, setPreviewImage }) {
  return (
    <>
      {viewRecord && (
        <Modal
          open={!!viewRecord}
          onClose={() => setViewRecord(null)}
          title={`รายละเอียดใบบันทึก ${viewRecord.doc_no} (M/C: ${viewRecord.mc})`}
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <span className="text-slate-400 font-semibold">เลขที่เอกสาร:</span>
                <div className="font-mono font-bold text-blue-600">{viewRecord.doc_no}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">วันที่ตรวจ:</span>
                <div className="font-semibold">{viewRecord.doc_date}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">เครื่อง (M/C):</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{viewRecord.mc}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Serial No.:</span>
                <div className="font-mono text-slate-700 dark:text-slate-300">{viewRecord.serial || '—'}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">ตำแหน่ง (Location):</span>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {viewRecord.location && viewRecord.location !== '—'
                    ? viewRecord.location
                    : getLatestLocation(viewRecord.mc, viewRecord.serial, 'โรงทอ')}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">ผลรวมการตรวจ:</span>
                <div>
                  <span className={`badge ${viewRecord.status === 'ผ่าน' ? 'badge-green' : 'badge-red'}`}>
                    {viewRecord.status === 'ผ่าน' ? '✅ ผ่านมาตรฐาน' : '❌ ไม่ผ่าน'}
                  </span>
                </div>
              </div>
            </div>

            {/* Counter info */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300">
              <div>
                <span className="text-slate-500 text-[10px]">Counter ล่าสุด:</span>
                <div className="font-mono font-bold">{Number(viewRecord.counter_latest || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Counter ครั้งก่อน:</span>
                <div className="font-mono">{Number(viewRecord.counter_prev || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">ผลต่างรอบ:</span>
                <div className="font-mono font-bold text-teal-600">+{Number(viewRecord.counter_total || 0).toLocaleString()} รอบ</div>
              </div>
            </div>

            {/* 10 Items List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="py-2 px-3 text-center w-10">ข้อ</th>
                    <th className="py-2 px-3 text-left">รายการตรวจ</th>
                    <th className="py-2 px-3 text-center">มาตรฐาน</th>
                    <th className="py-2 px-3 text-center">ก่อนทำ</th>
                    <th className="py-2 px-3 text-center">หลังทำ</th>
                    <th className="py-2 px-3 text-center">ผล</th>
                    <th className="py-2 px-3 text-left">ข้อสังเกต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(viewRecord.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-center font-bold text-slate-400">{it.no || idx + 1}</td>
                      <td className="py-2 px-3 font-semibold">{it.item}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{it.std || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.val_before || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-blue-600">{it.val_after || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`badge ${it.result === 'ผ่าน' ? 'badge-green' : 'badge-red'}`}>
                          {it.result}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{it.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Additional Checklist Display (อัดจารบี, ถ่ายน้ำมันเกียร์, สายพานส่งด้าย) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                รายการตรวจเช็คบำรุงรักษาเพิ่มเติม (Maintenance Checklist)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">อัดจารบี:</span>
                  <span className={`badge ${viewRecord.greasing ? 'badge-green' : 'badge-gray'}`}>
                    {viewRecord.greasing ? '✅ ดำเนินการแล้ว' : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">ถ่ายน้ำมันเกียร์:</span>
                  <span className={`badge ${viewRecord.oil_change ? 'badge-green' : 'badge-gray'}`}>
                    {viewRecord.oil_change ? '✅ ดำเนินการแล้ว' : '—'}
                  </span>
                </div>
                <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-semibold text-[11px] block">
                    สายพานส่งด้าย (Quality Feed Belts):
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const isChecked = !!viewRecord[`belt_tape${n}`]
                      return (
                        <div
                          key={n}
                          className={`py-1.5 px-1 rounded-lg border text-center font-bold text-[11px] transition-all ${
                            isChecked
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-xs'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          เทป {n}: {isChecked ? '✓ ผ่าน' : '—'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Needle Condition & Notes */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-semibold text-[10px]">สภาพเข็ม (Needle Condition):</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{viewRecord.needle_cond || '—'}</div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold text-[10px]">การเรียงเข็ม (Needle Arrangement):</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{viewRecord.needle_arr || '—'}</div>
              </div>
              {viewRecord.remark && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold text-[10px]">หมายเหตุ:</span>
                  <div className="text-slate-700 dark:text-slate-300">{viewRecord.remark}</div>
                </div>
              )}
            </div>

            {/* Needle & Photos */}
            {viewRecord.needle_images?.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">รูปถ่ายสภาพเข็ม:</span>
                <div className="grid grid-cols-3 gap-2">
                  {viewRecord.needle_images.map((img, i) => (
                    <CenterCheckPhotoCard
                      key={i}
                      url={img}
                      index={i}
                      onPreview={() => setPreviewImage(img)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="btn-outline"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintRecord(viewRecord)
                  setViewRecord(null)
                }}
                className="btn-primary"
              >
                <Printer size={14} />
                <span>พิมพ์เอกสาร A4</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
