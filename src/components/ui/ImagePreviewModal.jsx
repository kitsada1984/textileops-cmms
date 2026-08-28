import { useState, useEffect } from 'react'
import {
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Maximize2,
} from 'lucide-react'
import Modal from './Modal'
import {
  getDirectImageUrl,
  getFullResolutionImageUrl,
  getImageFallbackUrls,
  isGoogleDriveUrl,
  getGoogleDriveFileId,
} from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../utils/imageFileProcessor'

export default function ImagePreviewModal({ open, onClose, url, title = 'รูปภาพ' }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [useIframe, setUseIframe] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState('')

  const fallbacks = getImageFallbackUrls(url)
  const currentSrc = fallbacks[fallbackIndex] || getDirectImageUrl(url, 'w1200')
  const fullResolutionUrl = getFullResolutionImageUrl(url)
  const isDrive = isGoogleDriveUrl(url)
  const fileId = getGoogleDriveFileId(url)
  const drivePreviewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : ''

  useEffect(() => {
    if (open) {
      setLoading(true)
      setError(false)
      setFallbackIndex(0)
      setCopied(false)
      setUseIframe(false)
    }
  }, [open, url])

  useEffect(() => {
    let active = true
    if (!currentSrc) {
      setResolvedSrc('')
      return
    }

    if (currentSrc.startsWith('data:image/heic') || currentSrc.startsWith('data:image/heif')) {
      convertHeicDataUrlIfNeeded(currentSrc).then((converted) => {
        if (active) setResolvedSrc(converted)
      })
    } else {
      setResolvedSrc(currentSrc)
    }

    return () => {
      active = false
    }
  }, [currentSrc])

  const handleImageError = () => {
    if (fallbackIndex < fallbacks.length - 1) {
      setFallbackIndex((prev) => prev + 1)
    } else if (isDrive && drivePreviewUrl) {
      // Direct image failed, automatically switch to embedded Google Drive preview
      setUseIframe(true)
      setLoading(false)
      setError(false)
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
      size="xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100">{title}</span>
              <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                {isDrive ? 'Google Drive Image' : 'Image Preview'}
              </span>
            </div>
          </div>

          {/* Mode Switcher if Google Drive */}
          {isDrive && drivePreviewUrl && (
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => {
                  setUseIframe(false)
                  setError(false)
                  setLoading(true)
                  setFallbackIndex(0)
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                  !useIframe
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ImageIcon size={12} />
                <span>ภาพตรง</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseIframe(true)
                  setError(false)
                  setLoading(false)
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                  useIframe
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText size={12} />
                <span>Drive Viewer</span>
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-3.5 text-center">
        {/* Main Image or Iframe Container */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[320px] max-h-[72vh] shadow-inner">
          {/* Loading Spinner */}
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-400 z-10">
              <RefreshCw size={28} className="animate-spin text-blue-500" />
              <span className="text-xs font-medium">กำลังโหลดรูปภาพ...</span>
            </div>
          )}

          {/* Mode 1: Embedded Iframe (Google Drive Viewer) */}
          {useIframe && drivePreviewUrl ? (
            <iframe
              src={drivePreviewUrl}
              title={title}
              className="w-full h-[65vh] border-0 bg-slate-900 rounded-xl"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={() => setLoading(false)}
            />
          ) : (
            /* Mode 2: Direct Image Tag */
            !error && resolvedSrc && (
              <img
                src={resolvedSrc}
                alt={title}
                onLoad={() => setLoading(false)}
                onError={handleImageError}
                className={`max-h-[68vh] w-auto max-w-full object-contain mx-auto transition-opacity duration-300 ${
                  loading ? 'opacity-0' : 'opacity-100'
                }`}
              />
            )
          )}

          {/* Mode 3: Fallback Error Box */}
          {error && !useIframe && (
            <div className="p-8 flex flex-col items-center justify-center text-center gap-3 max-w-md">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <ImageIcon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">เปิดดูรูปภาพผ่าน Google Drive</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  คลิกปุ่มด้านล่างเพื่อเปิดดูภาพหรือสลับไปที่ Drive Viewer
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {isDrive && drivePreviewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseIframe(true)
                      setError(false)
                      setLoading(false)
                    }}
                    className="btn-outline text-xs px-3.5 py-2 flex items-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>ใช้ Drive Viewer ในหน้านี้</span>
                  </button>
                )}
                <a
                  href={fullResolutionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 shadow-lg shadow-blue-500/20"
                >
                  <ExternalLink size={13} />
                  <span>เปิดดูใน Google Drive</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Informational tip */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <span>💡</span>
          <span>กดปุ่ม <strong>"เปิดดูรูปความละเอียดสูง"</strong> เพื่อเปิดภาพต้นฉบับในแท็บใหม่</span>
        </p>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <a
              href={fullResolutionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-all shadow-xs"
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