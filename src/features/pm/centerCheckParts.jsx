import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { getDirectImageUrl, getImageFallbackUrls } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../modules/media'

export const CENTER_CHECK_IMAGE_FOLDER = 'ประวัติเช็คศูนย์'

export const NEEDLE_COND_OPTIONS = [
  'สึกเล็กน้อย',
  'สึกปานกลาง',
  'สึกมาก',
  'สึกมาก(ควรเปลี่ยน)',
  'ระบุเอง',
]
export const STANDARD_NEEDLE_CONDS = ['สึกเล็กน้อย', 'สึกปานกลาง', 'สึกมาก', 'สึกมาก(ควรเปลี่ยน)']

export function CenterCheckPhotoCard({ url, index, onRemove, onPreview }) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [error, setError] = useState(false)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  const rawUrl = typeof url === 'object' && url !== null ? (url.url || url.localUrl || url.src) : url
  const fallbacks = useMemo(() => getImageFallbackUrls(rawUrl), [rawUrl])

  useEffect(() => {
    let active = true
    setError(false)
    setFallbackIdx(0)
    const baseSrc = getDirectImageUrl(rawUrl, 'w800')
    if (!baseSrc) {
      setResolvedSrc('')
      return
    }
    if (baseSrc.startsWith('data:image/heic') || baseSrc.startsWith('data:image/heif')) {
      convertHeicDataUrlIfNeeded(baseSrc).then((converted) => {
        if (active) setResolvedSrc(converted)
      })
    } else {
      setResolvedSrc(baseSrc)
    }
    return () => {
      active = false
    }
  }, [rawUrl])

  const handleImgError = () => {
    if (fallbackIdx < fallbacks.length - 1) {
      const next = fallbackIdx + 1
      setFallbackIdx(next)
      setResolvedSrc(fallbacks[next])
    } else {
      setError(true)
    }
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
      {!error && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={`Needle condition ${index + 1}`}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={onPreview}
          onError={handleImgError}
          loading="lazy"
        />
      ) : (
        <div
          onClick={onPreview}
          className="flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-blue-500 transition-colors p-2 text-center w-full h-full bg-slate-50 dark:bg-slate-800/80"
        >
          <ImageIcon size={22} className="text-blue-500" />
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">คลิกดูรูปภาพ</span>
          {rawUrl && typeof rawUrl === 'string' && rawUrl.includes('drive.google.com') && (
            <span className="text-[9px] text-slate-400">Google Drive</span>
          )}
        </div>
      )}

      {/* Delete button */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          title="ลบรูปนี้"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
