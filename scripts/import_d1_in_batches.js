// scripts/import_d1_in_batches.js
// Executes seed data to Cloudflare D1 in byte-capped batches (max 100KB per file) to prevent SQLITE_TOOBIG

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const seedSqlPath = path.join(projectRoot, 'migrations', '0002_seed_data.sql')
const content = fs.readFileSync(seedSqlPath, 'utf8')

// Split by statement (semicolon at end of line)
const statements = content
  .split(/;\r?\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Total statements to execute: ${statements.length}`)

// Group into batches by byte size (max 80KB per batch or max 30 statements)
const batches = []
let currentBatch = []
let currentBytes = 0
const MAX_BYTES_PER_BATCH = 80 * 1024 // 80 KB
const MAX_STMTS_PER_BATCH = 30

for (const stmt of statements) {
  const stmtBytes = Buffer.byteLength(stmt, 'utf8')
  if (currentBatch.length > 0 && (currentBytes + stmtBytes > MAX_BYTES_PER_BATCH || currentBatch.length >= MAX_STMTS_PER_BATCH)) {
    batches.push(currentBatch)
    currentBatch = [stmt]
    currentBytes = stmtBytes
  } else {
    currentBatch.push(stmt)
    currentBytes += stmtBytes
  }
}
if (currentBatch.length > 0) {
  batches.push(currentBatch)
}

console.log(`Organized into ${batches.length} safe byte-limited batches.`)

const tempDir = path.join(projectRoot, '.d1_temp')
fs.mkdirSync(tempDir, { recursive: true })

let successCount = 0

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i]
  const batchNum = i + 1
  
  const batchSql = batch.map(s => s.endsWith(';') ? s : s + ';').join('\n')
  const tempFile = path.join(tempDir, `batch_${batchNum}.sql`)
  fs.writeFileSync(tempFile, batchSql, 'utf8')
  const fileSizeKB = (fs.statSync(tempFile).size / 1024).toFixed(1)

  process.stdout.write(`Executing batch ${batchNum}/${batches.length} (${batch.length} stmts, ${fileSizeKB} KB)... `)

  try {
    const cmd = `npx wrangler d1 execute textileops-db --remote --file="${tempFile}" -y`
    execSync(cmd, {
      cwd: projectRoot,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '392e2aeb2648effccebd585e5c29611b' },
      stdio: 'pipe'
    })
    console.log(`✅ OK`)
    successCount += batch.length
  } catch (err) {
    console.error(`\n❌ FAILED on batch ${batchNum}:`, err.stderr ? err.stderr.toString() : err.message)
    process.exit(1)
  }

  // Cleanup temp file
  try { fs.unlinkSync(tempFile) } catch {}
}

console.log(`\n🎉 Successfully imported all ${successCount} statements into Cloudflare D1!`)
try { fs.rmdirSync(tempDir) } catch {}
