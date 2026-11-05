import { ArrowLeftRight } from 'lucide-react'
import { StockTransactionModal } from './StockTransactionModal.jsx'
import { AddNewNeedleSetModal, UpdateGradeModal, TimelineHistoryModal, ImageGalleryModal } from './needleSetModals.jsx'

export function NeedleInventoryModals({ stockModalOpen, setStockModalOpen, currentStockSet, needleSets, comboboxStore, learnValues, addModalOpen, setAddModalOpen, updateModalOpen, setUpdateModalOpen, currentUpdateSet, historyModalOpen, setHistoryModalOpen, currentHistorySet, galleryModalOpen, setGalleryModalOpen, galleryImages, openStockModal, activeGalleryIndex, setActiveGalleryIndex, currentGallerySet, galleryTitle, setGalleryTitle, gallerySubtitle, setGallerySubtitle, galleryZoom, setGalleryZoom, setGalleryImages, historyLogs, setHistoryLogs, setNeedleSets, NeedleHistoryAPI, openUpdate, canAdd, user, toast }) {
  return (
    <>
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
