// scripts/check-secrets.mjs
// Hygiene guard: fail if tracked files contain likely secrets.
// Does NOT read secret values — only pattern-matches tracked file bytes.
import { execSync } from 'node:child_process'

const PATTERNS = [
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // Supabase JWT
  /AIza[0-9A-Za-z_-]{20,}/, // Google API key
  /textileops-dev-secret-change-me/, // default auth fallback must never ship tracked
]

let tracked = ''
try {
  tracked = execSync('git ls-files', { encoding: 'utf-8' })
} catch {
  console.error('check-secrets: git ls-files failed')
  process.exit(2)
}

const files = tracked.split('\n').map((s) => s.trim()).filter(Boolean)
  .filter((f) => !f.startsWith('scratch/') && !f.startsWith('.compare-vercel/') && !f.endsWith('.zip') && f !== '.env')
  .filter((f) => f.replace(/\\/g, '/') !== 'scripts/check-secrets.mjs') // self: contains patterns as data, not secrets

// Files where a matched pattern is an intentional non-secret placeholder/marker (not a real key).
// functions/api/_auth.js contains the literal 'textileops-dev-secret-change-me' only as a
// local-dev fallback — prod MUST set AUTH_SECRET (see CLOUDFLARE_ACCOUNT.md). Do not add real keys here.
const ALLOWLIST = new Set([
  'functions/api/_auth.js',
])

import fs from 'node:fs'
let failed = false
for (const f of files) {
  let content = ''
  try {
    content = fs.readFileSync(f, 'utf-8')
  } catch {
    continue // binary / unreadable — skip
  }
  for (const re of PATTERNS) {
    if (re.test(content) && !ALLOWLIST.has(f.replace(/\\/g, '/'))) {
      console.error(`check-secrets FAIL: pattern ${re} matched tracked file: ${f}`)
      failed = true
    }
  }
}

// .env must never be tracked
try {
  const ls = execSync('git ls-files -- .env', { encoding: 'utf-8' }).trim()
  if (ls.split('\n').some((l) => l.trim() === '.env')) {
    console.error('check-secrets FAIL: .env is tracked (must be untracked, use .env.example)')
    failed = true
  }
} catch {}

if (failed) process.exit(1)
console.log('check-secrets OK: no tracked secrets found')
