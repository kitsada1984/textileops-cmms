export const DESIGN_BOM_COVER_FOLDER = 'DesignBOM-ใบปะหน้า'
export const DESIGN_BOM_APP_FOLDER = 'DesignBOM-ใบApp'

export const COVER_NOTE_PREFIX = 'CoverImageUrl:'
export const APP_NOTE_PREFIX = 'AppImageUrl:'
export const LEGACY_NOTE_PREFIX = 'ImageUrl:'

export function extractCoverImageUrl(note = '') {
  const lines = String(note || '').split('\n')
  const coverLine = lines.find((item) => item.trim().startsWith(COVER_NOTE_PREFIX))
  if (coverLine) return coverLine.trim().slice(COVER_NOTE_PREFIX.length).trim()

  // Fallback to legacy ImageUrl: if CoverImageUrl: is not found
  const legacyLine = lines.find((item) => item.trim().startsWith(LEGACY_NOTE_PREFIX))
  return legacyLine?.trim().slice(LEGACY_NOTE_PREFIX.length).trim() || ''
}

export function extractAppImageUrl(note = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(APP_NOTE_PREFIX))
  return line?.trim().slice(APP_NOTE_PREFIX.length).trim() || ''
}

export function stripDesignImagesMeta(note = '') {
  return String(note || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return (
        !trimmed.startsWith(COVER_NOTE_PREFIX) &&
        !trimmed.startsWith(APP_NOTE_PREFIX) &&
        !trimmed.startsWith(LEGACY_NOTE_PREFIX)
      )
    })
    .join('\n')
    .trim()
}

export function getDesignCoverImageUrl(row = {}) {
  return row.CoverImageUrl || row.ImageUrl || extractCoverImageUrl(row.Comment) || ''
}

export function getDesignAppImageUrl(row = {}) {
  return row.AppImageUrl || extractAppImageUrl(row.Comment) || ''
}

export function appendDesignImagesMeta(comment = '', coverUrl = '', appUrl = '') {
  const cleanComment = stripDesignImagesMeta(comment)
  const metaLines = []
  if (coverUrl) metaLines.push(`${COVER_NOTE_PREFIX} ${coverUrl}`)
  if (appUrl) metaLines.push(`${APP_NOTE_PREFIX} ${appUrl}`)
  return [cleanComment, ...metaLines].filter(Boolean).join('\n')
}
