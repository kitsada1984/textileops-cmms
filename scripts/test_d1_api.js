// scripts/test_d1_api.js
// Verifies the Cloudflare D1 tables and the realtime event stream through the
// application's own HTTPS API — no shell, no wrangler, no child process.
//
// Usage (run from the project root):
//   TEXTOPS_USER=admin TEXTOPS_PASS=secret node scripts/test_d1_api.js
//   TEXTOPS_TOKEN=<bearer token>            node scripts/test_d1_api.js
//
// Every request goes to the fixed production deployment below (no URL is taken
// from input or environment, so the script cannot be pointed somewhere else).

const API_LOGIN = 'https://textileops-cmms.pages.dev/api/d1/auth/login'
const API_QUERY = 'https://textileops-cmms.pages.dev/api/d1/query'
const API_REALTIME = 'https://textileops-cmms.pages.dev/api/d1/realtime'
const ORIGIN = 'https://textileops-cmms.pages.dev'

const TABLES_TO_CHECK = [
  'machines',
  'cylinders',
  'workorders',
  'repair_requests',
  'pmplans',
  'needle_sets',
  'spareparts',
  'stocktransactions',
  'purchaseorders',
  'appconfigs',
  'users',
]

/** POST one fixed query to the app's D1 endpoint. */
async function query(body, token) {
  const res = await fetch(API_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) throw new Error(json.error || `${res.status} ${res.statusText}`)
  return json
}

async function getToken() {
  if (process.env.TEXTOPS_TOKEN) return process.env.TEXTOPS_TOKEN

  const username = process.env.TEXTOPS_USER
  const password = process.env.TEXTOPS_PASS
  if (!username || !password) {
    throw new Error('ต้องระบุ TEXTOPS_TOKEN หรือ TEXTOPS_USER/TEXTOPS_PASS ก่อนรันสคริปต์นี้')
  }

  const res = await fetch(API_LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.token) throw new Error(json.error || 'เข้าสู่ระบบไม่สำเร็จ')
  return json.token
}

async function verifyD1() {
  console.log('\n======================================================')
  console.log(`🔍 VERIFYING CLOUDFLARE D1 TABLES & RECORD COUNTS @ ${ORIGIN}`)
  console.log('======================================================\n')

  const token = await getToken()
  let allOk = true

  for (const table of TABLES_TO_CHECK) {
    process.stdout.write(`Checking table [${table}]... `)
    try {
      const json = await query({ table, action: 'count' }, token)
      console.log(`✅ ${json.count ?? 0} records`)
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`)
      allOk = false
    }
  }

  console.log('\n======================================================')
  console.log('⚡ TESTING REALTIME EVENT STREAM (/api/d1/realtime)')
  console.log('======================================================\n')
  console.log('หมายเหตุ: ตาราง _d1_change_log ไม่เปิดผ่าน API (ความปลอดภัย) — ตรวจผ่าน SSE endpoint แทน')

  process.stdout.write('Connecting to realtime stream... ')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${API_REALTIME}?token=${encodeURIComponent(token)}&stream=true`, {
      signal: controller.signal,
    })
    const reader = res.body?.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value || new Uint8Array())
    const connected = /event:\s*connected/.test(text)
    const maxId = (text.match(/"max_id":\s*(\d+)/) || [])[1]
    if (connected) {
      console.log(`✅ connected (event log max id: ${maxId ?? '?'})`)
    } else {
      console.log('❌ no connected event received')
      allOk = false
    }
    try { await reader.cancel() } catch {}
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`)
    allOk = false
  } finally {
    clearTimeout(timer)
  }

  console.log('\n======================================================')
  if (allOk) {
    console.log('🎉 ALL D1 DATABASE AND REALTIME CHECKS PASSED!')
  } else {
    console.log('⚠️ Some checks failed. Review errors above.')
  }
  console.log('======================================================\n')

  if (!allOk) process.exitCode = 1
}

verifyD1().catch((err) => {
  console.error('❌', err.message)
  process.exitCode = 1
})
