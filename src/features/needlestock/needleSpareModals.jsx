import { createPortal } from 'react-dom'
import { KeeperConfigBridge } from './keeperConfigBridge.jsx'
import { VoidConfirmModal } from './voidConfirmModal.jsx'
import { SparePrepareModal } from './sparePrepareModal.jsx'
import { AlertTriangle, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import NeedleKeeperConfigModal from '../../components/repair/NeedleKeeperConfigModal'
import CreateSpareNeedleModal from '../../components/repair/CreateSpareNeedleModal'
import EditSpareNeedleModal from '../../components/repair/EditSpareNeedleModal'

export function NeedleSpareModals({ prepareModalOpen, setPrepareModalOpen, selectedSpareReq, keeperConfigModalOpen, setKeeperConfigModalOpen, createSpareModalOpen, setCreateSpareModalOpen, editSpareModalOpen, setEditSpareModalOpen, selectedDeleteReq, deleteConfirmModalOpen, setDeleteConfirmModalOpen, handleConfirmDeleteSpareRequest, voidTarget, setVoidTarget, voidReason, setVoidReason, voidSaving, handleConfirmVoidLedger, needleActionLabel, formatSignedQty, deleteAckReturned, setDeleteAckReturned, deleteLoading, selectedEditReq, setSelectedEditReq, user, toast, needleSets, setSpareRequests, loadData }) {
  return (
    <>
      <SparePrepareModal prepareModalOpen={prepareModalOpen} setPrepareModalOpen={setPrepareModalOpen} selectedSpareReq={selectedSpareReq} setSpareRequests={setSpareRequests} loadData={loadData} toast={toast} />


      {/* 0. NEEDLE KEEPER CONFIG MODAL */}
      <KeeperConfigBridge keeperConfigModalOpen={keeperConfigModalOpen} setKeeperConfigModalOpen={setKeeperConfigModalOpen} toast={toast} />
import { VoidConfirmModal } from './voidConfirmModal.jsx'


      {/* 0.1 CREATE SPARE NEEDLE REQUEST MODAL */}
      <CreateSpareNeedleModal
        isOpen={createSpareModalOpen}
        onClose={() => setCreateSpareModalOpen(false)}
        currentUser={user}
        onSuccess={(newReq) => {
          setSpareRequests((prev) => [newReq, ...prev])
          loadData(true)
          toast.success(`สร้างใบขอเบิกเข็ม ${newReq.request_no || newReq.id} เรียบร้อยแล้ว`)
        }}
      />

      {/* 0.2 EDIT SPARE NEEDLE REQUEST MODAL */}
      <EditSpareNeedleModal
        isOpen={editSpareModalOpen}
        req={selectedEditReq}
        onClose={() => {
          setEditSpareModalOpen(false)
          setSelectedEditReq(null)
        }}
        onSuccess={(updatedReq) => {
          setSpareRequests((prev) => prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)))
          loadData(true)
          toast.success(`อัปเดตใบเบิกเข็ม ${updatedReq.request_no || updatedReq.id} เรียบร้อยแล้ว`)
        }}
      />

      {/* 0.2b LEDGER VOID CONFIRMATION (ยกเลิกรายการ + คืนยอด) */}
      <VoidConfirmModal voidTarget={voidTarget} setVoidTarget={setVoidTarget} voidReason={voidReason} setVoidReason={setVoidReason} voidSaving={voidSaving} handleConfirmVoidLedger={handleConfirmVoidLedger} needleActionLabel={needleActionLabel} formatSignedQty={formatSignedQty} needleSets={needleSets} />


      {/* 0.3 DELETE CONFIRMATION MODAL WITH AUTO STOCK RETURN */}
      {deleteConfirmModalOpen && selectedDeleteReq && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !deleteLoading && setDeleteConfirmModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการลบใบเบิกเข็ม Spare</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedDeleteReq.request_no || selectedDeleteReq.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-xs text-slate-700 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">เครื่องจักร (MC):</span>
                <span className="font-bold text-slate-800">{selectedDeleteReq.machine_mc || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ช่างผู้ขอ:</span>
                <span className="font-semibold">{selectedDeleteReq.technician_name} ({selectedDeleteReq.shift})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะ:</span>
                <span className="font-bold">
                  {selectedDeleteReq.status === 'PENDING' && '⏳ รอจัดเตรียม'}
                  {selectedDeleteReq.status === 'PREPARED' && '📦 เตรียมแล้ว (รอรับ)'}
                  {selectedDeleteReq.status === 'COMPLETED' && '✅ รับเข็มเรียบร้อย'}
                </span>
              </div>
            </div>

            {/* Auto Stock Return Alert */}
            {selectedDeleteReq.issued_items && selectedDeleteReq.issued_items.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2 mb-5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>คืนสต็อกเข้าคลังอัตโนมัติ (Auto Stock Return)</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  ใบเบิกนี้ได้ตัดจ่ายเข็มออกจากคลังสต็อกไปแล้ว ระบบจะทำการ <strong>คืนยอดเข็มกลับเข้าคลังสต็อก</strong> และบันทึกประวัติการรับคืน (RETURN_SPARE) ให้ทันที:
                </p>
                <div className="bg-white/80 rounded-lg p-2 border border-amber-200/60 space-y-1">
                  {selectedDeleteReq.issued_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-slate-800">{item.needleModel || item.setId} ({item.grade})</span>
                      <span className="font-bold text-emerald-600">+{item.quantity} ตัว</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-5">
                ใบเบิกนี้ยังไม่ได้ตัดจ่ายสต็อกเข็ม การลบจะยกเลิกคำขอนี้โดยไม่มีผลกระทบต่อยอดสต็อก
              </p>
            )}

            {selectedDeleteReq.status === 'COMPLETED' && selectedDeleteReq.issued_items?.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-2 mb-5">
                <div className="flex items-center gap-1.5 font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>ใบเบิกนี้ช่างรับเข็มไปแล้ว</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  เข็มชุดนี้อยู่ที่เครื่องจักรแล้ว การคืนยอดเข้าคลังจะถูกต้อง <strong>เฉพาะเมื่อได้รับเข็มคืนจากช่างจริง</strong>
                </p>
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteAckReturned}
                    onChange={(e) => setDeleteAckReturned(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-rose-600"
                  />
                  <span className="font-semibold">ยืนยันว่ารับเข็มคืนจากช่างแล้ว จึงให้คืนยอดเข้าคลังสต็อก</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDeleteSpareRequest}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <span>กำลังลบ & คืนสต็อก...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยืนยันลบ {selectedDeleteReq.issued_items?.length > 0 ? '& คืนสต็อก' : ''}</span>
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
