import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getGeminiConfig,
  saveGeminiConfig,
  isGeminiConfigured,
  testGeminiConnection,
  parseGeminiJsonResponse,
  identifySparePartWithGemini,
  DEFAULT_GEMINI_MODEL,
  GEMINI_LOCAL_CACHE_KEY,
} from './geminiVision'

describe('geminiVision - Google Gemini Vision AI Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  describe('Configuration & Persistence', () => {
    it('returns empty config if no API key is set', async () => {
      const config = await getGeminiConfig()
      expect(config).toBeDefined()
      expect(config.model).toBe(DEFAULT_GEMINI_MODEL)
    })

    it('saves and retrieves Gemini config from cache and localStorage', async () => {
      await saveGeminiConfig({
        apiKey: 'AIzaSyTestFakeKey12345',
        model: 'gemini-1.5-flash',
        isEnabled: true,
      })

      expect(isGeminiConfigured()).toBe(true)
      const loaded = await getGeminiConfig()
      expect(loaded.apiKey).toBe('AIzaSyTestFakeKey12345')
      expect(loaded.model).toBe('gemini-1.5-flash')
      expect(loaded.isEnabled).toBe(true)
    })
  })

  describe('parseGeminiJsonResponse', () => {
    it('parses pure JSON string correctly', () => {
      const raw = '{"best_match_code":"SP-062","best_match_confidence":98}'
      const res = parseGeminiJsonResponse(raw)
      expect(res).toEqual({ best_match_code: 'SP-062', best_match_confidence: 98 })
    })

    it('strips Markdown json code fences', () => {
      const raw = '```json\n{"best_match_code":"SP-062","reasoning":"ตรงกัน 100%"}\n```'
      const res = parseGeminiJsonResponse(raw)
      expect(res).toEqual({ best_match_code: 'SP-062', reasoning: 'ตรงกัน 100%' })
    })

    it('returns null for invalid strings', () => {
      expect(parseGeminiJsonResponse('')).toBeNull()
      expect(parseGeminiJsonResponse('invalid json without braces')).toBeNull()
    })
  })

  describe('testGeminiConnection', () => {
    it('throws error if API key is missing', async () => {
      await expect(testGeminiConnection('')).rejects.toThrow('กรุณาระบุ Gemini API Key')
    })

    it('returns ok: true when Gemini responds with 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok": true}' }] } }],
        }),
      })
      global.fetch = mockFetch

      const res = await testGeminiConnection('AIzaSyValidKey')
      expect(res.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`${DEFAULT_GEMINI_MODEL}:generateContent`),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('auto-falls back to active Gemini Flash model when retired model returns 404', async () => {
      const mockFetch = vi
        .fn()
        // 1st call: retired gemini-1.5-flash returns 404
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'models/gemini-1.5-flash is not found' } }),
        })
        // 2nd call: dynamic GET /models discovery
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                name: 'models/gemini-3.8-flash',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          }),
        })
        // 3rd call: fallback gemini-3.8-flash succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: '{"ok": true}' }] } }],
          }),
        })
      global.fetch = mockFetch

      const res = await testGeminiConnection('AIzaSyValidKey', 'gemini-1.5-flash')
      expect(res.ok).toBe(true)
      expect(res.modelUsed).toBe('gemini-3.8-flash')
    })

    it('throws descriptive error when Gemini responds with error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'API_KEY_INVALID' },
        }),
      })

      await expect(testGeminiConnection('AIzaSyInvalidKey')).rejects.toThrow('API_KEY_INVALID')
    })
  })

  describe('identifySparePartWithGemini', () => {
    it('calls Gemini API with image and candidate list, returning structured match', async () => {
      await saveGeminiConfig({
        apiKey: 'AIzaSyTestKey123',
        model: 'gemini-1.5-flash',
        isEnabled: true,
      })

      const mockResponseText = JSON.stringify({
        identified_object: 'ข้อต่อตรงลม 4mm',
        identified_features: 'ทรงกระบอกพลาสติกสีดำ ขนาดเกลียว 4mm',
        best_match_code: 'SP-062',
        best_match_confidence: 98,
        reasoning: 'รูปถ่ายเป็นข้อต่อลมสวมเร็วสีดำ ตรงกับ SP-062 ต่อตรงลม 4mm อย่างแม่นยำ ไม่ใช่สายพาน',
        ranked_candidates: [
          { part_code: 'SP-062', similarity: 98, reason: 'ข้อต่อตรงลม 4mm รูปทรงตรงกัน 100%' },
          { part_code: 'SP-020', similarity: 2, reason: 'คนละประเภท: เป็นสายพานส่งด้ายสีเหลือง' },
        ],
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: mockResponseText }] } }],
        }),
      })

      const fakeImage = 'data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ=='
      const candidates = [
        { Part_Code: 'SP-062', Name: 'ต่อตรงลม 4mm', Category: 'ข้อต่อลม' },
        { Part_Code: 'SP-020', Name: '10000 สายพานส่งด้าย', Category: 'สายพาน' },
      ]

      const result = await identifySparePartWithGemini(fakeImage, candidates)

      expect(result).toBeDefined()
      expect(result.bestMatchCode).toBe('SP-062')
      expect(result.confidence).toBe(98)
      expect(result.identifiedObject).toBe('ข้อต่อตรงลม 4mm')
      expect(result.reasoning).toContain('SP-062')
      expect(result.rankedCandidates).toHaveLength(2)
      expect(result.rankedCandidates[0].part_code).toBe('SP-062')
      expect(result.rankedCandidates[1].similarity).toBe(2)
    })

    it('throws error if Gemini returns malformed response', async () => {
      await saveGeminiConfig({
        apiKey: 'AIzaSyTestKey123',
        model: 'gemini-1.5-flash',
        isEnabled: true,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Invalid non-json response' }] } }],
        }),
      })

      const fakeImage = 'data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ=='
      await expect(identifySparePartWithGemini(fakeImage, [])).rejects.toThrow()
    })
  })
})
