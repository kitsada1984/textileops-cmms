// src/utils/imageSearch.js
// Visual Product Search / Reverse Image Search Engine with Image Embedding & Vector Search
import jsQR from 'jsqr'
import { getDirectImageUrl } from './imageUrlUtils'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const VISION_MODEL = import.meta.env.VITE_OPENAI_VISION_MODEL || 'gpt-4.1-mini'
const EMBED_MODEL = import.meta.env.VITE_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'

function getOpenAIKey() {
  return import.meta.env.VITE_OPENAI_API_KEY || ''
}

async function callOpenAI(path, body) {
  const apiKey = getOpenAIKey()
  if (!apiKey) throw new Error('ยังไม่ได้ตั้งค่า VITE_OPENAI_API_KEY')

  const res = await fetch(`${OPENAI_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || 'OpenAI API error')
  return json
}

async function imageUrlToFingerprint(imageUrl) {
  const json = await callOpenAI('/responses', {
    model: VISION_MODEL,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: 'สรุปรายละเอียดภาพสินค้า/เอกสารนี้เป็นไทยสั้นๆ เพื่อใช้ค้นหาความคล้าย โดยเน้นวัตถุ, สี, โลโก้, ตัวอักษร, หมายเลข, บริบท' },
        { type: 'input_image', image_url: imageUrl },
      ],
    }],
    max_output_tokens: 180,
  })
  return (json.output_text || '').trim()
}

async function textToEmbedding(text) {
  const json = await callOpenAI('/embeddings', {
    model: EMBED_MODEL,
    input: text,
  })
  return json?.data?.[0]?.embedding || []
}

export async function buildImageEmbeddingByUrl(imageUrl) {
  const fingerprint = await imageUrlToFingerprint(imageUrl)
  const embedding = await textToEmbedding(fingerprint || imageUrl)
  return { fingerprint, embedding }
}

/**
 * Computes Cosine Similarity between two numerical vectors.
 * Returns a value between -1.0 and 1.0 (or 0 for empty/invalid vectors).
 */
export function cosineSimilarity(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i += 1) {
    const x = Number(a[i]) || 0
    const y = Number(b[i]) || 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export function parseEmbedding(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

// ─── High-Dimensional Visual Feature Extraction (128-D Vector) ───

function rgbToHsv(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (max !== min) {
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h /= 6
  }
  return [h, s, v]
}

/**
 * Converts raw pixel data (ImageData or { data, width, height }) into an
 * L2-normalized 128-dimensional Image Embedding Vector.
 *
 * Vector Dimensions:
 * - D000 - D063 (64-D): Spatial Grid Energy (8x8 blocks of luminance & gradient)
 * - D064 - D111 (48-D): Color & Chrominance Distribution (24 Hue bins, 12 Sat, 12 Val)
 * - D112 - D127 (16-D): Global Geometric Moments, Contrast, and Edge Densities
 */
export function extractVectorFromImageData(imageData) {
  const { data, width, height } = imageData
  const vector = new Float64Array(128)

  if (!data || width <= 0 || height <= 0) {
    return Array.from(vector)
  }

  const totalPixels = width * height
  let sumLuminance = 0
  let sumSqLuminance = 0
  let edgeCount = 0

  // 1) Hue, Saturation, Value histograms (48 bins)
  // Hue: 24 bins (indices 64..87), Sat: 12 bins (indices 88..99), Val: 12 bins (indices 100..111)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    sumLuminance += lum
    sumSqLuminance += lum * lum

    const [h, s, v] = rgbToHsv(r, g, b)
    const hBin = Math.min(23, Math.floor(h * 24))
    const sBin = Math.min(11, Math.floor(s * 12))
    const vBin = Math.min(11, Math.floor(v * 12))

    vector[64 + hBin] += 1
    vector[88 + sBin] += 1
    vector[100 + vBin] += 1
  }

  // Normalize histogram bins by total pixels
  for (let i = 64; i < 112; i += 1) {
    vector[i] /= totalPixels
  }

  // 2) Spatial 8x8 Grid Luminance & Gradient (64 bins: indices 0..63)
  const blockW = width / 8
  const blockH = height / 8
  const blockCounts = new Uint32Array(64)

  for (let y = 0; y < height; y += 1) {
    const by = Math.min(7, Math.floor(y / blockH))
    for (let x = 0; x < width; x += 1) {
      const bx = Math.min(7, Math.floor(x / blockW))
      const blockIdx = by * 8 + bx
      const idx = (y * width + x) * 4

      const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
      vector[blockIdx] += lum
      blockCounts[blockIdx] += 1

      // Approximate edge detection
      if (x < width - 1 && y < height - 1) {
        const nextXIdx = (y * width + (x + 1)) * 4
        const nextYIdx = ((y + 1) * width + x) * 4
        const lumX = (0.299 * data[nextXIdx] + 0.587 * data[nextXIdx + 1] + 0.114 * data[nextXIdx + 2]) / 255
        const lumY = (0.299 * data[nextYIdx] + 0.587 * data[nextYIdx + 1] + 0.114 * data[nextYIdx + 2]) / 255
        const grad = Math.abs(lum - lumX) + Math.abs(lum - lumY)
        if (grad > 0.15) edgeCount += 1
      }
    }
  }

  for (let i = 0; i < 64; i += 1) {
    if (blockCounts[i] > 0) {
      vector[i] /= blockCounts[i]
    }
  }

  // 3) Global Geometric Moments & Surface Properties (16 bins: indices 112..127)
  const meanLum = sumLuminance / totalPixels / 255
  const varianceLum = Math.sqrt(Math.max(0, sumSqLuminance / totalPixels - Math.pow(sumLuminance / totalPixels, 2))) / 255
  const edgeDensity = edgeCount / totalPixels

  const aspect = Math.min(3, Math.max(0.33, width / height)) / 3

  vector[112] = meanLum
  vector[113] = varianceLum
  vector[114] = edgeDensity
  vector[115] = aspect

  // 4 Quadrant distribution
  const q1 = (vector[0] + vector[1] + vector[8] + vector[9]) / 4
  const q2 = (vector[6] + vector[7] + vector[14] + vector[15]) / 4
  const q3 = (vector[48] + vector[49] + vector[56] + vector[57]) / 4
  const q4 = (vector[54] + vector[55] + vector[62] + vector[63]) / 4

  vector[116] = q1
  vector[117] = q2
  vector[118] = q3
  vector[119] = q4

  // Symmetry (Horizontal & Vertical)
  let horizDiff = 0
  let vertDiff = 0
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      horizDiff += Math.abs(vector[row * 8 + col] - vector[row * 8 + (7 - col)])
    }
  }
  for (let col = 0; col < 8; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      vertDiff += Math.abs(vector[row * 8 + col] - vector[(7 - row) * 8 + col])
    }
  }

  vector[120] = 1 - Math.min(1, horizDiff / 32)
  vector[121] = 1 - Math.min(1, vertDiff / 32)
  vector[122] = Math.abs(q1 - q4)
  vector[123] = Math.abs(q2 - q3)
  vector[124] = vector[64] // Red dominance
  vector[125] = vector[72] // Green dominance
  vector[126] = vector[80] // Blue dominance
  vector[127] = Math.min(1, edgeDensity * 3)

  // 4) L2 Normalization
  let sumSquares = 0
  for (let i = 0; i < 128; i += 1) {
    sumSquares += vector[i] * vector[i]
  }
  const l2Norm = Math.sqrt(sumSquares) || 1
  for (let i = 0; i < 128; i += 1) {
    vector[i] = Number((vector[i] / l2Norm).toFixed(6))
  }

  return Array.from(vector)
}

/**
 * Loads an image from a URL, Blob, File, or Image Element and draws onto a
 * normalized 64x64 Canvas to extract pixel data.
 */
export async function loadPixelsFromImageSource(imageSource) {
  if (!imageSource) throw new Error('Missing imageSource')

  // Direct pixel buffer support (for unit tests / node environment)
  if (typeof imageSource === 'object' && imageSource.data && imageSource.width && imageSource.height) {
    return imageSource
  }

  // In browser environment
  if (typeof document === 'undefined') {
    throw new Error('Canvas requires browser environment or mock ImageData')
  }

  let srcUrl = ''
  let needRevoke = false

  if (typeof imageSource === 'string') {
    srcUrl = getDirectImageUrl(imageSource, 'w200')
  } else if (imageSource instanceof Blob || imageSource instanceof File) {
    srcUrl = URL.createObjectURL(imageSource)
    needRevoke = true
  } else if (imageSource.src) {
    srcUrl = imageSource.src
  }

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(new Error(`Failed to load image: ${err?.message || 'Network/CORS error'}`))
      img.src = srcUrl
    })

    const canvas = document.createElement('canvas')
    const TARGET_SIZE = 64
    canvas.width = TARGET_SIZE
    canvas.height = TARGET_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, TARGET_SIZE, TARGET_SIZE)
    return ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE)
  } finally {
    if (needRevoke && srcUrl) {
      URL.revokeObjectURL(srcUrl)
    }
  }
}

/**
 * Computes a 128-dimensional L2-normalized image embedding from an image source.
 */
export async function computeImageEmbedding(imageSource) {
  const pixels = await loadPixelsFromImageSource(imageSource)
  return extractVectorFromImageData(pixels)
}

/**
 * Scans an image for QR codes / Barcodes using jsQR.
 * Returns text payload if found, or null.
 */
export async function scanQrFromImage(imageSource) {
  try {
    const pixels = await loadPixelsFromImageSource(imageSource)
    if (!pixels || !jsQR) return null
    const result = jsQR(pixels.data, pixels.width, pixels.height, {
      inversionAttempts: 'attemptBoth',
    })
    return result?.data ? String(result.data).trim() : null
  } catch {
    return null
  }
}

// ─── Vector Nearest Neighbor Search ──────────────────────────

/**
 * Performs Nearest Neighbor Vector Search using Cosine Similarity.
 *
 * @param {Array<number>} queryVector - The 128-D vector of the searched photo
 * @param {Array<Object>} candidates - List of candidate items with pre-computed vectors: [{ id, vector, ...item }]
 * @param {Object} options - Search options { topK = 5, minSimilarity = 0.3 }
 * @returns {Array<Object>} Ranked results sorted by similarity descending
 */
export function vectorSearch(queryVector, candidates = [], { topK = 5, minSimilarity = 0.3 } = {}) {
  if (!Array.isArray(queryVector) || queryVector.length === 0 || !Array.isArray(candidates)) {
    return []
  }

  const scored = candidates
    .filter((c) => Array.isArray(c?.vector) && c.vector.length > 0)
    .map((candidate) => {
      const sim = cosineSimilarity(queryVector, candidate.vector)
      // Map cosine similarity to percentage (calibrated scale)
      const percent = Math.round(Math.max(0, Math.min(100, Math.pow(Math.max(0, sim), 1.2) * 100)))
      return {
        ...candidate,
        similarity: sim,
        percent,
      }
    })
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)

  return scored.slice(0, topK)
}

// In-memory embedding cache for spare parts to avoid repeated computations
const vectorCache = new Map()

export function clearVectorCache() {
  vectorCache.clear()
}

/**
 * End-to-end Visual Spare Part Search:
 * 1. Computes query vector from taken photo
 * 2. Checks for QR code
 * 3. Compares against spare parts catalogue
 * 4. Returns Best Match, Alternative Candidates, Latency, and Vector details
 */
export async function searchSimilarSparePartsByImage(queryImageSource, sparePartsList = [], options = {}) {
  const startTime = performance.now()

  // 1. Compute query vector
  const queryVector = await computeImageEmbedding(queryImageSource)

  // 2. Scan QR code (bonus instant match)
  const qrCode = await scanQrFromImage(queryImageSource)

  // 3. Filter parts with images
  const partsWithImages = (sparePartsList || []).filter((p) => {
    const url = p?.ImageUrl || (typeof p?.Remark === 'string' && p.Remark.includes('ImageUrl:'))
    return Boolean(url)
  })

  // 4. Compute / fetch embeddings for candidate parts
  const candidateVectors = []
  for (const part of partsWithImages) {
    const partId = part._id || part.id || part.Part_Code
    const imgUrl = part.ImageUrl || getDirectImageUrl(part.Remark || '')

    let vector = vectorCache.get(partId)
    if (!vector && imgUrl) {
      try {
        vector = await computeImageEmbedding(imgUrl)
        vectorCache.set(partId, vector)
      } catch {
        // Skip failed image load
      }
    }

    if (vector) {
      candidateVectors.push({
        part,
        id: partId,
        vector,
      })
    }
  }

  // 5. Run Vector Search
  const ranked = vectorSearch(queryVector, candidateVectors, {
    topK: options.topK || 5,
    minSimilarity: options.minSimilarity ?? 0.25,
  })

  // 6. QR Code Boost: If QR code matches any Part_Code, elevate to 100%
  if (qrCode) {
    const qrMatched = ranked.find((item) =>
      String(item.part?.Part_Code || '').toLowerCase() === qrCode.toLowerCase()
    )
    if (qrMatched) {
      qrMatched.similarity = 1.0
      qrMatched.percent = 100
      qrMatched.qrMatch = true
      ranked.sort((a, b) => b.similarity - a.similarity)
    }
  }

  const latencyMs = Math.round(performance.now() - startTime)

  return {
    bestMatch: ranked[0] || null,
    candidates: ranked,
    queryVector,
    latencyMs,
    qrCode,
    totalScanned: candidateVectors.length,
  }
}
