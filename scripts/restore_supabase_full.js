// scripts/restore_supabase_full.js
// Restores full database records back to Supabase from local backup JSON files

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const SUPABASE_URL = "https://fyulqejkzuhwppstezko.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dWxxZWprenVod3Bwc3RlemtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY2MzYsImV4cCI6MjA5MzI5MjYzNn0.8dqXxqACiOEkjUevt_xFgIRPZ8CcMPgYZKBNM1THI4Y"

// Tables in dependency order for restoration
const TABLES = [
  'users',
  'machines',
  'cylinders',
  'needle_sets',
  'needle_configs',
  'needle_history_logs',
  'spareparts',
  'stocktransactions',
  'spare_needle_requests',
  'purchaseorders',
  'pmplans',
  'repair_requests',
  'workorders',
  'appconfigs',
  'auditlogs',
  'design_bom'
]

async function upsertBatch(table, records) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(records)
    })

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `${res.status} ${res.statusText}: ${errText}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function runRestore() {
  const backupsDir = path.join(projectRoot, 'backups')
  if (!fs.existsSync(backupsDir)) {
    console.error("❌ No backups folder found!")
    process.exit(1)
  }

  // Find latest backup folder if not provided as argument
  let targetFolder = process.argv[2]
  if (!targetFolder) {
    const dirs = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('supabase_') && fs.statSync(path.join(backupsDir, f)).isDirectory())
      .sort()
      .reverse()

    if (dirs.length === 0) {
      console.error("❌ No supabase backup folders found!")
      process.exit(1)
    }
    targetFolder = dirs[0]
  }

  const backupDir = path.isAbsolute(targetFolder) ? targetFolder : path.join(backupsDir, targetFolder)

  console.log(`\n======================================================`)
  console.log(`🔄 RESTORING SUPABASE DATABASE FROM BACKUP`)
  console.log(`📁 Source Folder: ${backupDir}`)
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`)
  console.log(`======================================================\n`)

  const manifestPath = path.join(backupDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.warn("⚠️ Warning: manifest.json not found in backup folder.")
  }

  let totalRestored = 0

  for (const table of TABLES) {
    const filePath = path.join(backupDir, `${table}.json`)
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping [${table}] (no backup file)`)
      continue
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    let records = []
    try {
      records = JSON.parse(fileContent)
    } catch (e) {
      console.error(`❌ Error parsing JSON for [${table}]: ${e.message}`)
      continue
    }

    if (!Array.isArray(records) || records.length === 0) {
      console.log(`⚪ [${table}] is empty (0 records)`)
      continue
    }

    process.stdout.write(`Restoring [${table}] (${records.length} records)... `)

    // Batch upsert in chunks of 50
    const chunkSize = 50
    let failed = false

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      const res = await upsertBatch(table, chunk)
      if (!res.ok) {
        console.log(`\n❌ Failed batch on [${table}]: ${res.error}`)
        failed = true
        break
      }
    }

    if (!failed) {
      console.log(`✅ OK`)
      totalRestored += records.length
    }
  }

  console.log(`\n======================================================`)
  console.log(`🎉 RESTORATION COMPLETED`)
  console.log(`📊 Total records restored: ${totalRestored}`)
  console.log(`======================================================\n`)
}

runRestore()
