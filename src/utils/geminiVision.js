// src/utils/geminiVision.js
// Google Gemini Vision AI Integration (Free Tier) for Precision Spare Part Reverse Image Search
import { getSystemConfig, saveSystemConfig } from '../modules/systemConfig/systemConfigRepository'

export const GEMINI_CONFIG_KEY = 'gemini_settings'
export const GEMINI_LOCAL_CACHE_KEY = 'textileops_gemini_config'
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash'
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

let inMemoryConfig = null

/**
 * Retrieves the current Gemini configuration.
 * Checks in-memory cache, then localStorage, then appconfigs table, then VITE_GEMINI_API_KEY.
 */
export async function getGeminiConfig() {
  if (inMemoryConfig?.apiKey) {
    return inMemoryConfig
  }

  // 1. Check browser localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(GEMINI_LOCAL_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.apiKey) {
          inMemoryConfig = parsed
          return parsed
        }
      }
    } catch {}
  }

  // 2. Check cloud appconfigs
  try {
    const cloudConfig = await getSystemConfig(GEMINI_CONFIG_KEY, {
      localCacheKey: GEMINI_LOCAL_CACHE_KEY,
      defaultValue: null,
    })
    if (cloudConfig && typeof cloudConfig === 'object' && cloudConfig.apiKey) {
      inMemoryConfig = cloudConfig
      return cloudConfig
    }
  } catch {}

  // 3. Fallback to Vite environment variable
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || ''
  const defaultConfig = {
    apiKey: envKey,
    model: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) || DEFAULT_GEMINI_MODEL,
    isEnabled: Boolean(envKey),
  }

  if (envKey) {
    inMemoryConfig = defaultConfig
  }

  return defaultConfig
}

/**
 * Saves Gemini API Key and settings.
 * Persists immediately to localStorage, in-memory cache, and cloud appconfigs.
 */
export async function saveGeminiConfig({ apiKey, model = DEFAULT_GEMINI_MODEL, isEnabled = true }) {
  const config = {
    apiKey: String(apiKey || '').trim(),
    model: String(model || DEFAULT_GEMINI_MODEL).trim(),
    isEnabled: Boolean(isEnabled && apiKey),
    updatedAt: new Date().toISOString(),
  }

  inMemoryConfig = config

  await saveSystemConfig(GEMINI_CONFIG_KEY, config, {
    localCacheKey: GEMINI_LOCAL_CACHE_KEY,
  })

  return config
}

/**
 * Synchronous check if Gemini Vision is configured and enabled.
 */
export function isGeminiConfigured() {
  if (inMemoryConfig?.apiKey && inMemoryConfig.isEnabled !== false) {
    return true
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(GEMINI_LOCAL_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        return Boolean(parsed?.apiKey && parsed.isEnabled !== false)
      }
    } catch {}
  }
  return Boolean(typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY)
}

/**
 * Tests the Gemini API Key connection with a minimal text prompt.
 */
