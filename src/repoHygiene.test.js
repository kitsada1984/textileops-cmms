import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execSync } from 'node:child_process'

// Phase 3 hygiene guards (no logic change).
// Locks in the Phase 1 cleanup so secrets and generated bundles never get tracked again.

const ROOT = path.resolve(__dirname, '..')
const JWT_RE = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/

function trackedFiles() {
  try {
    return execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return null // git unavailable (e.g. packaged CI) — git-dependent tests skip
  }
}

describe('Repo hygiene (phase 1 locks)', () => {
  it('.gitignore blocks secrets, scratch, archives, and generated bundles', () => {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8')
    for (const entry of ['.env', 'scratch/', '*.zip', '.compare-vercel/', '!.env.example']) {
      expect(gi, `.gitignore must contain "${entry}"`).toContain(entry)
    }
  })

  it('.env.example exists and contains no secret values', () => {
    const p = path.join(ROOT, '.env.example')
    expect(fs.existsSync(p)).toBe(true)
    const content = fs.readFileSync(p, 'utf-8')
    expect(content).not.toMatch(JWT_RE)
    for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_DB_PROVIDER']) {
      expect(content, `.env.example must document ${key}`).toContain(key)
    }
  })

  it('wrangler.toml ships placeholders only, never real keys', () => {
    const content = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf-8')
    expect(content).not.toMatch(JWT_RE)
    expect(content).toContain('SET_IN_DASHBOARD')
  })

  it('no .env file is git-tracked', () => {
    const files = trackedFiles()
    if (!files) return // skip without git
    expect(files.filter((f) => f === '.env')).toEqual([])
  })

  it('no scratch / generated-bundle / archive files are git-tracked', () => {
    const files = trackedFiles()
    if (!files) return // skip without git
    const bad = files.filter(
      (f) => f.startsWith('scratch/') || f.startsWith('.compare-vercel/') || f.endsWith('.zip')
    )
    expect(bad).toEqual([])
  })
})
