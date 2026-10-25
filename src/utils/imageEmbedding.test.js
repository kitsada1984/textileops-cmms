import { describe, it, expect } from 'vitest'
import {
  extractVectorFromImageData,
  cosineSimilarity,
  vectorSearch,
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
})
