const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwRwXwdCgnFZ6CU7L1IxK7aLD7K4VX_L-w4UD1LkyO5bICzhhRAHZpxN7OlJWxdmWdG/exec'
const DRIVE_UPLOAD_WEBHOOK = import.meta.env.VITE_DRIVE_UPLOAD_WEBHOOK || '/api/drive-upload'
let uploadConfigPromise = null

async function compressImageInBrowser(file, options = {}) {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof document === 'undefined') return null
  const { normalizeImageFile } = await import('./imageFileProcessor')
  return normalizeImageFile(file, options.maxDimension || 1600, options.quality || 0.82)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

async function getUploadConfig() {
  if (DRIVE_UPLOAD_WEBHOOK !== '/api/drive-upload') {
    return { ok: true, provider: 'external-webhook' }
  }

  if (!uploadConfigPromise) {
    uploadConfigPromise = fetch('/api/drive-upload', { method: 'GET' })
      .then((res) => res.json().catch(() => ({})))
      .catch(() => ({}))
  }

  return uploadConfigPromise
}

export function __resetGoogleDriveUploadCache() {
  uploadConfigPromise = null
}

export async function uploadImageToGoogleDrive(file, options = {}) {
  if (!file) throw new Error('ไม่พบไฟล์รูป')

  let processedFile = file
  let processedBase64 = null

  // In browser runtime (skip in test environment), auto-compress large images or iPhone HEIC/HEIF
  const isTestEnv = Boolean(import.meta.env?.TEST || (typeof process !== 'undefined' && process.env?.VITEST))
  const fileName = (file.name || '').toLowerCase()
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')
  const isLarge = file.size > 200 * 1024

  if (!isTestEnv && typeof window !== 'undefined' && typeof document !== 'undefined' && (isLarge || isHeic)) {
    try {
      const normalized = await Promise.race([
        compressImageInBrowser(file, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ])
      if (normalized?.file) {
        processedFile = normalized.file
        if (normalized.dataUrl && normalized.dataUrl.includes(',')) {
          processedBase64 = normalized.dataUrl.split(',')[1]
        }
      }
    } catch (e) {
      console.warn('Auto compression bypassed:', e)
    }
  }

  const base64 = processedBase64 || (await fileToBase64(processedFile))
  const folderName = String(options.folderName || '').trim()

  const config = await getUploadConfig()
  if (config?.ok && config?.provider === 'unconfigured') {
    throw new Error(
      'Google Drive upload ยังไม่ได้ตั้งค่า: กรุณาใส่ GOOGLE_DRIVE_UPLOAD_WEBHOOK ' +
      'หรือ GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_DRIVE_FOLDER_ID'
    )
  }

  const payload = {
    filename: processedFile.name || file.name,
    mimeType: processedFile.type || file.type || 'image/jpeg',
    base64,
    ...(folderName ? { folderName } : {}),
  }

  // Vercel Serverless Function has a hard 4.5MB payload limit. If base64 > 3.5MB, post directly to Apps Script Webhook
  const isOversizedForVercel = base64.length > 3.5 * 1024 * 1024
  let targetUrl = isOversizedForVercel ? DEFAULT_WEBHOOK_URL : DRIVE_UPLOAD_WEBHOOK

  let res = null
  let networkError = null

  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    networkError = err
  }

  // Automatic multi-tier fallback:
  // If targetUrl was /api/drive-upload and it failed (network error, status 413, or 5xx server error),
  // retry directly with Google Apps Script Webhook which supports CORS & larger payloads
  const shouldRetryWithDirectWebhook =
    targetUrl === '/api/drive-upload' &&
    (!res || res.status === 413 || res.status >= 500)

  if (shouldRetryWithDirectWebhook) {
    console.warn('POST /api/drive-upload failed or hit payload limit, retrying directly with Google Apps Script Webhook...')
    try {
      const fallbackRes = await fetch(DEFAULT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (fallbackRes.ok) {
        res = fallbackRes
        networkError = null
      }
    } catch (fbErr) {
      console.warn('Fallback to direct Apps Script Webhook also failed:', fbErr)
      if (!networkError) networkError = fbErr
    }
  }

  if (!res && networkError) {
    throw new Error(`การเชื่อมต่อล้มเหลว: ${networkError.message || 'Network error'}`)
  }

  const json = await res?.json().catch(() => ({}))
  if (!res?.ok || json?.ok === false) {
    if (res?.status === 413) {
      throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินขีดจำกัด กรุณาลดขนาดภาพหรือลองใหม่อีกครั้ง')
    }
    throw new Error(json?.error || 'อัปโหลด Google Drive ไม่สำเร็จ')
  }

  const imageUrl = json?.webViewLink || json?.webContentLink || json?.url || ''
  if (!imageUrl) throw new Error('Webhook ไม่ได้ส่งลิงก์ไฟล์กลับมา')

  return {
    imageUrl,
    fileId: json?.fileId || json?.id || '',
    folderId: json?.folderId || '',
  }
}

// Re-exported from deep media module
export { uploadMedia, uploadMediaBatch } from '../modules/media/mediaUploader'

