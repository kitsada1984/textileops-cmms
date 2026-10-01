// scripts/test_d1_api.js
// Automated verification script for Cloudflare D1 tables and Realtime Event Bus.
//
// Safety notes: every SQL statement is a fixed module-level constant, and the
// wrangler CLI is launched through execFileSync with a fixed argument list (the
// SQL itself travels in a temp .sql file) — nothing is parsed by a shell.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'

const WRANGLER_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const DEFAULT_ACCOUNT_ID = '392e2aeb2648effccebd585e5c29611b'
const DB_NAME = 'textileops-db'

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
  '_d1_change_log',
]

const TEST_EVENT_ID = `test_${Date.now()}`

// One fixed statement per table + the realtime event checks
const STATEMENTS = [
  ...TABLES_TO_CHECK.map((table) => `SELECT count(*) as cnt FROM "${table}"`),
  `INSERT INTO _d1_change_log (table_name, action, record_id, data, created_at) VALUES ('test_table', 'INSERT', '${TEST_EVENT_ID}', '{"hello":"world"}', datetime('now'))`,
  `SELECT * FROM _d1_change_log WHERE record_id = '${TEST_EVENT_ID}'`,
  `DELETE FROM _d1_change_log WHERE record_id = '${TEST_EVENT_ID}'`,
]

const IDX_TABLE_FROM = 0
const IDX_EVENT_INSERT = TABLES_TO_CHECK.length
const IDX_EVENT_READ = TABLES_TO_CHECK.length + 1
const IDX_EVENT_CLEANUP = TABLES_TO_CHECK.length + 2

/** Runs one of the fixed statements above by index (no dynamic command text). */
function runStatement(index) {
  const sql = STATEMENTS[index]
  if (typeof sql !== 'string') {
    return { ok: false, error: `unknown statement index: ${index}` }
  }

  const tempFile = path.join(os.tmpdir(), `d1_check_${process.pid}_${index}.sql`)
  try {
    fs.writeFileSync(tempFile, `${sql}\n`, 'utf8')
    const out = execFileSync(
      WRANGLER_CMD,
      ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--file', tempFile, '--json'],
      {
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
        },
        stdio: 'pipe',
      },
    ).toString()
    const parsed = JSON.parse(out)
    return { ok: true, results: parsed[0]?.results || [] }
  } catch (err) {
    return { ok: false, error: err.stderr ? err.stderr.toString() : err.message }
  } finally {
    try { fs.unlinkSync(tempFile) } catch {}
  }
}

async function verifyD1() {
  console.log('\n======================================================')
  console.log('🔍 VERIFYING CLOUDFLARE D1 TABLES & RECORD COUNTS')
  console.log('======================================================\n')

  let allOk = true

  TABLES_TO_CHECK.forEach((table, tableIndex) => {
    process.stdout.write(`Checking table [${table}]... `)
    const res = runStatement(IDX_TABLE_FROM + tableIndex)
    if (!res.ok) {
      console.log(`❌ ERROR: ${res.error}`)
      allOk = false
    } else {
      const count = res.results[0]?.cnt || 0
      console.log(`✅ ${count} records`)
    }
  })

  console.log('\n======================================================')
  console.log('⚡ TESTING REALTIME EVENT LOG (_d1_change_log)')
  console.log('======================================================\n')

  process.stdout.write('Inserting test Realtime Event... ')
  const insertRes = runStatement(IDX_EVENT_INSERT)
  if (!insertRes.ok) {
    console.log(`❌ FAILED: ${insertRes.error}`)
    allOk = false
  } else {
    console.log('✅ OK')
  }

  process.stdout.write('Querying recent Realtime Events... ')
  const readRes = runStatement(IDX_EVENT_READ)
  if (readRes.ok && readRes.results.length > 0) {
    console.log(`✅ Event verified: [${readRes.results[0].action}] on [${readRes.results[0].table_name}]`)
  } else {
    console.log('❌ Event not found in change log!')
    allOk = false
  }

  // Cleanup test event
  runStatement(IDX_EVENT_CLEANUP)

  console.log('\n======================================================')
  if (allOk) {
    console.log('🎉 ALL D1 DATABASE AND REALTIME CHECKS PASSED!')
  } else {
    console.log('⚠️ Some checks failed. Review errors above.')
  }
  console.log('======================================================\n')
}

verifyD1()
