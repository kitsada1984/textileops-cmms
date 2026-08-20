import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildImageEmbeddingByUrl, cosineSimilarity, parseEmbedding } from './imageSearch'

const ORIGINAL_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  import.meta.env.VITE_OPENAI_API_KEY = 'test-openai-key'
})

afterEach(() => {
  import.meta.env.VITE_OPENAI_API_KEY = ORIGINAL_API_KEY
})

describe('parseEmbedding', () => {
  it('returns arrays as-is', () => {
    expect(parseEmbedding([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('parses JSON strings', () => {
    expect(parseEmbedding('[0.1,0.2,0.3]')).toEqual([0.1, 0.2, 0.3])
  })

  it('falls back to empty array for invalid JSON', () => {
    expect(parseEmbedding('not-json')).toEqual([])
  })
})

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6)
  })

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0)
  })

  it('supports different vector lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 999])).toBeCloseTo(1, 6)
  })
})

describe('buildImageEmbeddingByUrl', () => {
  it('builds a fingerprint and embedding from the image URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output_text: 'ผ้าลายทางสีฟ้า โลโก้แดง' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await buildImageEmbeddingByUrl('https://example.com/item.png')

    expect(result).toEqual({
      fingerprint: 'ผ้าลายทางสีฟ้า โลโก้แดง',
      embedding: [0.1, 0.2, 0.3],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('/responses')
    expect(fetchMock.mock.calls[1][0]).toContain('/embeddings')

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(firstBody.input[0].content[1]).toEqual({
      type: 'input_image',
      image_url: 'https://example.com/item.png',
    })
  })

  it('throws a clear error when the API key is missing', async () => {
    import.meta.env.VITE_OPENAI_API_KEY = ''

    await expect(buildImageEmbeddingByUrl('https://example.com/item.png'))
      .rejects
      .toThrow('ยังไม่ได้ตั้งค่า VITE_OPENAI_API_KEY')
  })
})
