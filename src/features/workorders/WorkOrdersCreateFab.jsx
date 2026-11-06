import { Plus } from 'lucide-react'
import { createPortal } from 'react-dom'

// Mobile FAB moved verbatim from WorkOrders (props only).
export function WorkOrdersCreateFab({ currentTab, canAdd, setCreateModalOpen }) {
  return (
    <>
      {/* Mobile Floating Action Button (FAB) for Opening Work Order (Portaled to document.body to lock viewport position) */}
      {currentTab === 'records' && canAdd && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn-fab"
          title="เปิดใบสั่งงาน"
          aria-label="เปิดใบสั่งงาน"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>,
        document.body
      )}
    </>
  )
}
