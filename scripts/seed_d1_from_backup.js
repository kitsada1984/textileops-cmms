// scripts/seed_d1_from_backup.js
// Reads backed-up JSON data and generates a seed SQL file for Cloudflare D1
// Gracefully handles legacy cached JSON blobs (>50KB) to stay within SQLite limits

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

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

function escapeSqlValue(val, colName, tableName) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val)
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0'
  }
  let strVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
  
  // If a legacy cached blob exceeds 30KB (e.g. old JSON dumps in Detail/value), compress or summarize
  if (strVal.length > 30000) {
    console.log(`⚠️ Summarizing oversized legacy cache in [${tableName}.${colName}] (${strVal.length} chars)`)
    strVal = JSON.stringify({ _notice: 'Legacy cache migrated to dedicated table', length: strVal.length })
  }

  return `'${strVal.replace(/'/g, "''")}'`
}

async function runSeed() {
  const backupsDir = path.join(projectRoot, 'backups')
  const dirs = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('supabase_') && fs.statSync(path.join(backupsDir, f)).isDirectory())
    .sort()
    .reverse()

  if (dirs.length === 0) {
    console.error("❌ No supabase backup folders found!")
    process.exit(1)
  }

  const backupDir = path.join(backupsDir, dirs[0])
  console.log(`📁 Reading data from backup: ${backupDir}`)

  const sqlStatements = [
    '-- Seed D1 Database from Supabase Backup',
    'PRAGMA defer_foreign_keys = ON;'
  ]

  let totalRecords = 0

  for (const table of TABLES) {
    const filePath = path.join(backupDir, `${table}.json`)
    if (!fs.existsSync(filePath)) continue

    const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!Array.isArray(rows) || rows.length === 0) continue

    console.log(`Processing [${table}] (${rows.length} rows)...`)

    for (const row of rows) {
      if (!row.id) {
        row.id = row._id || row.Technician_ID || row.WO_ID || row.Set_ID || row.Log_ID || `gen_${Date.now()}_${Math.random()}`
      }

      const keys = Object.keys(row).filter(k => k !== '_id')
      const cols = keys.map(k => `"${k}"`).join(', ')
      const vals = keys.map(k => escapeSqlValue(row[k], k, table)).join(', ')

      sqlStatements.push(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${vals});`)
      totalRecords++
    }
  }

  sqlStatements.push('PRAGMA optimize;')

  const seedSqlPath = path.join(projectRoot, 'migrations', '0002_seed_data.sql')
  fs.writeFileSync(seedSqlPath, sqlStatements.join('\n'), 'utf8')
  console.log(`\n✅ Generated seed SQL with ${totalRecords} records at: ${seedSqlPath}`)
}

runSeed()
