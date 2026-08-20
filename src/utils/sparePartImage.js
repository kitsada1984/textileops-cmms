import { parseEmbedding } from './imageSearch'

const IMAGE_NOTE_PREFIX = 'ImageUrl:'
const IMAGE_FINGERPRINT_NOTE_PREFIX = 'ImageFingerprint:'
const IMAGE_EMBEDDING_NOTE_PREFIX = 'ImageEmbedding:'
const HIDDEN_IMAGE_NOTE_PREFIXES = [
  IMAGE_NOTE_PREFIX,
  IMAGE_FINGERPRINT_NOTE_PREFIX,
  IMAGE_EMBEDDING_NOTE_PREFIX,
]

function extractHiddenValue(note = '', prefix = '') {
  const line = String(note || '').split('\n').find((item) => item.trim().startsWith(prefix))
  return line?.trim().slice(prefix.length).trim() || ''
}

export function stripSparePartImageMeta(remark = '') {
  return String(remark || '')
    .split('\n')
    .filter((line) => !HIDDEN_IMAGE_NOTE_PREFIXES.some((prefix) => line.trim().startsWith(prefix)))
    .join('\n')
    .trim()
}

export function appendSparePartImageMeta(remark = '', { imageUrl = '', fingerprint = '', embedding = [] } = {}) {
  const cleanRemark = stripSparePartImageMeta(remark)
  const embeddingText = Array.isArray(embedding) && embedding.length > 0 ? JSON.stringify(embedding) : ''
  return [
    cleanRemark,
    imageUrl ? `${IMAGE_NOTE_PREFIX} ${imageUrl}` : '',
    fingerprint ? `${IMAGE_FINGERPRINT_NOTE_PREFIX} ${fingerprint}` : '',
    embeddingText ? `${IMAGE_EMBEDDING_NOTE_PREFIX} ${embeddingText}` : '',
  ].filter(Boolean).join('\n')
}

export function getSparePartImageUrl(row = {}) {
  return row.ImageUrl || extractHiddenValue(row.Remark, IMAGE_NOTE_PREFIX) || ''
}

export function getSparePartImageFingerprint(row = {}) {
  return row.ImageFingerprint || extractHiddenValue(row.Remark, IMAGE_FINGERPRINT_NOTE_PREFIX) || ''
}

export function getSparePartImageEmbedding(row = {}) {
  return row.ImageEmbedding || extractHiddenValue(row.Remark, IMAGE_EMBEDDING_NOTE_PREFIX) || []
}

export function buildSparePartImagePayload(form = {}) {
  const imageMeta = {
    imageUrl: getSparePartImageUrl(form),
    fingerprint: getSparePartImageFingerprint(form),
    embedding: parseEmbedding(getSparePartImageEmbedding(form)),
  }
  return {
    ...form,
    Remark: appendSparePartImageMeta(form.Remark, imageMeta),
  }
}

export function preserveRemarkWithSparePartImageMeta(remark = '', form = {}) {
  return appendSparePartImageMeta(remark, {
    imageUrl: getSparePartImageUrl(form),
    fingerprint: getSparePartImageFingerprint(form),
    embedding: parseEmbedding(getSparePartImageEmbedding(form)),
  })
}

export function mergeImageMetaIntoSparePart(part = {}, {
  imageUrl = '',
  fingerprint = '',
  embedding = [],
} = {}) {
  const nextImageUrl = part.ImageUrl || getSparePartImageUrl(part) || imageUrl
  const nextFingerprint = part.ImageFingerprint || getSparePartImageFingerprint(part) || fingerprint
  const nextEmbedding = parseEmbedding(part.ImageEmbedding || getSparePartImageEmbedding(part)).length
    ? parseEmbedding(part.ImageEmbedding || getSparePartImageEmbedding(part))
    : parseEmbedding(embedding)

  return {
    ...part,
    ImageUrl: nextImageUrl,
    ImageFingerprint: nextFingerprint,
    ImageEmbedding: nextEmbedding,
    Remark: appendSparePartImageMeta(part.Remark, {
      imageUrl: nextImageUrl,
      fingerprint: nextFingerprint,
      embedding: nextEmbedding,
    }),
  }
}
