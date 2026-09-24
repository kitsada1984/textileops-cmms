/**
 * src/modules/media/mediaUploader.js
 * Deep module for Media Ingestion & Upload.
 * Encapsulates:
 * 1. iPhone HEIC/HEIF normalization to JPEG
 * 2. Canvas-based resizing and compression (ADR-0001 standard: max 1920px, 85% quality)
 * 3. Resilient Google Drive upload with multi-tier routing
 * 4. Transparent local Base64 fallback when offline or on upload failure
 */

import { normalizeImageFile } from '../../utils/imageFileProcessor'
import { uploadImageToGoogleDrive } from '../../utils/googleDriveUpload'

/**
 * Uploads a single media file (image/photo/document) to Google Drive
 * with automated HEIC conversion, compression, and optional offline fallback.
 * @param {File|Blob} file Raw file from file input or camera capture
 * @param {object} options Configuration options: { folderName, maxDimension, quality, fallbackToLocal }
 * @returns {Promise<{ imageUrl: string, url: string, dataUrl: string, fileId: string, folderId: string, source: 'drive'|'local', isLocalFallback?: boolean }>}
 */
export async function uploadMedia(file, options = {}) {
  if (!file) throw new Error('ไม่พบไฟล์รูป')

  const maxDimension = options.maxDimension || 1920
  const quality = options.quality || 0.85
  const folderName = options.folderName || ''
  const fallbackToLocal = Boolean(options.fallbackToLocal)

  let fileToUpload = file
  let localDataUrl = ''

  // 1. Client-side normalization (HEIC conversion + dimension downscaling)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const normalized = await normalizeImageFile(file, maxDimension, quality)
      if (normalized?.file) {
        fileToUpload = normalized.file
      }
      if (normalized?.dataUrl) {
        localDataUrl = normalized.dataUrl
      }
    } catch (normErr) {
      console.warn('[MediaUploader] Normalization warning, using raw file:', normErr)
    }
  }

  // 2. Upload to Google Drive with automated fallback
  try {
    const driveOptions = {
      folderName,
      maxDimension,
      quality,
    }
    if (options.fileName || options.filename) {
      driveOptions.fileName = options.fileName || options.filename
    }
    const uploadRes = await uploadImageToGoogleDrive(fileToUpload, driveOptions)
    const imageUrl = uploadRes.imageUrl || uploadRes.url || ''
    const returnVal = {
      imageUrl,
      url: imageUrl,
      fileId: uploadRes.fileId || '',
      folderId: uploadRes.folderId || '',
      dataUrl: localDataUrl,
      source: 'drive',
    }
    if (uploadRes.name || options.fileName || options.filename) {
      returnVal.name = uploadRes.name || options.fileName || options.filename
    }
    return returnVal
  } catch (err) {
    if (fallbackToLocal && localDataUrl) {
      console.warn('[MediaUploader] Drive upload failed, activating local Base64 fallback:', err)
      return {
        imageUrl: localDataUrl,
        url: localDataUrl,
        dataUrl: localDataUrl,
        fileId: '',
        folderId: '',
        source: 'local',
        isLocalFallback: true,
      }
    }
    throw err
  }
}

/**
 * Batch upload multiple media files sequentially or in parallel.
 * @param {Array<File|Blob>} files Array of raw files
 * @param {object} options Configuration options
 * @returns {Promise<Array<{ imageUrl: string, url: string, dataUrl: string, source: string }>>}
 */
export async function uploadMediaBatch(files, options = {}) {
  if (!Array.isArray(files) || files.length === 0) return []
  const results = []
  for (const f of files) {
    if (!f) continue
    const res = await uploadMedia(f, options)
    results.push(res)
  }
  return results
}
