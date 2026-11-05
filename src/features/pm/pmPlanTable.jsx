import { Calendar, FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { pmColumnLabel } from './pmHelpers.jsx'

export function PMPlanTable({ displayRows, cols, loading, t, canEdit, canDelete, setDetailRec, setPdfItem, openEdit, del, renderPMCell }) {
  return (
          <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    {cols.map((c) => (
                      <th key={c.field || c.id} style={c.width ? { width: c.width, minWidth: c.width } : undefined} className="py-2 px-2 sm:py-3 sm:px-3 text-left whitespace-nowrap">
                        {pmColumnLabel(c, t)}
                      </th>
                    ))}
                    <th className="py-2 px-2 sm:py-3 sm:px-3 text-center w-20">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading && (
                    <tr>
                      <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-50" />
                        <span>{t('loading')}</span>
                      </td>
                    </tr>
                  )}
                  {!loading && displayRows.map((p, i) => (
                    <tr
                      key={p._id || p.id || i}
                      onClick={() => setDetailRec(p)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {cols.map((c) => (
                        <td key={c.field || c.id} style={c.width ? { width: c.width, minWidth: c.width } : undefined} className="py-2 px-2 sm:py-2.5 sm:px-3 whitespace-nowrap">
                          {renderPMCell(p, c)}
                        </td>
                      ))}
                      <td onClick={(e) => e.stopPropagation()} className="py-2 px-2 sm:py-2.5 sm:px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPdfItem(p)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                            title="ดูเอกสาร PDF และพิมพ์"
                          >
                            <FileText size={13} />
                          </button>
                          {canEdit && p.__hasPMPlan && (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="แก้ไขข้อมูลแผน PM"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && p.__hasPMPlan && (
                            <button
                              type="button"
                              onClick={() => del(p._id || p.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="ลบแผน PM"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !displayRows.length && (
                    <tr>
                      <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400">
                        <Calendar size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                        <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "อัพเดตแผน PM" เพื่อดึงข้อมูลกระบอก In-use</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
  )
}
