import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { format } from 'date-fns'
import { FileText, History, Pencil, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { normalizeSerial, normalizeMachine } from './needleConditionParts.jsx'
import { normalizeCylinderType } from '../../utils/needleConditionSync'
import { computeCounterDiff } from '../../utils/counterDiff'

export function NeedleConditionTable({ displayRows, loading, canEdit, canDelete, historyMap, setDetailItem, setHistoryDrawerItem, setPdfItem, setPreviewImageModal, handleEdit, handleDelete, renderStatusBadge }) {
  return (
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 text-left whitespace-nowrap">ซีเรียล (Serial)</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">เครื่อง (MC)</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ตำแหน่ง</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ประเภท</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Counter ล่าสุด</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">ผลต่างรอบ</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">สภาพเข็ม</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">รูปถ่าย</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">วันที่ตรวจล่าสุด</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">ผู้ตรวจ</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                    <span>กำลังโหลดข้อมูลสภาพเข็ม...</span>
                  </td>
                </tr>
              )}
              {!loading && displayRows.map((row, idx) => {
                const key = normalizeSerial(row.serial) || normalizeMachine(row.machine_mc) || row.id
                const historyList = historyMap.get(key) || []
                const imagesList = Array.isArray(row.images) ? row.images : (row.images ? [row.images] : [])
                const firstImage = imagesList[0] || ''

                return (
                  <tr
                    key={row.id || idx}
                    onClick={() => setDetailItem(row)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Serial */}
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {row.serial || '—'}
                    </td>

                    {/* Machine MC */}
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {row.machine_mc || '—'}
                    </td>

                    {/* Location */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs">
                        {row.location || '—'}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {normalizeCylinderType(row.type)}
                      </span>
                    </td>

                    {/* Counter */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {row.counter ? Number(row.counter).toLocaleString() : '—'}
                    </td>

                    {/* ผลต่างรอบ (counter diff vs previous visit) */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {computeCounterDiff(row.counter, row.counter_prev ?? row.counter_total) > 0
                        ? `+${computeCounterDiff(row.counter, row.counter_prev ?? row.counter_total).toLocaleString()}`
                        : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {renderStatusBadge(row.status)}
                    </td>

                    {/* Images thumbnail via standard ImageThumbnail component */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {firstImage ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <ImageThumbnail
                            url={firstImage}
                            alt={`สภาพเข็ม ${row.serial || row.machine_mc || ''}`}
                            size={32}
                            showLabel={true}
                            onClick={() =>
                              setPreviewImageModal({
                                url: firstImage,
                                title: `สภาพเข็ม: ${row.serial || row.machine_mc || ''} (Counter: ${row.counter ? Number(row.counter).toLocaleString() : '—'})`,
                              })
                            }
                          />
                          {imagesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setHistoryDrawerItem({ key, serial: row.serial, list: historyList })}
                              className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:scale-105 transition-transform"
                              title="ดูรูปทั้งหมด"
                            >
                              +{imagesList.length - 1}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
                      )}
                    </td>

                    {/* Last Inspection Date */}
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {row.doc_date ? format(new Date(row.doc_date), 'dd/MM/yyyy') : '—'}
                    </td>

                    {/* Inspector */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.inspector || '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* PDF & Print Button */}
                        <button
                          type="button"
                          onClick={() => setPdfItem(row)}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                          title="ดูเอกสาร PDF และพิมพ์รายงานสภาพเข็ม"
                        >
                          <FileText size={13} />
                        </button>

                        {/* History button */}
                        <button
                          type="button"
                          onClick={() => setHistoryDrawerItem({ key, serial: row.serial, list: historyList })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="ดูประวัติการตรวจสภาพเข็มย้อนหลัง"
                        >
                          <History size={13} />
                        </button>

                        {/* Edit */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="แก้ไขข้อมูลสภาพเข็ม"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id, row.serial)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="ลบข้อมูลสภาพเข็ม"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && !displayRows.length && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Sparkles size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">ยังไม่มีข้อมูลสภาพเข็ม</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">
                      กดปุ่ม "สแกน QR บันทึกสภาพเข็ม" เพื่อเริ่มบันทึกรายการแรก
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  )
}
