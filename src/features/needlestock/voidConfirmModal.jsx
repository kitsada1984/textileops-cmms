import { createPortal } from 'react-dom'
import { RotateCcw } from 'lucide-react'

export function VoidConfirmModal({ voidTarget, setVoidTarget, voidReason, setVoidReason, voidSaving, handleConfirmVoidLedger, needleActionLabel, formatSignedQty, needleSets }) {
  return (
    <>
      {voidTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !voidSaving && setVoidTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยกเลิกรายการสต็อก &amp; คืนยอด</h3>
                <p className="text-xs text-slate-500 font-mono">{voidTarget.setId} · {voidTarget.logId || voidTarget.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">ประเภทรายการ:</span>
                <span className="font-bold">{needleActionLabel(voidTarget.actionType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนที่เปลี่ยน:</span>
                <span className={`font-bold ${(parseInt(voidTarget.qtyChange, 10) || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatSignedQty(voidTarget.qtyChange)} เล่ม
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้ทำรายการ:</span>
                <span className="font-semibold">{voidTarget.technician || '—'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                <span className="text-slate-500">ยอดคงเหลือหลังคืน:</span>
                <span className="font-bold text-amber-700">
                  {Math.max(0, (parseInt(needleSets.find((x) => x.id === voidTarget.setId || x.setId === voidTarget.setId)?.quantity, 10) || 0) - (parseInt(voidTarget.qtyChange, 10) || 0)).toLocaleString()} เล่ม
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed mb-4">
              ระบบจะ <strong>คืนยอดกลับเข้าชุดเข็ม</strong> และบันทึกประวัติการยกเลิกรายการใหม่ (รายการเดิมยังอยู่เพื่อตรวจสอบย้อนหลัง)
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">เหตุผลในการยกเลิก *</label>
            <input
              className="input w-full mb-5"
              placeholder="เช่น บันทึกจำนวนผิด, เบิกซ้ำ"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={voidSaving}
                onClick={() => setVoidTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={voidSaving || !voidReason.trim()}
                onClick={handleConfirmVoidLedger}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {voidSaving ? (
                  <span>กำลังคืนยอด...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ยืนยันยกเลิก &amp; คืนยอด</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
