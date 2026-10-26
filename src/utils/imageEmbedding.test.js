import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractVectorFromImageData,
  cosineSimilarity,
  vectorSearch,
  setCachedVector,
  getCachedVector,
  clearVectorCache,
  savePersistedVectorCache,
  loadPersistedVectorCache,
  runConcurrentBatch,
  getVectorCacheStats,
  searchSimilarSparePartsByImage,
  PERSISTED_VECTOR_CACHE_KEY,
} from './imageSearch'

function createSyntheticImage(width, height, colorFn) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      const [r, g, b, a] = colorFn(x, y, width, height)
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a !== undefined ? a : 255
    }
  }
  return { data, width, height }
}

describe('Image Embedding & Vector Search Engine', () => {
  beforeEach(() => {
    clearVectorCache()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('extracts exactly 128 dimensions from image data', () => {
    const img = createSyntheticImage(32, 32, () => [20, 20, 20])
    const vector = extractVectorFromImageData(img)

    expect(Array.isArray(vector)).toBe(true)
    expect(vector.length).toBe(128)
  })

  it('produces an L2-normalized unit vector (norm ≈ 1.0)', () => {
    const img = createSyntheticImage(32, 32, (x, y) => [x * 5, y * 5, 100])
    const vector = extractVectorFromImageData(img)

    const sumSq = vector.reduce((acc, val) => acc + val * val, 0)
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3)
  })

  it('calculates cosine similarity of 1.0 for identical image vectors', () => {
    const imgA = createSyntheticImage(32, 32, (x, y) => [x * 4, y * 4, 150])
    const vectorA = extractVectorFromImageData(imgA)
    const vectorB = extractVectorFromImageData(imgA)

    const sim = cosineSimilarity(vectorA, vectorB)
    expect(sim).toBeCloseTo(1.0, 4)
  })

  it('gives high similarity for slightly altered images of the same part', () => {
    // Timing belt pattern: alternating dark and slightly lighter bars
    const belt1 = createSyntheticImage(32, 32, (x) => (Math.floor(x / 4) % 2 === 0 ? [15, 15, 15] : [40, 40, 40]))
    const belt2 = createSyntheticImage(32, 32, (x) => (Math.floor(x / 4) % 2 === 0 ? [18, 18, 18] : [45, 45, 45]))

    // Completely different object (bright circular bearing)
    const bearing = createSyntheticImage(32, 32, (x, y) => {
      const dist = Math.hypot(x - 16, y - 16)
      return dist > 10 && dist < 14 ? [220, 220, 230] : [250, 250, 250]
    })

    const vBelt1 = extractVectorFromImageData(belt1)
    const vBelt2 = extractVectorFromImageData(belt2)
    const vBearing = extractVectorFromImageData(bearing)

    const beltBeltSim = cosineSimilarity(vBelt1, vBelt2)
    const beltBearingSim = cosineSimilarity(vBelt1, vBearing)

    expect(beltBeltSim).toBeGreaterThan(0.9)
    expect(beltBeltSim).toBeGreaterThan(beltBearingSim)
  })

  it('performs vectorSearch and ranks candidates by nearest distance', () => {
    const query = [1, 0, 0, 0]
    const candidates = [
      { id: 'item-1', vector: [0.1, 0.9, 0, 0], name: 'Item 1' },
      { id: 'item-2', vector: [0.95, 0.05, 0, 0], name: 'Item 2' },
      { id: 'item-3', vector: [0.5, 0.5, 0, 0], name: 'Item 3' },
    ]

    const results = vectorSearch(query, candidates, { topK: 3, minSimilarity: 0.1 })

    expect(results.length).toBe(3)
    expect(results[0].id).toBe('item-2')
    expect(results[0].percent).toBeGreaterThan(results[1].percent)
    expect(results[1].id).toBe('item-3')
    expect(results[2].id).toBe('item-1')
  })

  it('handles empty candidates or invalid inputs gracefully', () => {
    expect(vectorSearch([], [])).toEqual([])
    expect(vectorSearch([1, 2], null)).toEqual([])
    expect(vectorSearch(null, [{ id: '1', vector: [1, 2] }])).toEqual([])
  })

  it('caches vectors and invalidates when image URL changes', () => {
    const dummyVector = new Array(128).fill(0.01)
    setCachedVector('SP-001', 'https://example.com/img1.jpg', dummyVector)

    const cached1 = getCachedVector('SP-001', 'https://example.com/img1.jpg')
    expect(cached1).toBeDefined()
    expect(cached1?.length).toBe(128)

    // Different URL should invalidate
    const cachedDiff = getCachedVector('SP-001', 'https://example.com/img2-changed.jpg')
    expect(cachedDiff).toBeNull()

    // And now the old key is cleared
    expect(getCachedVector('SP-001', 'https://example.com/img1.jpg')).toBeNull()
  })

  it('persists vector cache to localStorage and recovers it', () => {
    const dummyVector = new Array(128).fill(0.02)
    setCachedVector('SP-002', 'https://example.com/img2.jpg', dummyVector)
    savePersistedVectorCache()

    const raw = localStorage.getItem(PERSISTED_VECTOR_CACHE_KEY)
    expect(raw).toBeTruthy()
    expect(raw).toContain('SP-002')

    // Simulate session reload without storage loss
    clearVectorCache({ clearStorage: false })
    loadPersistedVectorCache({ force: true })
    const recovered = getCachedVector('SP-002', 'https://example.com/img2.jpg')
    expect(recovered).toBeDefined()
    expect(recovered?.length).toBe(128)
  })

  it('executes runConcurrentBatch with pool limits and gathers all results', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let activeWorkers = 0
    let maxConcurrent = 0

    const results = await runConcurrentBatch(items, 3, async (item) => {
      activeWorkers += 1
      maxConcurrent = Math.max(maxConcurrent, activeWorkers)
      await new Promise((resolve) => setTimeout(resolve, 10))
      activeWorkers -= 1
      return item * 2
    })

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
    expect(maxConcurrent).toBeLessThanOrEqual(3)
  })

  it('calculates cache readiness stats via getVectorCacheStats', () => {
    const parts = [
      { Part_Code: 'SP-10', ImageUrl: 'https://example.com/10.jpg' },
      { Part_Code: 'SP-20', ImageUrl: 'https://example.com/20.jpg' },
      { Part_Code: 'SP-30', ImageUrl: '' }, // No image
    ]

    const statsInitial = getVectorCacheStats(parts)
    expect(statsInitial.total).toBe(2)
    expect(statsInitial.cached).toBe(0)
    expect(statsInitial.isReady).toBe(false)

    setCachedVector('SP-10', 'https://example.com/10.jpg', new Array(128).fill(0.05))
    const statsPartial = getVectorCacheStats(parts)
    expect(statsPartial.cached).toBe(1)
    expect(statsPartial.isReady).toBe(false)

    setCachedVector('SP-20', 'https://example.com/20.jpg', new Array(128).fill(0.05))
    const statsFull = getVectorCacheStats(parts)
    expect(statsFull.cached).toBe(2)
    expect(statsFull.isReady).toBe(true)
  })

  it('searchSimilarSparePartsByImage performs ultra-fast search using cached candidate vectors', async () => {
    const queryImg = createSyntheticImage(32, 32, () => [50, 50, 50])
    const candidateParts = [
      {
        Part_Code: 'SP-BELT',
        Part_Name_EN: 'Timing Belt 500',
        ImageUrl: 'https://example.com/belt.png',
      },
      {
        Part_Code: 'SP-BEAR',
        Part_Name_EN: 'Deep Groove Bearing',
        ImageUrl: 'https://example.com/bearing.png',
      },
    ]

    // Pre-cache candidate vectors
    const vBelt = new Array(128).fill(0.0883) // unit length norm ≈ 1.0
    const vBearing = new Array(128).fill(0.01)
    vBearing[0] = 0.99
    setCachedVector('SP-BELT', 'https://example.com/belt.png', vBelt)
    setCachedVector('SP-BEAR', 'https://example.com/bearing.png', vBearing)

    const result = await searchSimilarSparePartsByImage(queryImg, candidateParts)

    expect(result).toBeDefined()
    expect(result.bestMatch).toBeDefined()
    expect(result.totalScanned).toBe(2)
    expect(result.fromCacheCount).toBe(2)
    expect(result.latencyMs).toBeLessThan(1000) // In test environment without network, should be sub-second
  })

  it('automatically ingests pre-computed 128-D vector from DB record without network fetch', () => {
    const dbVector = new Array(128).fill(0.088)
    const partFromDb = {
      Part_Code: 'SP-DB-1',
      ImageUrl: 'https://example.com/db1.png',
      ImageEmbedding: dbVector,
    }

    // Cache should initially not have it
    expect(getCachedVector('SP-DB-1', 'https://example.com/db1.png')).toBeNull()

    // getVectorCacheStats should auto-ingest it into cache
    const stats = getVectorCacheStats([partFromDb])
    expect(stats.cached).toBe(1)
    expect(stats.isReady).toBe(true)

    // Now vector is in local cache
    const cached = getCachedVector('SP-DB-1', 'https://example.com/db1.png')
    expect(cached).toBeDefined()
    expect(cached?.length).toBe(128)
  })

  it('automatically ingests 128-D vector from Remark fallback string', () => {
    const dbVector = new Array(128).fill(0.077)
    const partWithRemark = {
      Part_Code: 'SP-REMARK-1',
      ImageUrl: 'https://example.com/rmk.png',
      Remark: `คำอธิบายทั่วไป\nImageEmbedding: ${JSON.stringify(dbVector)}`,
    }

    const stats = getVectorCacheStats([partWithRemark])
    expect(stats.cached).toBe(1)
    expect(stats.isReady).toBe(true)

    const cached = getCachedVector('SP-REMARK-1', 'https://example.com/rmk.png')
    expect(cached).toBeDefined()
    expect(cached?.length).toBe(128)
  })
})
