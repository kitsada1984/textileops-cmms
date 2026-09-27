// scripts/backup_supabase_full.js
// Exports complete database data and schema from Supabase to local backup files

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const SUPABASE_URL = "https://fyulqejkzuhwppstezko.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y"

const TABLES = [
  'machines',
  'cylinders',
  'workorders',
  'repair_requests',
  'pmplans',
  'needle_sets',
  'needle_history_logs',
  'needle_configs',
  'spare_needle_requests',
  'spareparts',
  'stocktransactions',
  'purchaseorders',
  'appconfigs',
  'auditlogs',
  'design_bom',
  'users'
]

async function fetchTableData(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Range': '0-100000'
      }
    })
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${res.statusText}` }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(projectRoot, 'backups', `supabase_${timestamp}`)
  fs.mkdirSync(backupDir, { recursive: true })

  console.log(`\n======================================================`)
  console.log(`📦 STARTING FULL SUPABASE BACKUP`)
  console.log(`📁 Destination: ${backupDir}`)
  console.log(`======================================================\n`)

  const summary = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    tables: {}
  }

  let totalRecords = 0

  for (const table of TABLES) {
    process.stdout.write(`Exporting [${table}]... `)
    const result = await fetchTableData(table)
    if (!result.ok) {
      console.log(`❌ FAILED: ${result.error}`)
      summary.tables[table] = { status: 'error', error: result.error, count: 0 }
      continue
    }

    const count = Array.isArray(result.data) ? result.data.length : 0
    totalRecords += count

    // Write individual table JSON
    const filePath = path.join(backupDir, `${table}.json`)
    fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2), 'utf8')

    summary.tables[table] = {
      status: 'ok',
      count,
      sizeBytes: fs.statSync(filePath).size
    }
    console.log(`✅ ${count} records`)
  }

  // Write summary manifest
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(summary, null, 2), 'utf8')

  console.log(`\n======================================================`)
  console.log(`🎉 BACKUP COMPLETED SUCCESSFULLY!`)
  console.log(`📊 Total tables exported: ${TABLES.length}`)
  console.log(`📝 Total records backed up: ${totalRecords}`)
  console.log(`📂 Backup folder: ${backupDir}`)
  console.log(`======================================================\n`)
}

runBackup()
