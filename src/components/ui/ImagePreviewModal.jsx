import { useState, useEffect } from 'react'
import { ExternalLink, Copy, Check, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react'
import Modal from './Modal'
import { getDirectImageUrl, getFullResolutionImageUrl, getImageFallbackUrls, isGoogleDriveUrl } from '../../utils/imageUrlUtils'

export default function ImagePreviewModal({ open, onClose, url, title = 'รูปภาพ' }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  const fallbacks = getImageFallbackUrls(url)
  const currentSrc = fallbacks[fallbackIndex] || getDirectImageUrl(url, 'w1200')
  const fullResolutionUrl = getFullResolutionImageUrl(url)
  const isDrive = isGoogleDriveUrl(url)

  useEffect(() => {
    if (open) {
      setLoading(true)
      setError(false)
      setFallbackIndex(0)
      setCopied(false)
    }
  }, [open, url])

  const handleImageError = () => {
    if (fallbackIndex < fallbacks.length - 1) {
      setFallbackIndex((prev) => prev + 1)
    } else {
      setLoading(false)
      setError(true)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullResolutionUrl || url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="text-lg">🖼️</span>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100">{title}</span>
            <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
              {isDrive ? 'Google Drive Image Preview' : 'Image Preview'}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-center">
        {/* Main Image Container */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[280px] max-h-[68vh] shadow-inner">
          {/* Loading Spinner */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-400 z-10">
              <RefreshCw size={28} className="animate-spin text-blue-500" />
              <span className="text-xs font-medium">กำลังโหลดรูปภาพ...</span>
            </div>
          )}

          {/* Rendered Image */}
          {!error && currentSrc && (
            <img
              src={currentSrc}
              alt={title}
              onLoad={() => setLoading(false)}
              onError={handleImageError}
              className={`max-h-[65vh] w-auto max-w-full object-contain mx-auto transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            />
          )}

          {/* Error State */}
          {error && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3 max-w-md">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">ไม่สามารถโหลดพรีวิวรูปภาพโดยตรงได้</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  เนื่องจากติดสิทธิ์ความเป็นส่วนตัวของ Google Drive หรือไฟล์ไม่เปิดเป็นสาธารณะ
                </p>
              </div>
              <a
                href={fullResolutionUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs flex items-center gap-2 px-4 py-2 mt-2 shadow-lg shadow-blue-500/20"
              >
                <ExternalLink size={14} />
                <span>เปิดดูรูปใน Google Drive</span>
              </a>
            </div>
          )}
        </div>

        {/* Informational badge */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <span>💡</span>
          <span>กดปุ่ม <strong>"เปิดดูรูปความละเอียดสูง"</strong> เพื่อดูหรือซูมภาพแบบต้นฉบับ</span>
        </p>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <a
              href={fullResolutionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-all shadow-sm"
              title="เปิดดูรูปต้นฉบับความละเอียดสูง"
            >
              <ExternalLink size={13} />
              <span>เปิดดูรูปความละเอียดสูง (Full Size)</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              title="คัดลอกลิงก์รูปภาพ"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs px-5 py-2 rounded-xl"
          >
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  )
}