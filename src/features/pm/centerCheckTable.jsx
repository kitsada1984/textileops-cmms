import { Eye, FileText, Pencil, Trash2, Layers } from 'lucide-react'

export function CenterCheckTable({ filteredRecords, canEdit, canDelete, setViewRecord, setPrintRecord, handleEditRecord, handleDeleteRecord }) {
  return (
          <div className="card overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="py-3 px-4 text-left">เลขที่เอกสาร</th>
                    <th className="py-3 px-4 text-left">วันที่ตรวจ</th>
                    <th className="py-3 px-4 text-center">ประเภท</th>
                    <th className="py-3 px-4 text-left">เครื่อง (M/C)</th>
                    <th className="py-3 px-4 text-right">Counter ล่าสุด</th>
                    <th className="py-3 px-4 text-right">ผลต่างรอบ</th>
                    <th className="py-3 px-4 text-left">ช่างตั้งศูนย์</th>
                    <th className="py-3 px-4 text-center">ผลการตรวจ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Layers size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold">ยังไม่มีประวัติการเช็คศูนย์</p>
                        <p className="text-[11px] mt-0.5">กดปุ่ม "เช็คศูนย์ Single" หรือ "Double" ด้านบนเพื่อบันทึกรายการแรก</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const isPassed = r.status === 'ผ่าน'
                      return (
                        <tr key={r.id || r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {r.doc_no}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {r.doc_date}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`badge text-[10px] font-bold ${
                                r.type === 'Double'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                              }`}
                            >
                              {r.type} Jersey
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{r.mc}</span>
                              {r.serial && (
                                <span className="text-[10px] font-mono text-slate-400">({r.serial})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {r.counter_latest ? Number(r.counter_latest).toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                            {r.counter_total ? `+${Number(r.counter_total).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {r.mechanic || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`badge text-[10px] font-bold ${
                                isPassed
                                  ? 'badge-green'
                                  : 'badge-red'
                              }`}
                            >
                              {isPassed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewRecord(r)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="ดูรายละเอียดข้อตรวจ"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setPrintRecord(r)}
                                className="px-2 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1 font-bold text-[11px]"
                                title="ดู PDF / พิมพ์รายงานตรวจเช็คศูนย์"
                              >
                                <FileText size={12} />
                                <span>PDF</span>
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(r)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                  title="แก้ไขข้อมูล"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  title="ลบรายการ"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
  )
}
