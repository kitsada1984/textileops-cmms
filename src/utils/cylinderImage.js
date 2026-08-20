const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const IMAGE_NOTE_RE = /ImageUrl:\s*(https?:\/\/.*?)(?=ImageUrl:|\r?\n|$)/gi

export function extractCylinderImageUrl(note = '') {
  const matches = [...String(note || '').matchAll(IMAGE_NOTE_RE)]
  return matches.at(-1)?.[1]?.trim() || ''
}

export function stripCylinderImageMeta(note = '') {
  return String(note || '')
    .replace(IMAGE_NOTE_RE, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join('\n')
    .trim()
}

export function getCylinderImageUrl(row = {}) {
  return row.ImageUrl || extractCylinderImageUrl(row.Comment) || ''
}

export function appendCylinderImageMeta(comment = '', imageUrl = '') {
  const cleanComment = stripCylinderImageMeta(comment)
  return [cleanComment, imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : '']
    .filter(Boolean)
    .join('\n')
}
