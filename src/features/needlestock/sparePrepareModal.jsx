import { createPortal } from 'react-dom'
import { StepPrepareSpareNeedle, StepAcknowledgeSpareNeedle } from '../../components/repair/SpareNeedleFlow'

export function SparePrepareModal({ prepareModalOpen, setPrepareModalOpen, selectedSpareReq, setSpareRequests, loadData, toast }) {
  return (
    <>
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
    </>
  )
}
