import Modal from '../../components/ui/Modal'
import { AlertTriangle, QrCode, SwitchCamera } from 'lucide-react'

export function NeedleScannerModal({ scannerOpen, closeQrScanner, videoRef, canvasRef, cameraError, facingMode, toggleCameraFacing, handleQrImageUpload, t }) {
  return (
      <Modal
        open={scannerOpen}
        onClose={closeQrScanner}
        title="สแกน QR Code บนตัวกระบอก / เครื่องจักร"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                title="สลับกล้องหน้า/หลัง"
              >
                <SwitchCamera size={13} />
                <span>สลับกล้อง ({facingMode === 'environment' ? 'หลัง' : 'หน้า'})</span>
              </button>
            </div>
            <button type="button" className="btn-outline px-4" onClick={closeQrScanner}>
              ปิด
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {cameraError ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2 text-center">
              <AlertTriangle size={28} className="mx-auto" />
              <p className="font-bold">{cameraError}</p>
              <p className="text-[11px]">หรือเลือกอัปโหลดรูปภาพ QR Code ด้านล่างนี้แทน</p>
            </div>
          ) : (
            <div className="relative w-full aspect-square sm:aspect-video max-h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder overlay box */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-blue-400 rounded-3xl relative animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
                </div>
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="px-3 py-1 rounded-full bg-slate-900/80 text-white font-semibold text-[11px] backdrop-blur-md">
                  ส่องกล้องไปที่ QR Code บนกระบอก
                </span>
              </div>
            </div>
          )}

          {/* Upload QR file fallback */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-blue-600" />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">เลือกรูป QR จากแกลเลอรี</div>
                <div className="text-[11px] text-slate-500">กรณีไม่สะดวกเปิดกล้องถ่ายสด</div>
              </div>
            </div>
            <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
              <span>เลือกไฟล์รูป QR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Modal>
  )
}
