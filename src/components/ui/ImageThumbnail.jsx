import { useState, useEffect } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { getDirectImageUrl } from '../../utils/imageUrlUtils'
import { convertHeicDataUrlIfNeeded } from '../../utils/imageFileProcessor'

export default function ImageThumbnail({
  url,
  alt = 'Image',
  onClick,
  size = 32,
  className = '',
  showLabel = true,
}) {
  const [error, setError] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState('')

  useEffect(() => {
    let active = true
    const baseSrc = getDirectImageUrl(url, 'w160')
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
  }, [url])

  if (!url) {
    return <span className="text-slate-300 dark:text-slate-700 font-mono text-center block">—</span>
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        if (onClick) onClick(e)
      }}
      className={`inline-flex items-center gap-1.5 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm cursor-pointer transition-all group ${className}`}
      title="คลิกเพื่อดูรูปภาพตัวอย่าง"
    >
      <div
        style={{ width: size, height: size }}
        className="rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 relative border border-slate-200/60 dark:border-slate-700"
      >
        {!error && resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={alt}
            onError={() => setError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <ImageIcon size={14} className="text-blue-500" />
        )}
      </div>

      {showLabel && (
        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-0.5 pr-1">
          <span>ดูรูป</span>
        </span>
      )}
    </div>
  )
}