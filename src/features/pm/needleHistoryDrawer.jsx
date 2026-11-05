import Modal from '../../components/ui/Modal'
import ImageThumbnail from '../../components/ui/ImageThumbnail'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { computeCounterDiff } from '../../utils/counterDiff'

export function NeedleHistoryDrawer({ historyDrawerItem, setHistoryDrawerItem, renderStatusBadge, setPreviewImageModal, setPdfItem }) {
  return (
      <Modal
        open={!!historyDrawerItem}
        onClose={() => setHistoryDrawerItem(null)}
        title={`ประวัติการตรวจสภาพเข็มย้อนหลัง (${historyDrawerItem?.serial || '—'})`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="text-slate-500">
            แสดงประวัติการบันทึกสภาพเข็มและการเปลี่ยนแปลงรอบ Counter ทั้งหมดของกระบอกนี้
          </div>

          <div className="space-y-3">
            {(historyDrawerItem?.list || []).map((hRec, hIdx) => {
              const hImages = Array.isArray(hRec.images) ? hRec.images : (hRec.images ? [hRec.images] : [])
              return (
                <div
                  key={hRec.id || hIdx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">
                        {hRec.doc_date ? format(new Date(hRec.doc_date), 'dd/MM/yyyy') : '—'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        เครื่อง: {hRec.machine_mc || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfItem(hRec)}
                        className="p-1 rounded-md text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 transition-all border border-rose-200 dark:border-rose-800/60"
                        title="พิมพ์ใบรายงานตรวจสภาพเข็มรอบนี้"
                      >
                        <FileText size={12} />
                      </button>
                      {renderStatusBadge(hRec.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px]">Counter:</span>
                      <div className="font-mono font-bold text-teal-600">
                        {hRec.counter ? Number(hRec.counter).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ผลต่างรอบ:</span>
                      <div className="font-mono font-bold text-emerald-600">
                        {computeCounterDiff(hRec.counter, hRec.counter_prev ?? hRec.counter_total) > 0
                          ? `+${computeCounterDiff(hRec.counter, hRec.counter_prev ?? hRec.counter_total).toLocaleString()} รอบ`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ตำแหน่ง:</span>
                      <div className="font-semibold">{hRec.location || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ผู้ตรวจ:</span>
                      <div className="font-semibold">{hRec.inspector || '—'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">ข้อสังเกต:</span>
                      <div className="truncate">{hRec.needle_condition || hRec.remark || '—'}</div>
                    </div>
                  </div>

                  {/* Photos in history via ImageThumbnail */}
                  {hImages.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {hImages.map((img, i) => (
                        <ImageThumbnail
                          key={i}
                          url={img}
                          alt="History photo"
                          size={44}
                          onClick={() =>
                            setPreviewImageModal({
                              url: img,
                              title: `ประวัติสภาพเข็ม: ${historyDrawerItem.serial} (${format(new Date(hRec.doc_date || Date.now()), 'dd/MM/yyyy')})`,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
  )
}
