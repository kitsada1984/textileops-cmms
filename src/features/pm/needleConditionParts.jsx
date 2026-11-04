import { useState, useEffect } from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import { getDirectImageUrl, getImageFallbackUrls } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../modules/media'

export const NEEDLE_IMAGE_FOLDER = 'สภาพเข็ม'

export const normalizeSerial = (val = '') =>
  String(val || '').toUpperCase().replace(/\s+/g, '').trim()

export const normalizeMachine = (val = '') =>
  String(val || '').toUpperCase().replace(/\s+/g, '').replace(/-/g, '').trim()

export function FormPhotoCard({ url, onRemove, onPreview, index }) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [error, setError] = useState(false)
  const [fallbackIndex, setFallbackIndex] = useState(0)

  const fallbacks = getImageFallbackUrls(url, 'w600')
  const currentSrc = fallbacks[fallbackIndex] || getDirectImageUrl(url, 'w400')

  useEffect(() => {
    setError(false)
    setFallbackIndex(0)
  }, [url])

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
      const next = fallbackIndex + 1
      setFallbackIndex(next)
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
          alt={`Needle condition ${index}`}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
          onClick={onPreview}
          onError={handleImageError}
        />
      ) : (
        <div
          onClick={onPreview}
          className="flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-blue-500 transition-colors p-2 text-center"
        >
          <ImageIcon size={22} className="text-blue-500" />
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">คลิกดูรูป</span>
        </div>
      )}

      {/* Delete button */}
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
    </div>
  )
}

