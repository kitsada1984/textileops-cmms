// ─────────────────────────────────────────────────────────────
// Base44 REST API client
// App ID : 6a03147c4407b7d557f797e8
// ─────────────────────────────────────────────────────────────

const APP_ID = '6a03147c4407b7d557f797e8'
const BASE_URL = `https://app-${APP_ID}.base44.app/api`

function getToken()  { return localStorage.getItem('b44_token') || '' }
function setToken(t) { localStorage.setItem('b44_token', t) }
function clearToken(){ localStorage.removeItem('b44_token') }
function isLoggedIn(){ return !!getToken() }

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} ${path} → ${res.status}: ${msg}`)
  }
  return res.json()
}

// Generic entity CRUD
export function createEntityClient(entityName) {
  return {
    list:   (filters = {}) => request('GET',  `/entities/${entityName}?${new URLSearchParams(filters)}`),
    get:    (id)            => request('GET',  `/entities/${entityName}/${id}`),
    create: (data)          => request('POST', `/entities/${entityName}`, data),
    update: (id, data)      => request('PUT',  `/entities/${entityName}/${id}`, data),
    delete: (id)            => request('DELETE',`/entities/${entityName}/${id}`),
  }
}

// Auth helpers
async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Login failed: ${msg}`)
  }
  const data = await res.json()
  const token = data.access_token || data.token || data.jwt
  if (!token) throw new Error('ไม่พบ token จาก server')
  setToken(token)
  return data
}

// OTP flow: step 1 — request code sent to email
async function requestOtp(email) {
  const res = await fetch(`${BASE_URL}/auth/send-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`ส่ง OTP ไม่สำเร็จ: ${msg}`)
  }
  return res.json()
}

// OTP flow: step 2 — verify code
async function verifyOtp(email, code) {
  const res = await fetch(`${BASE_URL}/auth/verify-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`OTP ไม่ถูกต้อง: ${msg}`)
  }
  const data = await res.json()
  const token = data.access_token || data.token || data.jwt
  if (!token) throw new Error('ไม่พบ token จาก server')
  setToken(token)
  return data
}

// Manual token (paste from Base44 dashboard / browser devtools)
function loginWithToken(token) {
  if (!token) throw new Error('Token ว่างเปล่า')
  setToken(token)
}

function logout() {
  clearToken()
  window.location.reload()
}

export { getToken, setToken, clearToken, isLoggedIn, login, logout, requestOtp, verifyOtp, loginWithToken }
export default { APP_ID, BASE_URL, request, createEntityClient, login, logout, isLoggedIn, requestOtp, verifyOtp, loginWithToken }
