// functions/api/_auth.js
// Shared auth helpers for D1 API endpoints.
// NOTE: files starting with underscore are NOT routed by Pages Functions — safe as a library module.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getSecret(env) {
  return env?.AUTH_SECRET || 'textileops-dev-secret-change-me'
}

function bytesToB64Url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64UrlToBytes(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacSign(secret, dataStr) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataStr))
  return bytesToB64Url(new Uint8Array(sig))
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createAuthToken(env, payload) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }
  const data = bytesToB64Url(new TextEncoder().encode(JSON.stringify(body)))
  const sig = await hmacSign(getSecret(env), data)
  return `${data}.${sig}`
}

export async function verifyAuthToken(env, token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = await hmacSign(getSecret(env), data)
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64UrlToBytes(data)))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
  // Fallback for EventSource (cannot set custom headers)
  return new URL(request.url).searchParams.get('token') || ''
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
