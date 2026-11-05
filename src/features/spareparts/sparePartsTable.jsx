import { FileText, Package, Pencil, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react'
import { getSparePartStatus, getColumnWidthStyle } from './sparePartHelpers.jsx'

export function SparePartsTable({ displayRows, cols, loading, canEdit, canDelete, setDetailRec, handle1ClickPR, setPdfItem, openEdit, del, renderCellContent, t }) {
  return (
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                {cols.map((c) => (
                  <th key={c.field} style={getColumnWidthStyle(c)} className="py-3 px-3.5 text-left whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-24">จัดการ</th>
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
                    <td key={c.field} style={getColumnWidthStyle(c)} className="py-2.5 px-3.5 whitespace-nowrap">
                      {renderCellContent(p, c)}
                    </td>
                  ))}
                  <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handle1ClickPR(p)}
                        className={`p-1.5 rounded-lg transition-all border ${
                          getSparePartStatus(p) !== 'IN_STOCK'
                            ? 'text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700 font-bold'
                            : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-slate-200 dark:border-slate-700'
                        }`}
                        title="เปิดใบขอซื้ออะไหล่นี้ทันที (1-Click PR)"
                        aria-label="เปิดใบขอซื้ออะไหล่นี้ทันที (1-Click PR)"
                      >
                        <ShoppingCart size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfItem(p)}
                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                        title="ดูเอกสาร PDF และพิมพ์"
                        aria-label="ดูเอกสาร PDF และพิมพ์"
                      >
                        <FileText size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="แก้ไขข้อมูลอะไหล่"
                          aria-label="แก้ไขข้อมูลอะไหล่"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => del(p._id || p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="ลบข้อมูล"
                          aria-label="ลบข้อมูล"
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
                    <Package size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่มอะไหล่" เพื่อเริ่มต้นบันทึก</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  )
}
