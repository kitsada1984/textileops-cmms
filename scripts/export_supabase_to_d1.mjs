// scripts/export_supabase_to_d1.mjs
// Migrate all data from Supabase (REST) to Cloudflare D1 via SQL dump.
//
// Special handling:
// - appconfigs keys 'needle_sets' / 'center_checks' are legacy full-array blobs.
//   'needle_sets' is skipped (dedicated table needle_sets is migrated directly).
//   'center_checks' is converted into rows of a real `center_checks` table.
// - workorders rows with WO_ID starting 'SYS_' are legacy JSON duplicates — skipped.
//
// Usage: node scripts/export_supabase_to_d1.mjs [--apply]

import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const SUPABASE_URL = 'https://fyulqejkzuhwppstezko.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y'

const TABLES = [
  'users',
  'machines',
  'cylinders',
  'workorders',
  'repair_requests',
  'pmplans',
  'spareparts',
  'stocktransactions',
  'purchaseorders',
  'appconfigs',
  'auditlogs',
  'design_bom',
  'needle_sets',
  'needle_history_logs',
  'needle_configs',
  'spare_needle_requests',
]

const LEGACY_APPCONFIG_KEYS = new Set(['needle_sets', 'center_checks'])
const PAGE_SIZE = 1000

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'object') v = JSON.stringify(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

async function fetchAllRows(table) {
  const rows = []
  let offset = 0
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${table}: HTTP ${res.status} ${text.slice(0, 200)}`)
    }
    const page = await res.json()
    if (!Array.isArray(page) || page.length === 0) break
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return rows
}

function insertStmt(table, row, extraCols = {}) {
  const merged = { ...extraCols, ...row }
  const cols = Object.keys(merged)
  if (cols.length === 0) return null
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const valList = cols.map((c) => sqlValue(merged[c])).join(', ')
  return `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${valList});`
}

async function main() {
  const apply = process.argv.includes('--apply')
  const stmts = ['PRAGMA defer_foreign_keys = ON;']

  for (const table of TABLES) {
    process.stdout.write(`Fetching ${table}... `)
    let rows
    try {
      rows = await fetchAllRows(table)
    } catch (err) {
      console.log(`SKIPPED (${err.message.slice(0, 120)})`)
      continue
    }

    if (table === 'workorders') {
      const before = rows.length
      rows = rows.filter((r) => !String(r.WO_ID || '').startsWith('SYS_'))
      console.log(`${rows.length} rows (${before - rows.length} legacy SYS_* blobs skipped)`)
    } else if (table === 'appconfigs') {
      const before = rows.length
      rows = rows.filter((r) => !LEGACY_APPCONFIG_KEYS.has(String(r.key || '')))
      console.log(`${rows.length} rows (${before - rows.length} legacy blobs skipped)`)
    } else {
      console.log(`${rows.length} rows`)
    }

    for (const row of rows) {
      const stmt = insertStmt(table, row)
      if (stmt) stmts.push(stmt)
    }
  }

  // Convert legacy appconfigs 'center_checks' blob into a real table
  process.stdout.write('Converting center_checks blob into table rows... ')
  const ccRows = await fetchAllRows('appconfigs')
  const ccBlob = ccRows.find((r) => r.key === 'center_checks')
  let ccCount = 0
  if (ccBlob?.value) {
    let arr
    try {
      arr = typeof ccBlob.value === 'string' ? JSON.parse(ccBlob.value) : ccBlob.value
    } catch {
      arr = null
    }
    if (Array.isArray(arr) && arr.length > 0) {
      // Union of all keys across records
      const keys = new Set()
      for (const item of arr) Object.keys(item || {}).forEach((k) => keys.add(k))
      if (!keys.has('doc_no')) throw new Error('center_checks blob missing doc_no')

      stmts.push(`DROP TABLE IF EXISTS center_checks;`)
      const colDefs = [...keys].map((k) => `"${k}" TEXT${k === 'doc_no' ? ' PRIMARY KEY' : ''}`).join(', ')
      stmts.push(`CREATE TABLE IF NOT EXISTS center_checks (${colDefs});`)

      for (const item of arr) {
        const stmt = insertStmt('center_checks', item)
        if (stmt) {
          stmts.push(stmt)
          ccCount++
        }
      }
      console.log(`${ccCount} rows`)
    } else {
      console.log('EMPTY (no table created)')
    }
  } else {
    console.log('blob not found')
  }

  stmts.push('PRAGMA defer_foreign_keys = OFF;')

  const stamp = new Date().toISOString().slice(0, 10)
  const outPath = `backups/d1_migrate_${stamp}.sql`
  mkdirSync('backups', { recursive: true })
  writeFileSync(outPath, stmts.join('\n'), 'utf8')
  console.log(`\nSQL written to ${outPath} (${stmts.length - 2} statements)`)

  if (apply) {
    console.log('Applying to remote D1...')
    execSync(`npx wrangler d1 execute textileops-db --remote --file=${outPath} --yes`, {
      stdio: 'inherit',
    })
    console.log('Done.')
  } else {
    console.log('Dry run only. Re-run with --apply to execute against remote D1.')
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
