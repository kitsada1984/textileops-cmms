// scripts/test_d1_api.js
// Automated verification script for Cloudflare D1 tables and Realtime Event Bus

import { execSync } from 'child_process'

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
  '_d1_change_log'
]

function runD1Query(sql) {
  try {
    const escapedSql = sql.replace(/"/g, '\\"')
    const cmd = `npx wrangler d1 execute textileops-db --remote --command="${escapedSql}" --json`
    const out = execSync(cmd, {
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '392e2aeb2648effccebd585e5c29611b' },
      stdio: 'pipe'
    }).toString()
    const parsed = JSON.parse(out)
    return { ok: true, results: parsed[0]?.results || [] }
  } catch (err) {
    return { ok: false, error: err.stderr ? err.stderr.toString() : err.message }
  }
}

async function verifyD1() {
  console.log('\n======================================================')
  console.log('🔍 VERIFYING CLOUDFLARE D1 TABLES & RECORD COUNTS')
  console.log('======================================================\n')

  let allOk = true

  for (const table of TABLES_TO_CHECK) {
    process.stdout.write(`Checking table [${table}]... `)
    const res = runD1Query(`SELECT count(*) as cnt FROM "${table}"`)
    if (!res.ok) {
      console.log(`❌ ERROR: ${res.error}`)
      allOk = false
    } else {
      const count = res.results[0]?.cnt || 0
      console.log(`✅ ${count} records`)
    }
  }

  console.log('\n======================================================')
  console.log('⚡ TESTING REALTIME EVENT LOG (_d1_change_log)')
  console.log('======================================================\n')

  const testId = `test_${Date.now()}`
  process.stdout.write('Inserting test Realtime Event... ')
  const insertRes = runD1Query(
    `INSERT INTO _d1_change_log (table_name, action, record_id, data, created_at) VALUES ('test_table', 'INSERT', '${testId}', '{"hello":"world"}', datetime('now'))`
  )
  if (!insertRes.ok) {
    console.log(`❌ FAILED: ${insertRes.error}`)
    allOk = false
  } else {
    console.log('✅ OK')
  }

  process.stdout.write('Querying recent Realtime Events... ')
  const readRes = runD1Query(`SELECT * FROM _d1_change_log WHERE record_id = '${testId}'`)
  if (readRes.ok && readRes.results.length > 0) {
    console.log(`✅ Event verified: [${readRes.results[0].action}] on [${readRes.results[0].table_name}]`)
  } else {
    console.log('❌ Event not found in change log!')
    allOk = false
  }

  // Cleanup test event
  runD1Query(`DELETE FROM _d1_change_log WHERE record_id = '${testId}'`)

  console.log('\n======================================================')
  if (allOk) {
    console.log('🎉 ALL D1 DATABASE AND REALTIME CHECKS PASSED!')
  } else {
    console.log('⚠️ Some checks failed. Review errors above.')
  }
  console.log('======================================================\n')
}

verifyD1()
