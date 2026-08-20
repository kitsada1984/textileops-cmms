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
