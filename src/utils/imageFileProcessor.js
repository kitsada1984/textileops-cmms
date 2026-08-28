import heic2any from 'heic2any'

/**
 * Normalizes and compresses any image file (including iPhone HEIC/HEIF)
 * to standard JPEG/PNG before uploading or saving.
 */
export async function normalizeImageFile(file, maxDimension = 1920, quality = 0.85) {
  if (!file) return null

  let targetBlob = file
  const fileName = (file.name || '').toLowerCase()
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')

  // 1. Convert HEIC to JPEG Blob if needed
  if (isHeic) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: quality,
      })
      targetBlob = Array.isArray(converted) ? converted[0] : converted
    } catch (e) {
      console.warn('heic2any conversion error:', e)
    }
  }

  // 2. Load into HTML Image & Canvas for auto-orient and resizing
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Downscale if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const outputMime = targetBlob.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const base64DataUrl = canvas.toDataURL(outputMime, quality)

        canvas.toBlob(
          (blob) => {
            const finalFile = new File(
              [blob || targetBlob],
              fileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
              { type: outputMime }
            )
            resolve({
              file: finalFile,
              dataUrl: base64DataUrl,
              width,
              height,
            })
          },
          outputMime,
          quality
        )
      }
      img.onerror = () => {
        resolve({
          file: targetBlob,
          dataUrl: e.target.result,
        })
      }
      img.src = e.target.result
    }
    reader.onerror = () => resolve({ file: targetBlob, dataUrl: '' })
    reader.readAsDataURL(targetBlob)
  })
}

/**
 * Cache for HEIC data URLs converted on the fly in the browser
 */
const heicConvertedCache = new Map()

export async function convertHeicDataUrlIfNeeded(srcUrl = '') {
  if (!srcUrl || typeof srcUrl !== 'string') return srcUrl
  if (!srcUrl.startsWith('data:image/heic') && !srcUrl.startsWith('data:image/heif')) {
    return srcUrl
  }

  if (heicConvertedCache.has(srcUrl)) {
    return heicConvertedCache.get(srcUrl)
  }

  try {
    const res = await fetch(srcUrl)
    const blob = await res.blob()
    const converted = await heic2any({
      blob,
      toType: 'image/jpeg',
      quality: 0.85,
    })
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted
    const jpegUrl = URL.createObjectURL(jpegBlob)
    heicConvertedCache.set(srcUrl, jpegUrl)
    return jpegUrl
  } catch (e) {
    console.warn('Failed to convert HEIC data URL:', e)
    return srcUrl
  }
}
