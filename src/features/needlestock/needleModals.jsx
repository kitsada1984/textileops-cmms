import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowLeftRight, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import NeedleKeeperConfigModal from '../../components/repair/NeedleKeeperConfigModal'
import CreateSpareNeedleModal from '../../components/repair/CreateSpareNeedleModal'
import EditSpareNeedleModal from '../../components/repair/EditSpareNeedleModal'
import { StepPrepareSpareNeedle, StepAcknowledgeSpareNeedle } from '../../components/repair/SpareNeedleFlow'
import { StockTransactionModal } from './StockTransactionModal.jsx'
import { AddNewNeedleSetModal, UpdateGradeModal, TimelineHistoryModal, ImageGalleryModal } from './needleSetModals.jsx'

export function NeedleModals({ prepareModalOpen, setPrepareModalOpen, selectedSpareReq, keeperConfigModalOpen, setKeeperConfigModalOpen, createSpareModalOpen, setCreateSpareModalOpen, editSpareModalOpen, setEditSpareModalOpen, selectedDeleteReq, deleteConfirmModalOpen, setDeleteConfirmModalOpen, handleConfirmDeleteSpareRequest, stockModalOpen, currentStockSet, needleSets, comboboxStore, addModalOpen, setAddModalOpen, updateModalOpen, setUpdateModalOpen, currentUpdateSet, historyModalOpen, setHistoryModalOpen, currentHistorySet, galleryModalOpen, setGalleryModalOpen, galleryImages, openStockModal, toast, voidTarget, setVoidTarget, voidReason, setVoidReason, voidSaving, handleConfirmVoidLedger, needleActionLabel, formatSignedQty, activeGalleryIndex, setActiveGalleryIndex, currentGallerySet, galleryTitle, setGalleryTitle, gallerySubtitle, setGallerySubtitle, galleryZoom, setGalleryZoom, setGalleryImages, historyLogs, setHistoryLogs, deleteAckReturned, setDeleteAckReturned, deleteLoading, openUpdate, selectedEditReq, setSelectedEditReq, canAdd, learnValues, loadData, setNeedleSets, setSpareRequests, setStockModalOpen, user, NeedleHistoryAPI }) {
  return (
    <>
      {/* PREPARE / VIEW SPARE NEEDLE MODAL */}
      {prepareModalOpen && selectedSpareReq && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPrepareModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedSpareReq.status === 'PENDING' ? (
              <StepPrepareSpareNeedle
                snr={selectedSpareReq}
                cylinder={{ Machine: selectedSpareReq.machine_mc, Gauge: selectedSpareReq.gauge, Serial_NOW: selectedSpareReq.cylinder_serial }}
                onPrepared={(updated) => {
                  setSpareRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
                  loadData(true)
                  setPrepareModalOpen(false)
                  toast.success('จัดเตรียมเข็มและตัดสต็อกเรียบร้อยแล้ว!')
                }}
                onClose={() => setPrepareModalOpen(false)}
              />
            ) : (
              <StepAcknowledgeSpareNeedle
                snr={selectedSpareReq}
                cylinder={{ Machine: selectedSpareReq.machine_mc, Gauge: selectedSpareReq.gauge, Serial_NOW: selectedSpareReq.cylinder_serial }}
                onAcknowledged={(updated) => {
                  setSpareRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
                  loadData(true)
                  setPrepareModalOpen(false)
                  toast.success('บันทึกการรับเข็ม Spare เรียบร้อย!')
                }}
                onHome={() => setPrepareModalOpen(false)}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 0. NEEDLE KEEPER CONFIG MODAL */}
      <NeedleKeeperConfigModal
        isOpen={keeperConfigModalOpen}
        onClose={() => setKeeperConfigModalOpen(false)}
        onSuccess={() => toast.success('บันทึกการตั้งค่าผู้ดูแลเข็มเรียบร้อยแล้ว')}
      />

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

      {/* 1. STOCK TRANSACTION MODAL */}
      {stockModalOpen && (
        <StockTransactionModal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          currentSet={currentStockSet}
          needleSets={needleSets}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(updatedSet, newLog) => {
            setNeedleSets(prev => prev.map(s => {
              const isMatch = (
                (s.setId && updatedSet.setId && s.setId === updatedSet.setId) ||
                (s.id && updatedSet.id && s.id === updatedSet.id) ||
                (s.Set_ID && updatedSet.setId && s.Set_ID === updatedSet.setId) ||
                (s.id && updatedSet.setId && s.id === updatedSet.setId) ||
                (s.setId && updatedSet.id && s.setId === updatedSet.id)
              )
              return isMatch ? updatedSet : s
            }))
            if (newLog) setHistoryLogs(prev => [newLog, ...prev])
            setStockModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`ทำรายการสต็อกชุดเข็ม ${updatedSet.setId} สำเร็จ! ยอดคงเหลือใหม่: ${(parseInt(updatedSet.quantity, 10) || 0).toLocaleString()} เล่ม`)
              }
            } catch {}
          }}
        />
      )}

      {/* 2. ADD NEW NEEDLE SET MODAL */}
      {addModalOpen && (
        <AddNewNeedleSetModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          needleSets={needleSets}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(newSet) => {
            setNeedleSets(prev => [newSet, ...prev])
            setAddModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`เพิ่มชุดเข็ม ${newSet.setId} (${newSet.needleModel}) สำเร็จแล้ว!`)
              }
            } catch {}

            // Log the opening stock so the ledger / "รับเข้าสะสม" KPI stay complete
            const openingQty = parseInt(newSet.quantity, 10) || 0
            if (openingQty > 0) {
              const openingLog = {
                id: `LOG-OPEN-${Date.now()}`,
                logId: `LOG-OPEN-${Date.now()}`,
                setId: newSet.setId,
                actionType: 'รับเข้า (Stock In)',
                movementType: 'IN',
                oldGrade: newSet.grade,
                newGrade: newSet.grade,
                conditionDetail: newSet.conditionDetail,
                quantity: openingQty,
                qtyChange: openingQty,
                balanceAfter: openingQty,
                dateAction: new Date().toISOString().slice(0, 10),
                technician: user?.full_name || user?.username || 'ผู้ดูแลสต็อก',
                remarks: `ตั้งต้นสต็อกชุดเข็มใหม่ ${newSet.setId}`,
                images: [],
                createdAt: new Date().toISOString(),
              }
              NeedleHistoryAPI.create(openingLog)
                .then(() => setHistoryLogs(prev => [openingLog, ...prev]))
                .catch((err) => console.warn('Stock opening log warning:', err))
            }
          }}
        />
      )}

      {/* 3. UPDATE GRADE / INSPECT MODAL */}
      {updateModalOpen && currentUpdateSet && (
        <UpdateGradeModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          currentSet={currentUpdateSet}
          comboboxStore={comboboxStore}
          onLearnValues={learnValues}
          onSuccess={(updatedSet, newLog) => {
            setNeedleSets(prev => prev.map(s => {
              const isMatch = (
                (s.setId && updatedSet.setId && s.setId === updatedSet.setId) ||
                (s.id && updatedSet.id && s.id === updatedSet.id) ||
                (s.Set_ID && updatedSet.setId && s.Set_ID === updatedSet.setId) ||
                (s.id && updatedSet.setId && s.id === updatedSet.setId) ||
                (s.setId && updatedSet.id && s.setId === updatedSet.id)
              )
              return isMatch ? updatedSet : s
            }))
            if (newLog) setHistoryLogs(prev => [newLog, ...prev])
            setUpdateModalOpen(false)
            try {
              if (toast && typeof toast.success === 'function') {
                toast.success(`อัปเดตเกรด/สภาพชุดเข็ม ${updatedSet.setId} สำเร็จแล้ว!`)
              }
            } catch {}
          }}
        />
      )}

      {/* 4. TIMELINE HISTORY MODAL */}
      {historyModalOpen && currentHistorySet && (
        <TimelineHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          currentSet={currentHistorySet}
          historyLogs={historyLogs.filter(l => l.setId === currentHistorySet.setId)}
          onViewImage={(imgs, title, sub) => {
            setGalleryImages(imgs)
            setGalleryTitle(title)
            setGallerySubtitle(sub)
            setActiveGalleryIndex(0)
            setGalleryZoom(1)
            setGalleryModalOpen(true)
          }}
        />
      )}

      {/* 5. IMAGE GALLERY & PAN/ZOOM MODAL */}
      {galleryModalOpen && (
        <ImageGalleryModal
          isOpen={galleryModalOpen}
          onClose={() => setGalleryModalOpen(false)}
          images={galleryImages}
          title={galleryTitle}
          subtitle={gallerySubtitle}
          activeIndex={activeGalleryIndex}
          setActiveIndex={setActiveGalleryIndex}
          zoom={galleryZoom}
          setZoom={setGalleryZoom}
          onOpenUpdate={() => {
            if (currentGallerySet) openUpdate(currentGallerySet)
          }}
        />
      )}

      {/* Mobile Floating Action Button (FAB) for Needle Stock */}
      {canAdd && (
        <button
          type="button"
          onClick={() => openStockModal(null)}
          className="btn-fab"
          title="ทำรายการสต็อกเข็ม"
          aria-label="ทำรายการสต็อกเข็ม"
        >
          <ArrowLeftRight size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
