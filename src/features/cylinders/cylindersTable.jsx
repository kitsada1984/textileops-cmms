import { Disc, FileText, History, Pencil, QrCode, RefreshCw, Tag, Trash2 } from 'lucide-react'

export function CylindersTable({ isDesktop, displayRows, cols, loading, canEdit, canDelete, setDetailRec, setHistoryTarget, setPdfItem, openQR, openEdit, del, setSelectedTagCylinder, setActiveTab, t }) {
  return (
    <>
      {isDesktop && (
        <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  {cols.map((c) => (
                    <th key={c.key} className="py-3 px-3 text-left whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-28">จัดการ</th>
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
                {!loading && displayRows.map((c, i) => (
                  <tr
                    key={c._id || c.id || i}
                    onClick={() => setDetailRec(c)}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {cols.map((col) => (
                      <td key={col.key} className="py-2.5 px-3 whitespace-nowrap">
                        {col.render(c, i)}
                      </td>
                    ))}
                    <td onClick={(e) => e.stopPropagation()} className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTagCylinder(c)
                            setActiveTab('print_machine_tag')
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 transition-all border border-emerald-200 dark:border-emerald-800/60"
                          title="พิมพ์ Tack (เครื่องปัจจุบัน 20x7cm)"
                          aria-label="พิมพ์ Tack"
                        >
                          <Tag size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTagCylinder(c)
                            setActiveTab('print_tag')
                          }}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-400 transition-all border border-amber-200 dark:border-amber-800/60"
                          title="พิมพ์ Tack Spare (A4 แนวนอน)"
                          aria-label="พิมพ์ Tack Spare"
                        >
                          <Tag size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfItem(c)}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                          title="ดูเอกสาร PDF และพิมพ์"
                          aria-label="ดูเอกสาร PDF และพิมพ์"
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openQR(c, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="QR Code"
                          aria-label="QR Code"
                        >
                          <QrCode size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryTarget(c)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-all border border-indigo-200 dark:border-indigo-800/60"
                          title="ดูประวัติการเปลี่ยน/สลับกระบอก"
                          aria-label="ดูประวัติการเปลี่ยน/สลับกระบอก"
                        >
                          <History size={13} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="แก้ไขข้อมูลกระบอก"
                            aria-label="แก้ไขข้อมูลกระบอก"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => del(c._id || c.id)}
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
                      <Disc size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">{t('no_data')}</p>
                      <p className="text-[11px] mt-0.5 text-slate-400">กดปุ่ม "+ เพิ่ม Cylinder" เพื่อเริ่มต้นบันทึก</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
