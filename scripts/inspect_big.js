import fs from 'fs'
const content = fs.readFileSync('migrations/0002_seed_data.sql', 'utf8')
const statements = content.split(/;\r?\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
const big = statements.filter(s => s.length > 80000)

big.forEach((s, idx) => {
  const match = s.match(/INSERT OR REPLACE INTO "([^"]+)"/)
  console.log(idx, 'Table:', match ? match[1] : 'unknown', 'Length:', s.length)
  const prefix = s.slice(0, 300)
  console.log('  Prefix:', prefix)
})
