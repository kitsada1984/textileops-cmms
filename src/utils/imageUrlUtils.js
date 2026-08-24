/**
 * Utility functions for handling image URLs and Google Drive links.
 */

export function getGoogleDriveFileId(url = '') {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // Match /file/d/FILE_ID
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1]

  // Match id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i)
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1]

  // Match googleusercontent.com/d/FILE_ID
  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
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
 * For Google Drive, generates thumbnail URLs that bypass viewer HTML pages.
 */
export function getDirectImageUrl(url = '', size = 'w1200') {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  const fileId = getGoogleDriveFileId(trimmed)
  if (fileId) {
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=' + size
  }
  return trimmed
}

/**
 * Returns fallback image URLs if the primary thumbnail URL fails.
 */
export function getImageFallbackUrls(url = '') {
  if (!url || typeof url !== 'string') return []
  const trimmed = url.trim()
  const fileId = getGoogleDriveFileId(trimmed)
  if (!fileId) return [trimmed]

  return [
    'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200',
    'https://lh3.googleusercontent.com/d/' + fileId + '=s1200',
    'https://lh3.googleusercontent.com/d/' + fileId,
    'https://drive.google.com/uc?export=view&id=' + fileId,
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