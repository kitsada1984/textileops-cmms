/**
 * Utility functions for handling image URLs and Google Drive links.
 */

export function getGoogleDriveFileId(url = '') {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // Match /file/d/FILE_ID or /file/u/0/d/FILE_ID (multi-account)
  const fileDMatch = trimmed.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i)
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1]

  // Match id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i)
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1]

  // Match googleusercontent.com/d/FILE_ID
  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i)
  if (lh3Match && lh3Match[1]) return lh3Match[1]

  // Match drive.google.com/open?id=FILE_ID
  const openMatch = trimmed.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/i)
  if (openMatch && openMatch[1]) return openMatch[1]

  return null
}

export function isGoogleDriveUrl(url = '') {
  return Boolean(getGoogleDriveFileId(url))
}

/**
 * Returns a direct image URL suitable for <img> tags.
 * For Google Drive, uses lh3.googleusercontent.com CDN which supports direct image rendering without auth blocks.
 */
export function getDirectImageUrl(url = '', size = 'w1200') {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  const fileId = getGoogleDriveFileId(trimmed)
  if (fileId) {
    const sParam = size.startsWith('w') ? 's' + size.slice(1) : (size.startsWith('s') ? size : 's800')
    return `https://lh3.googleusercontent.com/d/${fileId}=${sParam}`
  }
  return trimmed
}

/**
 * Returns fallback image URLs if the primary thumbnail URL fails.
 */
export function getImageFallbackUrls(url = '', size = 'w800') {
  if (!url || typeof url !== 'string') return []
  const trimmed = url.trim()
  const fileId = getGoogleDriveFileId(trimmed)
  if (!fileId) return [trimmed]

  const sParam = size.startsWith('w') ? 's' + size.slice(1) : (size.startsWith('s') ? size : 's800')
  const szParam = size.startsWith('s') ? 'w' + size.slice(1) : (size.startsWith('w') ? size : 'w800')

  return [
    `https://lh3.googleusercontent.com/d/${fileId}=${sParam}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=${szParam}`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/file/d/${fileId}/view`,
  ]
}

/**
 * Returns the full-resolution URL for opening in a new tab.
 */
export function getFullResolutionImageUrl(url = '') {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  const fileId = getGoogleDriveFileId(trimmed)
  if (fileId) {
    return 'https://drive.google.com/file/d/' + fileId + '/view'
  }
  return trimmed
}