export async function testGeminiConnection(apiKey, model = DEFAULT_GEMINI_MODEL) {
  const key = String(apiKey || '').trim()
  if (!key) throw new Error('กรุณาระบุ Gemini API Key')

  const endpoint = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(key)}`
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping test. Reply with JSON: {"ok": true}' }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: controller?.signal,
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `HTTP ${res.status}: ไม่สามารถเชื่อมต่อกับ Gemini API`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return { ok: true, rawText: text }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Converts various image source types (DataURL, Blob, File, ImageData) to raw Base64 string.
 */
export async function imageSourceToBase64(imageSource) {
  if (!imageSource) throw new Error('Missing imageSource')

  // If already a Data URL
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    const commaIdx = imageSource.indexOf(',')
    const mimeMatch = imageSource.slice(0, commaIdx).match(/data:([^;]+)/)
    return {
      mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
      data: imageSource.slice(commaIdx + 1),
    }
  }

  // If Blob or File
  if (typeof Blob !== 'undefined' && imageSource instanceof Blob) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(imageSource)
    })
    const commaIdx = dataUrl.indexOf(',')
    return {
      mimeType: imageSource.type || 'image/jpeg',
      data: dataUrl.slice(commaIdx + 1),
    }
  }

  // If raw ImageData or pixel buffer { data, width, height }
  if (typeof imageSource === 'object' && imageSource.data && imageSource.width && imageSource.height) {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = imageSource.width
      canvas.height = imageSource.height
      const ctx = canvas.getContext('2d')
      if (imageSource instanceof ImageData) {
        ctx.putImageData(imageSource, 0, 0)
      } else {
        const imgData = ctx.createImageData(imageSource.width, imageSource.height)
        imgData.data.set(imageSource.data)
        ctx.putImageData(imgData, 0, 0)
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      const commaIdx = dataUrl.indexOf(',')
      return {
        mimeType: 'image/jpeg',
        data: dataUrl.slice(commaIdx + 1),
      }
    }
  }

  // If http/https URL string
  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    const res = await fetch(imageSource)
    const blob = await res.blob()
    return imageSourceToBase64(blob)
  }

  throw new Error('Unsupported imageSource format')
}

/**
 * Safely parses JSON response from Gemini, removing Markdown code fences if present.
 */
export function parseGeminiJsonResponse(rawText = '') {
  if (!rawText) return null
  let cleaned = String(rawText).trim()

  // Remove ```json ... ``` code fence
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch (err) {
    console.warn('[GeminiVision] JSON parse fallback on raw text:', err)
    // Attempt to extract JSON object substring
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
      } catch {}
    }
    return null
  }
}

/**
 * Identifies a spare part from an image using Google Gemini 1.5 Flash Vision.
 *
 * @param {string|Blob|File|ImageData} imageSource - The query photo
 * @param {Array<Object>} candidates - List of candidate spare parts from inventory
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=12000]
 * @returns {Promise<Object>} Structured match result
 */
export async function identifySparePartWithGemini(imageSource, candidates = [], options = {}) {
  const config = await getGeminiConfig()
  const apiKey = config.apiKey
  if (!apiKey) {
    throw new Error('ยังไม่ได้กำหนด Google Gemini API Key')
  }

  const model = config.model || DEFAULT_GEMINI_MODEL
  const { mimeType, data: base64Data } = await imageSourceToBase64(imageSource)

  // Build a compact representation of inventory candidates to keep token usage minimal & fast
  const catalogList = candidates.slice(0, 100).map((p) => ({
    code: p.Part_Code || p.code || p.id || '',
    name: p.Name || p.name || '',
    cat: p.Category || p.category || '',
    spec: (p.Specification || p.Description || p.spec || '').slice(0, 100),
  }))

  const prompt = [
    `คุณคือ AI ผู้เชี่ยวชาญด้านอะไหล่และชิ้นส่วนเครื่องจักรสิ่งทอ (Textile Knitting Machine Spare Parts Specialist)`,
    `ภารกิจ: วิเคราะห์รูปถ่ายอะไหล่ที่ผู้ใช้ส่งมาอย่างละเอียด ตรวจสอบรูปทรง วัสดุ สี โครงสร้าง ประเภทชิ้นส่วน ตัวหนังสือ/รหัสสกรีน`,
    `แล้วนำมาเปรียบเทียบกับรายการอะไหล่ในคลังโรงงานด้านล่าง เพื่อค้นหาอะไหล่ที่ตรงกันมากที่สุด`,
    ``,
    `รายการอะไหล่ในคลัง:`,
    JSON.stringify(catalogList),
    ``,
    `ข้อกำหนดสำคัญ:`,
    `1. ดูรูปทรงและประเภทวัตถุจริงเป็นหลัก (ห้ามสับสนเพราะพื้นหลังสีขาวหรือแสง)`,
    `2. ระบุชื่อวัตถุที่ตรวจพบ (identified_object) และลักษณะสำคัญ (identified_features) เป็นภาษาไทย`,
    `3. ระบุรหัสอะไหล่ที่ตรงที่สุด (best_match_code) พร้อมค่าความมั่นใจ (confidence 0-100)`,
    `4. ให้เหตุผลการวิเคราะห์อย่างชัดเจน (reasoning) เช่น อธิบายว่าทำไมถึงตรงกับชิ้นนี้ และทำไมถึงไม่ใช่ชิ้นอื่น`,
    `5. ให้คะแนนความคล้ายของอะไหล่แต่ละชิ้น (similarity 0-100) โดยอะไหล่คนละประเภท (เช่น สายพาน vs ข้อต่อลม) ต้องได้คะแนนต่ำมาก (0-15%)`,
    ``,
    `ตอบกลับเป็น JSON ตามรูปแบบนี้เท่านั้น:`,
    `{`,
    `  "identified_object": "ชื่อวัตถุอะไหล่ที่เห็นในภาพ",`,
    `  "identified_features": "ลักษณะเด่นของอะไหล่ เช่น สี รูปทรง ขนาด เกลียว",`,
    `  "best_match_code": "รหัสอะไหล่ที่ตรงที่สุด (เช่น SP-062)",`,
    `  "best_match_confidence": 98,`,
    `  "reasoning": "คำอธิบายเหตุผลภาษาไทยสั้นๆ ชัดเจน",`,
    `  "ranked_candidates": [`,
    `    { "part_code": "SP-062", "similarity": 98, "reason": "ตรงกันทั้งประเภทและขนาด" },`,
    `    { "part_code": "SP-020", "similarity": 2, "reason": "คนละประเภท เป็นสายพาน" }`,
    `  ]`,
    `}`,
  ].join('\n')

  const endpoint = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timeoutMs = options.timeoutMs || 12000
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: controller?.signal,
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Gemini API error (HTTP ${res.status})`)
    }

    const data = await res.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseGeminiJsonResponse(rawText)

    if (!parsed || !parsed.best_match_code) {
      throw new Error('Gemini API ส่งคืนรูปแบบคำตอบที่ไม่สมบูรณ์')
    }

    return {
      identifiedObject: parsed.identified_object || 'ไม่ระบุประเภท',
      identifiedFeatures: parsed.identified_features || '',
      bestMatchCode: String(parsed.best_match_code).trim(),
      confidence: Number(parsed.best_match_confidence) || 90,
      reasoning: parsed.reasoning || '',
      rankedCandidates: Array.isArray(parsed.ranked_candidates) ? parsed.ranked_candidates : [],
      modelUsed: model,
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
